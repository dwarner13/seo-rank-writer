import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthCallback({ onComplete }: { onComplete: () => void }) {
  const [error, setError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setError("Supabase not configured");
      return;
    }

    console.log("[AuthCallback] URL:", window.location.href);

    // With implicit flow, tokens arrive in the URL hash (#access_token=...)
    // detectSessionInUrl: true means Supabase will auto-parse them.
    // We just need to wait for the session to be available.

    let attempts = 0;
    const maxAttempts = 20; // 20 * 300ms = 6 seconds max

    const checkSession = async () => {
      const { data: { session } } = await supabase!.auth.getSession();

      if (session) {
        console.log("[AuthCallback] Session found:", session.user.email);
        // Clean URL and redirect
        window.location.replace("/app");
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkSession, 300);
      } else {
        console.error("[AuthCallback] No session after", maxAttempts, "attempts");
        setError("Sign-in timed out. Please try again.");
      }
    };

    // Small delay to let Supabase parse the hash
    setTimeout(checkSession, 200);
  }, []);

  void onComplete;

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "Inter, sans-serif", gap: 16, padding: 24 }}>
        <img src="/logo.png" alt="SEO Rank Writer" style={{ width: 48, height: 48, borderRadius: 12 }} />
        <div style={{ color: "#dc2626", fontWeight: 600, fontSize: "0.92rem", textAlign: "center", maxWidth: 400 }}>{error}</div>
        <a href="/login" style={{ color: "#6366f1", fontWeight: 600, fontSize: "0.88rem" }}>Back to login</a>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "Inter, sans-serif", color: "#64748b", gap: 12 }}>
      <img src="/logo.png" alt="SEO Rank Writer" style={{ width: 48, height: 48, borderRadius: 12 }} />
      <span>Completing sign in...</span>
    </div>
  );
}
