import { createContext, useContext, useEffect, useState } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  enabled: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
  signUp: async () => ({ error: "Not initialized" }),
  signIn: async () => ({ error: "Not initialized" }),
  signInWithGoogle: async () => ({ error: "Not initialized" }),
  signOut: async () => {},
  enabled: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const enabled = !!supabase;

  useEffect(() => {
    if (!supabase) {
      console.log("[Auth] Supabase not configured");
      setLoading(false);
      return;
    }

    console.log("[Auth] Initializing...");

    // onAuthStateChange is the single source of truth.
    // With detectSessionInUrl: true, Supabase automatically:
    // - Parses #access_token (implicit flow)
    // - Exchanges ?code= (PKCE flow)
    // - Restores session from localStorage
    // Then fires INITIAL_SESSION with the result.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      console.log("[Auth]", event, s?.user?.email || "(no user)");

      setSession(s);
      setUser(s?.user ?? null);

      // INITIAL_SESSION is always the first event — it tells us the final
      // auth state after all automatic processing is done.
      if (event === "INITIAL_SESSION") {
        setLoading(false);
        // Clean OAuth params from URL if present
        if (window.location.hash.includes("access_token") || window.location.search.includes("code=")) {
          window.history.replaceState({}, "", window.location.pathname);
        }
      }

      if (event === "SIGNED_IN") {
        setLoading(false);
      }
    });

    // Fallback: if INITIAL_SESSION never fires (shouldn't happen, but safety net)
    const timeout = setTimeout(() => {
      console.log("[Auth] Timeout fallback — checking session directly");
      supabase!.auth.getSession().then(({ data: { session: s } }) => {
        setSession(s);
        setUser(s?.user ?? null);
        setLoading(false);
      });
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    if (!supabase) return { error: "Supabase not configured" };
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: "Supabase not configured" };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signInWithGoogle = async () => {
    if (!supabase) return { error: "Supabase not configured" };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut, enabled }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
