import "server-only";
import Stripe from "stripe";

import { publicEnv } from "@/lib/public-env";

/**
 * Stripe Server Client
 * --------------------
 * Lazy singleton — only initialized when first accessed. Gracefully returns
 * null if `STRIPE_SECRET_KEY` is not set, so the app works in preview mode.
 *
 * To enable payments:
 *   1. Create a Stripe account → https://stripe.com
 *   2. Get your secret key from the Stripe Dashboard
 *   3. Set STRIPE_SECRET_KEY env var
 *   4. Create products + prices for Pro ($19/mo) and Founder ($99 one-time)
 *   5. Set STRIPE_PRO_PRICE_ID and STRIPE_FOUNDER_PRICE_ID
 *   6. Configure webhook endpoint: https://your-app.com/api/webhooks/stripe
 *      with events: checkout.session.completed, customer.subscription.deleted
 *   7. Set STRIPE_WEBHOOK_SECRET
 */

let cachedClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (cachedClient) return cachedClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;

  cachedClient = new Stripe(secretKey, {
    typescript: true,
  });

  return cachedClient;
}

/** Price IDs for each tier — set these in your Stripe Dashboard + env vars. */
export const TIER_PRICES = {
  pro: () => process.env.STRIPE_PRO_PRICE_ID ?? "",
  founder: () => process.env.STRIPE_FOUNDER_PRICE_ID ?? "",
} as const;

/** Tier metadata stored on the Stripe Checkout Session for webhook lookup. */
export type CheckoutMetadata = {
  entryId: string;
  email: string;
  tier: "pro" | "founder";
};

/**
 * Create a Stripe Checkout Session for a tier upgrade.
 * Returns the URL to redirect the user to.
 *
 * Returns null if Stripe isn't configured — callers should fall back to the
 * demo `upgradeTierAction` (instant free upgrade).
 */
export async function createCheckoutSession(params: {
  entryId: string;
  email: string;
  tier: "pro" | "founder";
}): Promise<{ url: string } | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const priceId = TIER_PRICES[params.tier]();
  if (!priceId) return null;

  const appUrl = publicEnv.NEXT_PUBLIC_APP_URL;

  const session = await stripe.checkout.sessions.create({
    mode: params.tier === "pro" ? "subscription" : "payment",
    customer_email: params.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?upgrade=success&tier=${params.tier}`,
    cancel_url: `${appUrl}/dashboard?upgrade=cancelled`,
    metadata: {
      entryId: params.entryId,
      email: params.email,
      tier: params.tier,
    },
  });

  return { url: session.url ?? "" };
}

/**
 * Create a Stripe Customer Portal session (lets users manage their
 * subscription, update payment methods, cancel, etc.).
 */
export async function createPortalSession(params: {
  customerId: string;
}): Promise<{ url: string } | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  const appUrl = publicEnv.NEXT_PUBLIC_APP_URL;
  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: `${appUrl}/dashboard`,
  });

  return { url: session.url };
}

/**
 * Verify a Stripe webhook signature. Throws if invalid.
 * Used by the `/api/webhooks/stripe` Route Handler.
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
): Stripe.Event {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe not configured");

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not set");

  return stripe.webhooks.constructEvent(payload, signature, secret);
}
