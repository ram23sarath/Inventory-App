import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import type { AuthState, User } from "@/types";
import type { AuthError } from "@supabase/supabase-js";

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

  const mapUser = useCallback((authUser: any): User | null => {
    if (!authUser) return null;
    return {
      id: authUser.id,
      email: authUser.email,
      created_at: authUser.created_at,
      isAdmin: false, // Default to false, will be updated
    };
  }, []);

  useEffect(() => {
    let settled = false;

    // Safety timeout: if auth check hasn't resolved after 10s, stop loading
    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        console.error('[Auth] Session check timed out after 10s');
        setState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          error: 'Authentication timed out. Please refresh or check your connection.',
        });
      }
    }, 10_000);

    // Check current user securely
    supabase.auth.getUser()
      .then(async ({ data: { user: authUser }, error }: any) => {
        if (settled) return;

        if (error) {
          settled = true;
          clearTimeout(timeoutId);
          console.error('[Auth] getUser failed:', error);
          setState({
            isLoading: false,
            isAuthenticated: false,
            user: null,
            error: error.message || 'Failed to check authentication. Please refresh.',
          });
          return;
        }

        let user = mapUser(authUser);
        if (user) {
          const isAdmin = await checkIfAdmin(user.id);
          if (isAdmin) {
            user = { ...user, isAdmin: true };
          }
        }

        if (settled) return;

        settled = true;
        clearTimeout(timeoutId);
        console.log('[Auth] User check complete, authenticated:', !!authUser);
        setState({
          isLoading: false,
          isAuthenticated: !!authUser,
          user,
          error: null,
        });
      })
      .catch((err: any) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        console.error('[Auth] getUser promise rejected:', err);
        setState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          error: 'Failed to check authentication. Please refresh.',
        });
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      let user = mapUser(session?.user);
      if (user) {
        Promise.resolve().then(() => checkIfAdmin(user!.id).then(isAdmin => {
          if (isAdmin) {
            user = { ...user!, isAdmin: true };
          }
          console.log('[Auth] Auth state changed, authenticated:', true);
          setState({
            isLoading: false,
            isAuthenticated: true,
            user,
            error: null,
          });
        }));
      } else {
        console.log('[Auth] Auth state changed, authenticated:', false);
        setState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          error: null,
        });
      }
    });

    return () => {
      clearTimeout(timeoutId);
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
