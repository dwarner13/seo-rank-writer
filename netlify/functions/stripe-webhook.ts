import type { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2025-04-30.basil" });
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function updateUserPlan(userId: string, plan: string, status: string, subscriptionId: string, customerId: string, periodEnd: string | null) {
  // Update profiles table
  await supabase
    .from("profiles")
    .update({
      plan,
      subscription_status: status,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      current_period_end: periodEnd,
    })
    .eq("id", userId);

  // Upsert subscriptions table
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .single();

  const subData = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    plan,
    status,
    current_period_end: periodEnd,
  };

  if (existing) {
    await supabase.from("subscriptions").update(subData).eq("id", existing.id);
  } else {
    await supabase.from("subscriptions").insert(subData);
  }
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const sig = event.headers["stripe-signature"] || "";
  let stripeEvent: Stripe.Event;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body || "", sig, endpointSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook verification failed";
    console.error("Webhook signature verification failed:", message);
    return { statusCode: 400, body: `Webhook Error: ${message}` };
  }

  console.log("[Stripe Webhook]", stripeEvent.type);

  switch (stripeEvent.type) {
    case "checkout.session.completed": {
      const session = stripeEvent.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (userId && session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        await updateUserPlan(
          userId,
          "pro",
          "active",
          sub.id,
          session.customer as string,
          sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null
        );
        console.log("[Stripe Webhook] User upgraded to Pro:", userId);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = stripeEvent.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id;
      if (userId) {
        const isActive = sub.status === "active" || sub.status === "trialing";
        await updateUserPlan(
          userId,
          isActive ? "pro" : "free",
          sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "canceled",
          sub.id,
          sub.customer as string,
          sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null
        );
        console.log("[Stripe Webhook] Subscription updated:", userId, sub.status);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = stripeEvent.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id;
      if (userId) {
        await updateUserPlan(userId, "free", "canceled", sub.id, sub.customer as string, null);
        console.log("[Stripe Webhook] Subscription canceled:", userId);
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = stripeEvent.data.object as Stripe.Invoice;
      const subId = invoice.subscription as string;
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        const userId = sub.metadata?.supabase_user_id;
        if (userId) {
          await updateUserPlan(userId, "pro", "past_due", sub.id, sub.customer as string, null);
          console.log("[Stripe Webhook] Payment failed:", userId);
        }
      }
      break;
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

export { handler };
