import { supabase } from "./supabase";

async function getAuthToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export async function createCheckoutSession(): Promise<string | null> {
  const token = await getAuthToken();
  if (!token) throw new Error("You must be logged in to upgrade.");

  const res = await fetch("/.netlify/functions/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create checkout session.");
  return data.url;
}

export async function createPortalSession(): Promise<string | null> {
  const token = await getAuthToken();
  if (!token) throw new Error("You must be logged in.");

  const res = await fetch("/.netlify/functions/create-portal-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to open billing portal.");
  return data.url;
}
