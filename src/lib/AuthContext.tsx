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
      console.log("[Auth] Supabase not configured, skipping auth");
      setLoading(false);
      return;
    }

    // Check if this is an OAuth callback (URL contains access_token or code)
    const hash = window.location.hash;
    const search = window.location.search;
    const isOAuthCallback = hash.includes("access_token") || search.includes("code=");

    if (isOAuthCallback) {
      console.log("[Auth] OAuth callback detected, waiting for session...");
    } else {
      console.log("[Auth] Checking session...");
    }

    // Set up the auth state listener FIRST (before getSession)
    // This ensures we catch the SIGNED_IN event from OAuth callbacks
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      console.log("[Auth] Auth state changed:", event, s?.user?.email || "no user");
      setSession(s);
      setUser(s?.user ?? null);

      // If we were loading and got a session (or confirmed no session), stop loading
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        setLoading(false);
      }
    });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (s) {
        console.log("[Auth] Session found:", s.user?.email);
        setSession(s);
        setUser(s.user);
      } else {
        console.log("[Auth] No session found");
      }
      // Only set loading false if not an OAuth callback
      // (let onAuthStateChange handle it for callbacks)
      if (!isOAuthCallback) {
        setLoading(false);
      }
    });

    // Safety timeout: if OAuth callback doesn't resolve in 5s, stop loading
    let timeout: ReturnType<typeof setTimeout> | null = null;
    if (isOAuthCallback) {
      timeout = setTimeout(() => {
        console.log("[Auth] OAuth callback timeout, stopping loading");
        setLoading(false);
      }, 5000);
    }

    return () => {
      subscription.unsubscribe();
      if (timeout) clearTimeout(timeout);
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
        redirectTo: `${window.location.origin}/app`,
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
