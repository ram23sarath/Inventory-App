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

  const mapUser = useCallback((authUser: Session["user"] | null): User | null => {
    if (!authUser) return null;
    return {
      id: authUser.id,
      email: authUser.email,
      created_at: authUser.created_at,
      isAdmin: false, // Default to false, will be updated
    };
  }, []);

  useEffect(() => {
    // getSession reads from localStorage — instant, no network round-trip.
    // onAuthStateChange handles token auto-refresh in the background.
    supabase.auth.getSession()
      .then(async ({ data: { session }, error }: { data: { session: Session | null }; error: AuthError | null }) => {
        if (error) {
          console.error('[Auth] getSession failed:', error);
          setState({
            isLoading: false,
            isAuthenticated: false,
            user: null,
            error: error.message || 'Failed to check authentication. Please refresh.',
          });
          return;
        }

        const authUser = session?.user ?? null;
        let user = mapUser(authUser);
        if (user) {
          const isAdmin = await checkIfAdmin(user.id);
          if (isAdmin) {
            user = { ...user, isAdmin: true };
          }
        }

        console.log('[Auth] Session check complete, authenticated:', !!authUser);
        setState({
          isLoading: false,
          isAuthenticated: !!authUser,
          user,
          error: null,
        });
      })
      .catch((err: Error) => {
        console.error('[Auth] getSession promise rejected:', err);
        setState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          error: 'Failed to check authentication. Please refresh.',
        });
      });

    // Listen for auth changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      // Skip events that don't affect user identity or need UI updates
      if (event === 'TOKEN_REFRESHED' || event === 'MFA_CHALLENGE_VERIFIED') {
        return;
      }

      let user = mapUser(session?.user ?? null);
      if (user) {
        try {
          const isAdmin = await checkIfAdmin(user.id);
          if (isAdmin) {
            user = { ...user, isAdmin: true };
          }
          console.log('[Auth] Auth state changed, authenticated:', true);
          setState({
            isLoading: false,
            isAuthenticated: true,
            user,
            error: null,
          });
        } catch (err) {
          console.error('[Auth] Admin check failed in state change:', err);
          // Still set authenticated, but default to non-admin
          setState({
            isLoading: false,
            isAuthenticated: true,
            user,
            error: null,
          });
        }
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
