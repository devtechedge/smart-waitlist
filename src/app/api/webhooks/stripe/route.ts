import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { verifyWebhookSignature, getStripe } from "@/lib/stripe";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";


/**
 * POST /api/webhooks/stripe
 * -------------------------
 * Handles Stripe webhook events. The body is the raw request (not JSON-parsed)
 * because Stripe signature verification needs the exact bytes.
 *
 * Events handled:
 *   - checkout.session.completed  → upgrade user's tier
 *   - customer.subscription.deleted → downgrade to free
 *
 * SECURITY: The webhook signature is verified using STRIPE_WEBHOOK_SECRET.
 * Without this, anyone could POST fake events and get free upgrades.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });
  }

  // Get the raw body as text — Stripe needs the exact bytes.
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Verify the webhook signature.
  let event: Stripe.Event;
  try {
    event = verifyWebhookSignature(payload, signature);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle the event.
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }
      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        // Unhandled event type — log but don't error.
        console.log(`[stripe webhook] unhandled event: ${event.type}`);
    }
  } catch (err) {
    console.error("[stripe webhook] handler error", err);
    // Return 200 anyway so Stripe doesn't retry endlessly — we've logged the error.
    // In production you'd want to queue failed events for retry.
  }

  return NextResponse.json({ received: true });
}

// ============================================================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const metadata = session.metadata as
    | { entryId: string; email: string; tier: "pro" | "founder" }
    | undefined;

  if (!metadata?.entryId || !metadata?.tier) {
    console.error("[stripe webhook] missing metadata on session", session.id);
    return;
  }

  // Find the entry
  const [entry] = await db
    .select({
      id: schema.waitlistEntries.id,
      email: schema.waitlistEntries.email,
      tier: schema.waitlistEntries.tier,
      referredByEntryId: schema.waitlistEntries.referredByEntryId,
    })
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.id, metadata.entryId))
    .limit(1);

  if (!entry) {
    console.error("[stripe webhook] entry not found", metadata.entryId);
    return;
  }

  // Upgrade the tier + store Stripe IDs
  await db
    .update(schema.waitlistEntries)
    .set({
      tier: metadata.tier,
      stripeCustomerId: session.customer as string ?? null,
      stripeSubscriptionId: session.subscription as string ?? null,
      updatedAt: new Date(),
    })
    .where(eq(schema.waitlistEntries.id, entry.id));

  // Write to audit log
  await db.insert(schema.adminAuditLog).values({
    adminEmail: "stripe@webhook",
    action: "stripe_checkout_completed",
    targetEntryId: entry.id,
    targetEmail: entry.email,
    oldValue: entry.tier,
    newValue: metadata.tier,
    note: `Payment ${session.id} — ${metadata.tier} tier`,
  });

  console.log(`[stripe webhook] upgraded ${entry.email} to ${metadata.tier}`);
}

// ============================================================================

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  // Find the entry by subscription ID
  const [entry] = await db
    .select({
      id: schema.waitlistEntries.id,
      email: schema.waitlistEntries.email,
      tier: schema.waitlistEntries.tier,
    })
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.stripeSubscriptionId, subscription.id))
    .limit(1);

  if (!entry) {
    console.log("[stripe webhook] no entry for subscription", subscription.id);
    return;
  }

  // Downgrade to free
  await db
    .update(schema.waitlistEntries)
    .set({
      tier: "free",
      stripeSubscriptionId: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.waitlistEntries.id, entry.id));

  await db.insert(schema.adminAuditLog).values({
    adminEmail: "stripe@webhook",
    action: "stripe_subscription_deleted",
    targetEntryId: entry.id,
    targetEmail: entry.email,
    oldValue: entry.tier,
    newValue: "free",
    note: `Subscription ${subscription.id} cancelled`,
  });

  console.log(`[stripe webhook] downgraded ${entry.email} to free`);
}
