"use server";

import { z } from "zod";
import { eq, sql } from "drizzle-orm";

import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/queries/waitlist";
import { validatePromoCode, incrementPromoCodeUsage } from "@/lib/queries/v5-features";
import { requireAdmin } from "@/lib/queries/admin";

/**
 * VIP Promo Code Server Actions
 * -----------------------------
 *   - redeemPromoCodeAction: user redeems a code for an instant tier upgrade
 *   - createPromoCodeAction: admin creates a new promo code
 *   - listPromoCodesAction: admin lists all promo codes
 */

export type PromoCodeState = {
  ok: boolean;
  error?: string;
  newTier?: "free" | "pro" | "founder";
};

const promoCodeInputSchema = z
  .string()
  .min(3, "Code must be at least 3 characters")
  .max(30, "Code is too long")
  .regex(/^[A-Z0-9-]+$/i, "Code can only contain letters, numbers, and hyphens")
  .transform((s) => s.trim().toUpperCase());

/** User redeems a promo code for an instant tier upgrade. */
export async function redeemPromoCodeAction(input: string): Promise<PromoCodeState> {
  const parsed = promoCodeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid code" };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in" };

  const validation = await validatePromoCode(parsed.data);
  if (!validation.valid || !validation.tier) {
    return { ok: false, error: validation.error ?? "Invalid code" };
  }

  // Find the user's entry
  const [entry] = await db
    .select({
      id: schema.waitlistEntries.id,
      tier: schema.waitlistEntries.tier,
    })
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.email, user.email))
    .limit(1);

  if (!entry) return { ok: false, error: "Waitlist entry not found" };

  // Check if the promo tier is actually an upgrade
  const priority = { free: 1, pro: 2, founder: 3 } as const;
  if (priority[entry.tier] >= priority[validation.tier]) {
    return { ok: false, error: "You're already on this or a higher tier" };
  }

  // Upgrade the user
  await db
    .update(schema.waitlistEntries)
    .set({ tier: validation.tier, updatedAt: new Date() })
    .where(eq(schema.waitlistEntries.id, entry.id));

  // Increment promo code usage
  await incrementPromoCodeUsage(parsed.data);

  // Audit log
  await db.insert(schema.adminAuditLog).values({
    adminEmail: "system@promo",
    action: "promo_code_redeemed",
    targetEntryId: entry.id,
    targetEmail: user.email,
    oldValue: entry.tier,
    newValue: validation.tier,
    note: `Code: ${parsed.data}`,
  });

  return { ok: true, newTier: validation.tier };
}

// ============================================================================
// Admin: create + list promo codes
// ============================================================================

const createPromoSchema = z.object({
  code: z.string().min(3).max(30).regex(/^[A-Z0-9-]+$/i),
  tier: z.enum(["free", "pro", "founder"]),
  maxUses: z.number().int().min(1).optional(),
  expiresAt: z.string().optional(),
  note: z.string().max(500).optional(),
});

export type CreatePromoCodeState = {
  ok: boolean;
  error?: string;
  code?: string;
};

export async function createPromoCodeAction(
  input: z.infer<typeof createPromoSchema>,
): Promise<CreatePromoCodeState> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unauthorized" };
  }

  const parsed = createPromoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const code = parsed.data.code.toUpperCase();

  // Check for existing code
  const [existing] = await db
    .select({ id: schema.promoCodes.id })
    .from(schema.promoCodes)
    .where(eq(schema.promoCodes.code, code))
    .limit(1);

  if (existing) {
    return { ok: false, error: "A promo code with this name already exists" };
  }

  await db.insert(schema.promoCodes).values({
    code,
    tier: parsed.data.tier,
    maxUses: parsed.data.maxUses ?? null,
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    createdBy: admin.email,
    note: parsed.data.note ?? null,
  });

  return { ok: true, code };
}

export type PromoCodeRow = {
  id: string;
  code: string;
  tier: string;
  maxUses: number | null;
  usesCount: number;
  expiresAt: Date | null;
  note: string | null;
  createdAt: Date;
};

export async function listPromoCodesAction(): Promise<PromoCodeRow[]> {
  await requireAdmin();

  const rows = await db
    .select()
    .from(schema.promoCodes)
    .orderBy(sql`${schema.promoCodes.createdAt} desc`);

  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    tier: r.tier,
    maxUses: r.maxUses,
    usesCount: r.usesCount,
    expiresAt: r.expiresAt,
    note: r.note,
    createdAt: r.createdAt,
  }));
}
