import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createCheckoutSession } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/queries/waitlist";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";

/**
 * POST /api/checkout
 * ------------------
 * Creates a Stripe Checkout Session for a tier upgrade.
 *
 * Body: { tier: "pro" | "founder" }
 * Returns: { url: string } — redirect the browser to this URL
 *
 * If Stripe isn't configured (no STRIPE_SECRET_KEY), returns 501 so the
 * client can fall back to the demo instant-upgrade action.
 */

const bodySchema = z.object({
  tier: z.enum(["pro", "founder"]),
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // 1. Require authentication
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Validate body
  let body: z.infer<typeof bodySchema>;
  try {
    const json = await request.json();
    body = bodySchema.parse(json);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // 3. Find the user's waitlist entry
  const [entry] = await db
    .select({ id: schema.waitlistEntries.id, email: schema.waitlistEntries.email })
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.email, user.email))
    .limit(1);

  if (!entry) {
    return NextResponse.json({ error: "Waitlist entry not found" }, { status: 404 });
  }

  // 4. Create the Stripe Checkout Session
  try {
    const result = await createCheckoutSession({
      entryId: entry.id,
      email: entry.email,
      tier: body.tier,
    });

    if (!result) {
      // Stripe not configured
      return NextResponse.json(
        { error: "Payments not configured", fallback: true },
        { status: 501 },
      );
    }

    return NextResponse.json({ url: result.url });
  } catch (err) {
    console.error("[/api/checkout] error", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
