"use server";

import { z } from "zod";
import { eq, sql } from "drizzle-orm";

import { db, schema, type WaitlistEntry } from "@/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicAppOrigin } from "@/lib/public-env";
import { getCurrentUser, computePosition } from "@/lib/queries/waitlist";

/**
 * Waitlist Server Actions
 * -----------------------
 * Two mutations:
 *   - `claimOrCreateWaitlistEntryAction`
 *       Called from `/dashboard` on first visit. Idempotent. Links the
 *       current authenticated user to an existing email-matched entry, or
 *       creates a new entry with the user linked.
 *
 *   - `trackReferralVisitAction`
 *       Called from the landing page when `?ref=CODE` is present. Bumps the
 *       referrer's `visits` counter for analytics (does NOT affect position).
 *
 * Referral-count increment (the actual "moves referrer up the waitlist"
 * side-effect) happens inside `claimOrCreateWaitlistEntryAction` when the
 * current user's entry is being created and they arrived with a `refCode`.
 */

export type WaitlistActionState = {
  ok: boolean;
  error?: string;
  field?: "refCode" | "form";
};

/** Shape returned by `claimOrCreateWaitlistEntryAction` on success. */
export type ClaimedWaitlist = {
  ok: true;
  entry: WaitlistEntry;
  position: number;
  referralLink: string;
  isNewlyCreated: boolean;
  referrerRewarded: boolean;
};

/** Shape returned by `claimOrCreateWaitlistEntryAction` on failure. */
export type ClaimFailed = {
  ok: false;
  error: string;
};

const refCodeSchema = z
  .string()
  .min(1, "Referral code is required")
  .max(32, "Referral code is too long")
  .regex(/^[a-z0-9]+$/i, "Referral code must be alphanumeric")
  .transform((s) => s.trim().toLowerCase());

/**
 * Generate a fresh 6-char base36 referral code using `crypto.getRandomValues`.
 *
 * 36^6 = 2,176,782,336 ≈ 2.2B possible codes. For a waitlist of N users,
 * the birthday-paradox collision probability per generation is roughly
 * N / 2.2B. We retry on unique-constraint violation to be safe.
 */
function generateReferralCode(): string {
  const MAX_CODE = 2_176_782_336; // 36^6
  // `crypto.getRandomValues` is available in Node 19+ (server) and all
  // modern browsers. Uint32Array gives us values in [0, 2^32-1].
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  const num = (buffer[0] ?? 0) % MAX_CODE;
  return num.toString(36).padStart(6, "0");
}

/**
 * Resolve a referral code to the referrer's entry, returning the entry ID.
 * Returns `null` if the code doesn't exist (we silently drop the attribution
 * rather than failing the signup — a bad ref code shouldn't block onboarding).
 */
async function resolveReferrer(
  refCode: string,
): Promise<{ referrerEntryId: string; referrerUserId: string | null } | null> {
  const parsed = refCodeSchema.safeParse(refCode);
  if (!parsed.success) return null;

  const [referrer] = await db
    .select({
      id: schema.waitlistEntries.id,
      userId: schema.waitlistEntries.userId,
    })
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.referralCode, parsed.data))
    .limit(1);

  if (!referrer) return null;
  return { referrerEntryId: referrer.id, referrerUserId: referrer.userId };
}

/**
 * Core action: ensure the current user has a waitlist entry.
 *
 * Behavior:
 *   1. Require an authenticated user.
 *   2. Look up an existing entry by email.
 *   3. If found:
 *        - If `user_id` is null → claim it (set `user_id`, optionally `full_name`).
 *        - If `user_id` matches → no-op (already claimed).
 *        - If `user_id` differs → log + return error (shouldn't happen with
 *          unique email constraint, but we guard against it).
 *   4. If not found:
 *        - Read `ref_code` from Supabase user_metadata (set at signup).
 *        - Resolve referrer (if any) — silently skip if invalid.
 *        - Insert new entry inside a transaction; atomically increment the
 *          referrer's `referral_count`.
 *
 * Always idempotent: calling it multiple times for the same user is safe.
 */
export async function claimOrCreateWaitlistEntryAction(): Promise<
  ClaimedWaitlist | ClaimFailed
> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "You must be signed in to claim your waitlist spot." };
  }

  // Read referral attribution from Supabase user_metadata (set at signup).
  const rawRefCode =
    (await getUserMetadataField("ref_code")) ?? null;
  const refCode = typeof rawRefCode === "string" && rawRefCode.length > 0
    ? rawRefCode
    : null;

  const [existing] = await db
    .select()
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.email, user.email))
    .limit(1);

  if (existing) {
    // ─── Existing entry: claim if user_id is missing ─────────────────────
    if (existing.userId && existing.userId !== user.id) {
      // Shouldn't happen (unique email), but guard anyway.
      console.error(
        "[claimOrCreateWaitlistEntryAction] email/userId mismatch",
        { entryId: existing.id, entryUserId: existing.userId, authUserId: user.id },
      );
      return {
        ok: false,
        error: "This email is associated with a different account.",
      };
    }

    if (!existing.userId) {
      // Claim: stamp the user_id + full_name on the existing anonymous entry.
      await db
        .update(schema.waitlistEntries)
        .set({
          userId: user.id,
          fullName: existing.fullName ?? user.fullName,
          updatedAt: new Date(),
        })
        .where(eq(schema.waitlistEntries.id, existing.id));

      const updated: WaitlistEntry = {
        ...existing,
        userId: user.id,
        fullName: existing.fullName ?? user.fullName,
      };
      return finalize(updated, false, false);
    }

    // Already fully claimed — no-op.
    return finalize(existing, false, false);
  }

  // ─── No existing entry: create one (with referral attribution) ────────
  const referrer = refCode ? await resolveReferrer(refCode) : null;

  // Self-referral guard: if the resolved referrer's userId == current user,
  // drop the attribution (a user can't refer themselves).
  const safeReferrer =
    referrer && referrer.referrerUserId !== user.id ? referrer : null;

  // Generate a unique referral code (retry on collision).
  const newReferralCode = await generateUniqueReferralCode();

  const newEntry: typeof schema.waitlistEntries.$inferInsert = {
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    referralCode: newReferralCode,
    referredByEntryId: safeReferrer?.referrerEntryId ?? null,
    referralCount: 0,
    visits: 0,
    status: "pending",
  };

  // Transaction: insert entry + increment referrer's count atomically.
  let referrerRewarded = false;
  try {
    await db.transaction(async (tx) => {
      await tx.insert(schema.waitlistEntries).values(newEntry);

      if (safeReferrer) {
        await tx
          .update(schema.waitlistEntries)
          .set({
            referralCount: sql`${schema.waitlistEntries.referralCount} + 1`,
            updatedAt: new Date(),
          })
          .where(eq(schema.waitlistEntries.id, safeReferrer.referrerEntryId));
        referrerRewarded = true;
      }
    });
  } catch (err) {
    console.error("[claimOrCreateWaitlistEntryAction] insert failed", err);
    return {
      ok: false,
      error: "We couldn't add you to the waitlist. Please try again.",
    };
  }

  // Re-fetch the inserted row so we have the canonical `id`, `createdAt`, etc.
  const [inserted] = await db
    .select()
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.email, user.email))
    .limit(1);

  if (!inserted) {
    return {
      ok: false,
      error: "Failed to read back your waitlist entry.",
    };
  }

  return finalize(inserted, true, referrerRewarded);
}

/** Helper: build the public response shape with computed position + link. */
async function finalize(
  entry: WaitlistEntry,
  isNewlyCreated: boolean,
  referrerRewarded: boolean,
): Promise<ClaimedWaitlist> {
  const position = await computePosition(entry);
  return {
    ok: true,
    entry,
    position,
    referralLink: `${publicAppOrigin()}/?ref=${entry.referralCode}`,
    isNewlyCreated,
    referrerRewarded,
  };
}

/**
 * Read a single field from the current user's Supabase user_metadata.
 * Returns `undefined` if the user is not signed in or the field is missing.
 */
async function getUserMetadataField(field: string): Promise<unknown> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.user_metadata?.[field];
}

/**
 * Generate a referral code that isn't already in the DB.
 * Retries up to 5 times to handle the (very rare) collision case.
 */
async function generateUniqueReferralCode(): Promise<string> {
  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateReferralCode();

    const [conflict] = await db
      .select({ id: schema.waitlistEntries.id })
      .from(schema.waitlistEntries)
      .where(eq(schema.waitlistEntries.referralCode, code))
      .limit(1);

    if (!conflict) return code;
  }

  // Vanishingly unlikely — 5 random 6-char base36 codes all collide.
  throw new Error("Failed to generate a unique referral code after 5 attempts.");
}

/**
 * Track a referral-link visit. Called from the landing page Server Component
 * when `?ref=CODE` is present. Increments the referrer's `visits` counter.
 *
 * This is for analytics only — it does NOT affect position. Position is
 * determined solely by `referral_count` (incremented when a referred user
 * actually signs up).
 *
 * @returns `{ ok: true }` on success, `{ ok: false, error }` on validation
 * failure. Unknown referral codes are silently ignored (return `ok: true`)
 * so a malformed `?ref=` doesn't break the landing page render.
 */
export async function trackReferralVisitAction(
  refCode: string,
): Promise<WaitlistActionState> {
  const parsed = refCodeSchema.safeParse(refCode);
  if (!parsed.success) {
    // Don't error — just don't count the visit. Landing page should still render.
    return { ok: true };
  }

  try {
    const result = await db
      .update(schema.waitlistEntries)
      .set({
        visits: sql`${schema.waitlistEntries.visits} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(schema.waitlistEntries.referralCode, parsed.data))
      .returning({ id: schema.waitlistEntries.id });

    if (result.length === 0) {
      // Unknown code — silently no-op.
      return { ok: true };
    }

    return { ok: true };
  } catch (err) {
    console.error("[trackReferralVisitAction] failed", err);
    // Don't block the page render on analytics failure.
    return { ok: true };
  }
}

/**
 * Convenience action for the dashboard: returns the current user's claimed
 * waitlist entry + position + referral link, OR triggers a claim/create if
 * they don't have one yet. This is the one-call entry point the dashboard
 * Server Component uses.
 *
 * The return type is the same as `claimOrCreateWaitlistEntryAction` — kept
 * as a separate export so the dashboard code reads clearly and so we can
 * later add caching/revalidation hints without touching the claim action.
 */
export async function getOrClaimMyWaitlistEntryAction(): Promise<
  ClaimedWaitlist | ClaimFailed
> {
  return claimOrCreateWaitlistEntryAction();
}

// ============================================================================
// Custom referral code
// ============================================================================

const customRefCodeSchema = z
  .string()
  .min(3, "Code must be at least 3 characters")
  .max(20, "Code must be at most 20 characters")
  .regex(/^[a-z0-9-]+$/i, "Code can only contain letters, numbers, and hyphens")
  .transform((s) => s.trim().toLowerCase());

const RESERVED_CODES = new Set([
  "admin", "api", "auth", "dashboard", "login", "signin", "signup",
  "about", "help", "support", "settings", "account", "profile",
  "waitlist", "referral", "refer", "invite", "system", "test",
]);

export type UpdateReferralCodeState = {
  ok: boolean;
  error?: string;
  newCode?: string;
};

export async function updateReferralCodeAction(
  input: string,
): Promise<UpdateReferralCodeState> {
  const parsed = customRefCodeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid code" };
  }

  const newCode = parsed.data;
  if (RESERVED_CODES.has(newCode)) {
    return { ok: false, error: "That code is reserved — please pick another." };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const [entry] = await db
    .select({ id: schema.waitlistEntries.id })
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.email, user.email))
    .limit(1);

  if (!entry) return { ok: false, error: "Waitlist entry not found." };

  const [conflict] = await db
    .select({ id: schema.waitlistEntries.id })
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.referralCode, newCode))
    .limit(1);

  if (conflict && conflict.id !== entry.id) {
    return { ok: false, error: "That code is already taken — try another." };
  }

  await db
    .update(schema.waitlistEntries)
    .set({ referralCode: newCode, hasCustomCode: true, updatedAt: new Date() })
    .where(eq(schema.waitlistEntries.id, entry.id));

  return { ok: true, newCode };
}

// ============================================================================
// Tier upgrade (demo mode — instant, no payment)
// ============================================================================

export type TierUpgradeState = {
  ok: boolean;
  error?: string;
  newTier?: "free" | "pro" | "founder";
};

export async function upgradeTierAction(
  tier: "pro" | "founder",
): Promise<TierUpgradeState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };

  const [entry] = await db
    .select({ id: schema.waitlistEntries.id, tier: schema.waitlistEntries.tier })
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.email, user.email))
    .limit(1);

  if (!entry) return { ok: false, error: "Waitlist entry not found." };

  const priority = { free: 1, pro: 2, founder: 3 } as const;
  if (priority[entry.tier] > priority[tier]) {
    return { ok: false, error: "You're already on a higher tier." };
  }

  await db
    .update(schema.waitlistEntries)
    .set({ tier, updatedAt: new Date() })
    .where(eq(schema.waitlistEntries.id, entry.id));

  return { ok: true, newTier: tier };
}
