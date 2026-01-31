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
import type { AuthError, Session } from "@supabase/supabase-js";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    error: null,
  });

  const mapUser = useCallback((session: Session | null): User | null => {
    if (!session?.user) return null;
    return {
      id: session.user.id,
      email: session.user.email,
      created_at: session.user.created_at,
    };
  }, []);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setState({
        isLoading: false,
        isAuthenticated: !!session,
        user: mapUser(session),
        error: null,
      });
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setState({
        isLoading: false,
        isAuthenticated: !!session,
        user: mapUser(session),
        error: null,
      });
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
