import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import type { AuthState, User } from "@/types";
import type { AuthError, AuthChangeEvent, Session } from "@supabase/supabase-js";

interface AuthContextValue extends AuthState {
  signIn: (
    email: string,
    password: string,
  ) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
let hasLoggedMissingAdminsRelation = false;
let hasLoggedAdminNetworkIssue = false;

const ADMIN_CACHE_PREFIX = 'inventory-admin:';

/** Maximum ms to wait for any single auth operation before giving up. */
const AUTH_TIMEOUT_MS = 8000;
/** Global safety net: if isLoading is still true after this, force it false. */
const LOADING_SAFETY_TIMEOUT_MS = 12000;

/** Races a promise against a timeout; resolves to `fallback` if time expires. */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/** Removes all Supabase auth entries from localStorage so a fresh login is possible. */
function clearAuthStorage(): void {
  try {
    const keysToRemove = Object.keys(localStorage).filter(
      (key) => key.startsWith('sb-') || key.toLowerCase().includes('supabase'),
    );
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // localStorage may be unavailable in some environments; safe to ignore.
  }
}

/**
 * Full PWA/SPA data purge for Android and desktop.
 * Clears localStorage, sessionStorage, IndexedDB, all Cache API caches,
 * unregisters every service worker, then force-reloads without cache.
 */
export async function purgeLocalData(): Promise<void> {
  // Clear standard storage
  try { localStorage.clear(); } catch { /* ignore */ }
  try { sessionStorage.clear(); } catch { /* ignore */ }

  // Clear IndexedDB (where Supabase realtime state is stored)
  try {
    const dbs = await indexedDB.databases?.() ?? [];
    for (const db of dbs) {
      if (db.name) {
        const request = indexedDB.deleteDatabase(db.name);
        await new Promise<void>((resolve, reject) => {
          request.onsuccess = () => resolve();
          request.onerror = reject;
        });
      }
    }
  } catch (err) {
    console.warn('[Purge] IndexedDB clearing failed:', err);
  }

  // Unregister service workers
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    } catch { /* ignore */ }
  }

  // Delete all Cache API caches
  if ('caches' in window) {
    try {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    } catch { /* ignore */ }
  }

  // Force reload without cache: bypass service worker and HTTP cache
  try {
    // Add cache-busting parameter and disable beforeunload handlers
    window.location.href = window.location.href + '?nocache=' + Date.now();
    // Fallback for when href doesn't work
    setTimeout(() => { window.location.reload(); }, 100);
  } catch { /* ignore */ }
}
function isMissingAdminsRelation(error: unknown): boolean {
  const supabaseError = error as { code?: string; message?: string };
  return (
    supabaseError?.code === '42P01' ||
    !!supabaseError?.message?.includes('relation "public.admins" does not exist')
  );
}

function isTransientAdminFetchError(error: unknown): boolean {
  const maybeError = error as { message?: string; details?: string; code?: string; status?: number };
  const message = `${maybeError?.message ?? ''} ${maybeError?.details ?? ''}`.toLowerCase();
  return (
    message.includes('failed to fetch') ||
    message.includes('err_failed') ||
    message.includes('cors') ||
    maybeError?.status === 525
  );
}

function getCachedAdminStatus(userId: string): boolean | null {
  try {
    const raw = localStorage.getItem(`${ADMIN_CACHE_PREFIX}${userId}`);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  } catch {
    // localStorage may be unavailable; ignore.
  }
  return null;
}

function setCachedAdminStatus(userId: string, isAdmin: boolean): void {
  try {
    localStorage.setItem(`${ADMIN_CACHE_PREFIX}${userId}`, String(isAdmin));
  } catch {
    // localStorage may be unavailable; ignore.
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Track different loading phases for diagnostics */
export let currentLoadingPhase = 'sessionLoad';
export function setLoadingPhase(phase: string): void {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[LoadingPhase] ${timestamp} - ${phase}`);
  currentLoadingPhase = phase;
}

async function checkIfAdmin(userId: string): Promise<boolean | null> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      // PGRST116 = "no rows found" — expected for non-admins
      if (adminError?.code === 'PGRST116') {
        setCachedAdminStatus(userId, false);
        return false;
      }

      if (adminError) {
        if (isMissingAdminsRelation(adminError)) {
          if (!hasLoggedMissingAdminsRelation) {
            console.warn('[Auth] Admin table public.admins not found. Continuing as non-admin.');
            hasLoggedMissingAdminsRelation = true;
          }
          setCachedAdminStatus(userId, false);
          return false;
        }

        if (isTransientAdminFetchError(adminError) && attempt < 2) {
          await delay(350);
          continue;
        }

        throw adminError;
      }

      const isAdmin = !!adminData;
      setCachedAdminStatus(userId, isAdmin);
      return isAdmin;
    } catch (adminErr) {
      if (isMissingAdminsRelation(adminErr)) {
        if (!hasLoggedMissingAdminsRelation) {
          console.warn('[Auth] Admin table public.admins not found. Continuing as non-admin.');
          hasLoggedMissingAdminsRelation = true;
        }
        setCachedAdminStatus(userId, false);
        return false;
      }

      if (isTransientAdminFetchError(adminErr)) {
        if (attempt < 2) {
          await delay(350);
          continue;
        }

        const cachedAdmin = getCachedAdminStatus(userId);
        if (!hasLoggedAdminNetworkIssue) {
          console.warn('[Auth] Admin check temporarily unreachable. Using cached role if available.');
          hasLoggedAdminNetworkIssue = true;
        }
        // If cache says true, trust it. If cache is false/missing, treat as unknown
        // to avoid downgrading an admin due to transient network issues.
        return cachedAdmin === true ? true : null;
      }

      console.warn('[Auth] Admin check failed, defaulting to non-admin:', adminErr);
      return false;
    }
  }

  const cachedAdmin = getCachedAdminStatus(userId);
  return cachedAdmin === true ? true : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    error: null,
  });

  // Prevent the INITIAL_SESSION handler from running again after a subsequent
  // SIGNED_IN / SIGNED_OUT overwrites the state first.
  const initialSessionHandled = useRef(false);
  const lastKnownAdminByUserRef = useRef<Map<string, boolean>>(new Map());

  const mapUser = useCallback((authUser: Session["user"] | null): User | null => {
    if (!authUser) return null;
    return {
      id: authUser.id,
      email: authUser.email,
      created_at: authUser.created_at,
      isAdmin: false,
    };
  }, []);

  useEffect(() => {
    // Wall-clock start time — used by the visibilitychange handler below.
    // Unlike setTimeout, Date.now() is not paused when Android suspends the tab.
    const loadingStartedAt = Date.now();
    setLoadingPhase('sessionLoad');

    // Safety net: force isLoading:false if something unexpectedly hangs.
    const safetyTimer = setTimeout(() => {
      setState((prev) => {
        if (!prev.isLoading) return prev;
        console.warn('[Auth] Safety timeout reached — forcing isLoading:false. Check network or admin table.');
        setLoadingPhase('safetyTimeout');
        return { ...prev, isLoading: false };
      });
    }, LOADING_SAFETY_TIMEOUT_MS);

    // Android app-suspension recovery: when Android freezes the app (low memory
    // or screen off), JS timers are paused so safetyTimer may never fire. When
    // the user returns to the app, visibilitychange fires and we use the
    // wall-clock elapsed time (which was NOT paused) to decide whether to force
    // isLoading:false and let the user proceed to the login screen.
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      setState((prev) => {
        if (!prev.isLoading) return prev;
        const elapsed = Date.now() - loadingStartedAt;
        if (elapsed >= LOADING_SAFETY_TIMEOUT_MS) {
          console.warn(`[Auth] App resumed after ${elapsed}ms suspension while loading — forcing isLoading:false.`);
          return { ...prev, isLoading: false };
        }
        return prev;
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Single source of truth: onAuthStateChange fires INITIAL_SESSION immediately
    // on subscription (Supabase JS v2), so we no longer need a separate getSession()
    // call. This eliminates the race condition where both paths called checkIfAdmin()
    // concurrently and either could hang indefinitely.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      // TOKEN_REFRESHED — Supabase silently rotated the token; no UI change needed.
      // MFA_CHALLENGE_VERIFIED — internal MFA step; session will follow separately.
      if (event === 'TOKEN_REFRESHED' || event === 'MFA_CHALLENGE_VERIFIED') {
        return;
      }

      // SIGNED_OUT or session expired: wipe stale auth data so the user can log
      // in cleanly without leftover corrupt/expired tokens.
      if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
        if (event === 'SIGNED_OUT') {
          clearAuthStorage();
        }
        // React StrictMode guard: INITIAL_SESSION fires twice in dev (mount →
        // unmount → remount). The ref survives the cycle, so if it's already
        // true we know this is the duplicate and can safely skip it.
        if (event === 'INITIAL_SESSION' && initialSessionHandled.current) return;
        initialSessionHandled.current = true;
        console.log('[Auth] No active session — showing login.');
        setState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          error: null,
        });
        return;
      }

      // INITIAL_SESSION with a valid session: resolve loading immediately while
      // the admin check runs in the background to avoid an extra flicker.
      if (event === 'INITIAL_SESSION') {
        // StrictMode guard: skip the duplicate INITIAL_SESSION from the second mount.
        if (initialSessionHandled.current) return;
        initialSessionHandled.current = true;
      }

      const authUser = session?.user ?? null;
      let user = mapUser(authUser);

      if (user) {
        setLoadingPhase('adminCheck');
        // Wrap admin check with a timeout so a slow/hanging DB query never blocks
        // the loading screen indefinitely.
        const adminCheckResult = await withTimeout<boolean | null>(
          checkIfAdmin(user.id),
          AUTH_TIMEOUT_MS,
          null,
        );

        const previouslyKnownAdmin = lastKnownAdminByUserRef.current.get(user.id);
        const cachedAdmin = getCachedAdminStatus(user.id);
        const isAdmin =
          adminCheckResult ??
          previouslyKnownAdmin ??
          (cachedAdmin === true);

        lastKnownAdminByUserRef.current.set(user.id, isAdmin);

        if (isAdmin) {
          user = { ...user, isAdmin: true };
        }
        setLoadingPhase('authComplete');
        console.log('[Auth] Authenticated as', user.email, '| admin:', isAdmin);
        setState({
          isLoading: false,
          isAuthenticated: true,
          user,
          error: null,
        });
      } else {
        setLoadingPhase('noSession');
        console.log('[Auth] Auth state changed — not authenticated.');
        setState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          error: null,
        });
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      subscription.unsubscribe();
    };
  }, [mapUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setState((prev) => ({
      ...prev,
      isLoading: false,
      error: error ? error.message : null,
    }));

    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setState((prev) => ({
      ...prev,
      isLoading: false,
      error: error ? error.message : null,
    }));

    return { error };
  }, []);

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    await supabase.auth.signOut();
    clearAuthStorage();
    setState({
      isLoading: false,
      isAuthenticated: false,
      user: null,
      error: null,
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
