import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string || "";

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // IMPORTANT: detectSessionInUrl is OFF.
        // We handle code exchange manually in /auth/callback.
        // This prevents the race condition where onAuthStateChange
        // tries to parse the code before the callback page mounts.
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    })
  : null;
