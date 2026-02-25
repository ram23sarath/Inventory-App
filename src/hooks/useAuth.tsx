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

/** Maximum ms to wait for any single auth operation before giving up. */
const AUTH_TIMEOUT_MS = 5000;
/** Global safety net: if isLoading is still true after this, force it false. */
const LOADING_SAFETY_TIMEOUT_MS = 8000;

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
 * Full PWA/SPA data purge.
 * Clears localStorage, sessionStorage, all Cache API caches, and unregisters
 * every service worker, then reloads the page for a completely fresh start.
 * Exposed for use on the login and loading screens so users can self-recover
 * from a stuck loading state without manually digging through DevTools.
 */
export async function purgeLocalData(): Promise<void> {
  try { localStorage.clear(); } catch { /* ignore */ }
  try { sessionStorage.clear(); } catch { /* ignore */ }

  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    } catch { /* ignore */ }
  }

  if ('caches' in window) {
    try {
      const names = await caches.keys();
      await Promise.all(names.map((name) => caches.delete(name)));
    } catch { /* ignore */ }
  }

  try { window.location.reload(); } catch { /* ignore in non-browser environments */ }
}
function isMissingAdminsRelation(error: unknown): boolean {
  const supabaseError = error as { code?: string; message?: string };
  return (
    supabaseError?.code === '42P01' ||
    !!supabaseError?.message?.includes('relation "public.admins" does not exist')
  );
}

async function checkIfAdmin(userId: string): Promise<boolean> {
  try {
    const { data: adminData, error: adminError } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    if (adminError && adminError.code !== 'PGRST116') {
      if (isMissingAdminsRelation(adminError)) {
        if (!hasLoggedMissingAdminsRelation) {
          console.warn('[Auth] Admin table public.admins not found. Continuing as non-admin.');
          hasLoggedMissingAdminsRelation = true;
        }
        return false;
      }
      // PGRST116 = "no rows found" — expected for non-admins
      console.warn('[Auth] Admin check error:', adminError);
    }

    return !!(adminData && !adminError);
  } catch (adminErr) {
    if (isMissingAdminsRelation(adminErr)) {
      if (!hasLoggedMissingAdminsRelation) {
        console.warn('[Auth] Admin table public.admins not found. Continuing as non-admin.');
        hasLoggedMissingAdminsRelation = true;
      }
      return false;
    }
    console.warn('[Auth] Admin check failed, defaulting to non-admin:', adminErr);
    return false;
  }
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
    // Safety net: force isLoading:false if something unexpectedly hangs.
    const safetyTimer = setTimeout(() => {
      setState((prev) => {
        if (!prev.isLoading) return prev;
        console.warn('[Auth] Safety timeout reached — forcing isLoading:false. Check network or admin table.');
        return { ...prev, isLoading: false };
      });
    }, LOADING_SAFETY_TIMEOUT_MS);

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
        initialSessionHandled.current = true;
      }

      const authUser = session?.user ?? null;
      let user = mapUser(authUser);

      if (user) {
        // Wrap admin check with a timeout so a slow/hanging DB query never blocks
        // the loading screen indefinitely.
        const isAdmin = await withTimeout(checkIfAdmin(user.id), AUTH_TIMEOUT_MS, false);
        if (isAdmin) {
          user = { ...user, isAdmin: true };
        }
        console.log('[Auth] Authenticated as', user.email, '| admin:', isAdmin);
        setState({
          isLoading: false,
          isAuthenticated: true,
          user,
          error: null,
        });
      } else {
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
