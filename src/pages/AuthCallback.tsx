import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthCallback({ onComplete }: { onComplete: () => void }) {
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Starting sign in...");

  useEffect(() => {
    if (!supabase) {
      setError("Supabase not configured");
      return;
    }

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const hashParams = new URLSearchParams(url.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const errorParam = url.searchParams.get("error") || hashParams.get("error");
    const errorDesc = url.searchParams.get("error_description") || hashParams.get("error_description");

    console.log("[AuthCallback] Starting callback");
    console.log("[AuthCallback] code:", code ? "present" : "none");
    console.log("[AuthCallback] access_token:", accessToken ? "present" : "none");
    console.log("[AuthCallback] error:", errorParam || "none");

    if (errorParam) {
      setError(errorDesc || errorParam || "OAuth error");
      return;
    }

    async function handleCallback() {
      try {
        if (code) {
          // PKCE flow: exchange authorization code for session
          console.log("[AuthCallback] Code found, exchanging for session...");
          setStatus("Exchanging authorization code...");

          const { data, error: exchangeError } = await supabase!.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error("[AuthCallback] Code exchange error:", exchangeError.message);
            setError("Code exchange failed: " + exchangeError.message);
            return;
          }

          if (data?.session) {
            console.log("[AuthCallback] Session obtained:", data.session.user.email);
            setStatus("Signed in! Redirecting...");
            // Use replace so back button doesn't return to callback
            window.location.replace("/app");
            return;
          }
        }

        if (accessToken) {
          // Implicit/hash flow: set session from tokens
          console.log("[AuthCallback] Hash token callback detected");
          setStatus("Processing tokens...");

          const refreshToken = hashParams.get("refresh_token") || "";
          const { data, error: sessionError } = await supabase!.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error("[AuthCallback] Set session error:", sessionError.message);
            setError("Session error: " + sessionError.message);
            return;
          }

          if (data?.session) {
            console.log("[AuthCallback] Session set:", data.session.user.email);
            setStatus("Signed in! Redirecting...");
            window.location.replace("/app");
            return;
          }
        }

        // Fallback: check if session already exists (maybe auto-parsed)
        console.log("[AuthCallback] No code or token, checking existing session...");
        setStatus("Checking session...");

        const { data: { session } } = await supabase!.auth.getSession();
        if (session) {
          console.log("[AuthCallback] Existing session found:", session.user.email);
          window.location.replace("/app");
          return;
        }

        // Nothing worked
        console.error("[AuthCallback] No session found after all attempts");
        setError("No authentication data received. Please try signing in again.");

      } catch (err) {
        console.error("[AuthCallback] Unexpected error:", err);
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    }

    handleCallback();
  }, []);

  void onComplete;

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "Inter, sans-serif", gap: 16, padding: 24 }}>
        <img src="/logo.png" alt="SEO Rank Writer" style={{ width: 48, height: 48, borderRadius: 12 }} />
        <div style={{ color: "#dc2626", fontWeight: 600, fontSize: "0.92rem", textAlign: "center", maxWidth: 420, lineHeight: 1.5 }}>{error}</div>
        <a href="/login" style={{ color: "#6366f1", fontWeight: 600, fontSize: "0.88rem" }}>Back to login</a>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "Inter, sans-serif", color: "#64748b", gap: 12 }}>
      <img src="/logo.png" alt="SEO Rank Writer" style={{ width: 48, height: 48, borderRadius: 12 }} />
      <span>{status}</span>
    </div>
  );
}
