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

    // 1. Restore session from localStorage
    console.log("[Auth] Checking stored session...");
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      console.log("[Auth] getSession:", s?.user?.email || "no session");
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    // 2. Listen for future auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      console.log("[Auth] onAuthStateChange:", event, s?.user?.email || "(no user)");
      setSession(s);
      setUser(s?.user ?? null);
      // If someone signs in after initial load (e.g. email/password login)
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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
