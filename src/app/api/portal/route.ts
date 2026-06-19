import { NextResponse } from "next/server";

import { createPortalSession } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/queries/waitlist";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

/**
 * POST /api/portal
 * ----------------
 * Creates a Stripe Customer Portal session so users can manage their
 * subscription (update card, cancel, view invoices).
 *
 * Returns: { url: string } — redirect the browser to this URL
 */

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [entry] = await db
    .select({ stripeCustomerId: schema.waitlistEntries.stripeCustomerId })
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.email, user.email))
    .limit(1);

  if (!entry?.stripeCustomerId) {
    return NextResponse.json(
      { error: "No subscription found" },
      { status: 404 },
    );
  }

  try {
    const result = await createPortalSession({ customerId: entry.stripeCustomerId });
    if (!result) {
      return NextResponse.json({ error: "Portal not configured" }, { status: 501 });
    }
    return NextResponse.json({ url: result.url });
  } catch (err) {
    console.error("[/api/portal] error", err);
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
  }
}
