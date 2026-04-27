import { createContext, useContext, useEffect, useState, useRef } from "react";
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
  const resolved = useRef(false);

  useEffect(() => {
    if (!supabase) {
      console.log("[Auth] Supabase not configured");
      setLoading(false);
      return;
    }

    const done = (s: Session | null, source: string) => {
      if (resolved.current) return;
      resolved.current = true;
      console.log("[Auth] Resolved from", source, s?.user?.email || "no session");
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    };

    // Listen for all auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      console.log("[Auth] onAuthStateChange:", event);
      if (event === "SIGNED_IN" && s) {
        done(s, "onAuthStateChange SIGNED_IN");
      } else if (event === "SIGNED_OUT") {
        setSession(null);
        setUser(null);
      } else if (event === "TOKEN_REFRESHED" && s) {
        setSession(s);
        setUser(s.user);
      }
      // We intentionally do NOT call done() on INITIAL_SESSION
      // because it may fire with null before OAuth hash is parsed
    });

    // Check for OAuth callback params
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    const hasHash = hash.includes("access_token") || hash.includes("error");
    const hasCode = params.has("code");

    if (hasCode) {
      // PKCE flow: exchange code for session
      console.log("[Auth] PKCE code detected, exchanging...");
      supabase.auth.exchangeCodeForSession(params.get("code")!).then(({ data, error }) => {
        if (error) {
          console.error("[Auth] Code exchange failed:", error.message);
          done(null, "code exchange error");
        } else if (data.session) {
          // Clean the URL
          window.history.replaceState({}, "", window.location.pathname);
          done(data.session, "code exchange");
        }
      });
    } else if (hasHash) {
      // Implicit flow: Supabase parses hash automatically
      console.log("[Auth] OAuth hash detected, waiting for Supabase to parse...");
      // onAuthStateChange will fire SIGNED_IN — we wait for it
    } else {
      // Normal page load — check stored session
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        if (s) {
          done(s, "getSession");
        } else {
          done(null, "getSession (no session)");
        }
      });
    }

    // Safety timeout — never stay loading forever
    const timeout = setTimeout(() => {
      if (!resolved.current) {
        console.log("[Auth] Timeout — forcing loading=false");
        resolved.current = true;
        setLoading(false);
      }
    }, 8000);

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
