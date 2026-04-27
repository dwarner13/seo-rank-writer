import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthCallback({ onComplete }: { onComplete: () => void }) {
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setError("Supabase not configured");
      return;
    }

    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    console.log("[AuthCallback] Processing...", { hasCode: !!code, hasHash: hash.length > 1 });

    async function handleCallback() {
      try {
        if (code) {
          // PKCE flow — exchange code for session
          console.log("[AuthCallback] Exchanging PKCE code...");
          const { data, error: exchangeError } = await supabase!.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error("[AuthCallback] Code exchange failed:", exchangeError.message);
            setError(exchangeError.message);
            return;
          }
          if (data.session) {
            console.log("[AuthCallback] Session obtained:", data.session.user.email);
          }
        } else if (hash.includes("access_token")) {
          // Implicit flow — Supabase auto-parses with detectSessionInUrl
          console.log("[AuthCallback] Implicit flow, waiting for auto-parse...");
          // Give Supabase a moment to parse the hash
          await new Promise(r => setTimeout(r, 500));
        }

        // Verify we actually have a session now
        const { data: { session } } = await supabase!.auth.getSession();
        if (session) {
          console.log("[AuthCallback] Success! Redirecting to /app");
          window.location.href = "/app";
        } else {
          console.error("[AuthCallback] No session after callback");
          setError("Sign-in completed but no session was created. Please try again.");
        }
      } catch (err) {
        console.error("[AuthCallback] Error:", err);
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    }

    handleCallback();
  }, []);

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "Inter, sans-serif", gap: 16, padding: 24 }}>
        <img src="/logo.png" alt="SEO Rank Writer" style={{ width: 48, height: 48, borderRadius: 12 }} />
        <div style={{ color: "#dc2626", fontWeight: 600, fontSize: "0.92rem", textAlign: "center", maxWidth: 400 }}>{error}</div>
        <a href="/login" style={{ color: "#6366f1", fontWeight: 600, fontSize: "0.88rem" }}>Back to login</a>
      </div>
    );
  }

  void onComplete; // used by router if needed

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "Inter, sans-serif", color: "#64748b", gap: 12 }}>
      <img src="/logo.png" alt="SEO Rank Writer" style={{ width: 48, height: 48, borderRadius: 12 }} />
      <span>Completing sign in...</span>
    </div>
  );
}
