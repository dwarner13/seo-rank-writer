import type { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2025-04-30.basil" });
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);
const SITE_URL = process.env.SITE_URL || process.env.URL || "http://localhost:5173";

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const authHeader = event.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: "Missing auth token" }) };
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: "Invalid auth token" }) };
  }

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return { statusCode: 400, body: JSON.stringify({ error: "No billing account found. Subscribe to a plan first." }) };
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${SITE_URL}/app`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Portal session failed";
    console.error("Stripe portal error:", message);
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};

export { handler };
