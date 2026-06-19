"use server";

import { z } from "zod";
import { eq, sql, and, desc, ilike, or, type SQL } from "drizzle-orm";

import { db, schema } from "@/db";

import { requireAdmin } from "@/lib/queries/admin";
import { sendInviteEmail } from "@/lib/email";

/**
 * Admin CRUD Server Actions
 * -------------------------
 * Full management capabilities for admins:
 *   - inviteUserAction    → flip status to 'invited' + send email
 *   - banUserAction       → ban a user (can't sign in)
 *   - unbanUserAction     → lift a ban
 *   - changeTierAction    → manually upgrade/downgrade tier
 *   - deleteUserAction    → soft delete (set banned + null out fields)
 *   - getAuditLogAction   → fetch admin action history
 *   - searchEntriesAction → filtered/paginated search
 *
 * Every mutation writes to `admin_audit_log` for accountability.
 */

export type AdminCrudState = {
  ok: boolean;
  error?: string;
};

// ============================================================================
// Audit log helper
// ============================================================================

async function writeAuditLog(params: {
  adminEmail: string;
  action: string;
  targetEntryId?: string;
  targetEmail?: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
}): Promise<void> {
  await db.insert(schema.adminAuditLog).values({
    adminEmail: params.adminEmail,
    action: params.action,
    targetEntryId: params.targetEntryId ?? null,
    targetEmail: params.targetEmail ?? null,
    oldValue: params.oldValue ?? null,
    newValue: params.newValue ?? null,
    note: params.note ?? null,
  });
}

// ============================================================================
// Invite user
// ============================================================================

const inviteSchema = z.object({
  entryId: z.string().uuid(),
});

export async function inviteUserAction(
  entryId: string,
): Promise<AdminCrudState> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unauthorized" };
  }

  const parsed = inviteSchema.safeParse({ entryId });
  if (!parsed.success) {
    return { ok: false, error: "Invalid entry ID" };
  }

  const [entry] = await db
    .select({
      id: schema.waitlistEntries.id,
      email: schema.waitlistEntries.email,
      status: schema.waitlistEntries.status,
      banned: schema.waitlistEntries.banned,
    })
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.id, parsed.data.entryId))
    .limit(1);

  if (!entry) {
    return { ok: false, error: "Entry not found" };
  }

  if (entry.banned) {
    return { ok: false, error: "Cannot invite a banned user" };
  }

  if (entry.status === "invited" || entry.status === "activated") {
    return { ok: false, error: "User already invited or activated" };
  }

  await db
    .update(schema.waitlistEntries)
    .set({
      status: "invited",
      updatedAt: new Date(),
    })
    .where(eq(schema.waitlistEntries.id, entry.id));

  await writeAuditLog({
    adminEmail: admin.email,
    action: "invite",
    targetEntryId: entry.id,
    targetEmail: entry.email,
    oldValue: "pending",
    newValue: "invited",
  });

  // Send invite email (graceful skip if no Resend key)
  try {
    await sendInviteEmail({ to: entry.email });
  } catch (err) {
    console.error("[inviteUserAction] email failed", err);
  }

  return { ok: true };
}

// ============================================================================
// Ban / Unban
// ============================================================================

const banSchema = z.object({
  entryId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export async function banUserAction(
  entryId: string,
  reason?: string,
): Promise<AdminCrudState> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unauthorized" };
  }

  const parsed = banSchema.safeParse({ entryId, reason });
  if (!parsed.success) {
    return { ok: false, error: "Invalid input" };
  }

  const [entry] = await db
    .select({
      id: schema.waitlistEntries.id,
      email: schema.waitlistEntries.email,
      banned: schema.waitlistEntries.banned,
      userId: schema.waitlistEntries.userId,
    })
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.id, parsed.data.entryId))
    .limit(1);

  if (!entry) {
    return { ok: false, error: "Entry not found" };
  }

  if (entry.banned) {
    return { ok: false, error: "User already banned" };
  }

  await db
    .update(schema.waitlistEntries)
    .set({
      banned: true,
      banReason: parsed.data.reason ?? null,
      updatedAt: new Date(),
    })
    .where(eq(schema.waitlistEntries.id, entry.id));

  // If the user has an auth account, sign them out by revoking their session.
  if (entry.userId) {
    try {
      const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
      const adminClient = createSupabaseAdminClient();
      await adminClient.auth.admin.signOut(entry.userId);
    } catch (err) {
      console.error("[banUserAction] session revoke failed", err);
    }
  }

  await writeAuditLog({
    adminEmail: admin.email,
    action: "ban",
    targetEntryId: entry.id,
    targetEmail: entry.email,
    oldValue: "active",
    newValue: "banned",
    note: parsed.data.reason,
  });

  return { ok: true };
}

export async function unbanUserAction(entryId: string): Promise<AdminCrudState> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unauthorized" };
  }

  const [entry] = await db
    .select({
      id: schema.waitlistEntries.id,
      email: schema.waitlistEntries.email,
      banned: schema.waitlistEntries.banned,
    })
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.id, entryId))
    .limit(1);

  if (!entry) {
    return { ok: false, error: "Entry not found" };
  }

  if (!entry.banned) {
    return { ok: false, error: "User is not banned" };
  }

  await db
    .update(schema.waitlistEntries)
    .set({
      banned: false,
      banReason: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.waitlistEntries.id, entry.id));

  await writeAuditLog({
    adminEmail: admin.email,
    action: "unban",
    targetEntryId: entry.id,
    targetEmail: entry.email,
    oldValue: "banned",
    newValue: "active",
  });

  return { ok: true };
}

// ============================================================================
// Change tier (admin override)
// ============================================================================

const changeTierSchema = z.object({
  entryId: z.string().uuid(),
  tier: z.enum(["free", "pro", "founder"]),
});

export async function changeTierAction(
  entryId: string,
  tier: "free" | "pro" | "founder",
): Promise<AdminCrudState> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unauthorized" };
  }

  const parsed = changeTierSchema.safeParse({ entryId, tier });
  if (!parsed.success) {
    return { ok: false, error: "Invalid input" };
  }

  const [entry] = await db
    .select({
      id: schema.waitlistEntries.id,
      email: schema.waitlistEntries.email,
      tier: schema.waitlistEntries.tier,
    })
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.id, parsed.data.entryId))
    .limit(1);

  if (!entry) {
    return { ok: false, error: "Entry not found" };
  }

  if (entry.tier === parsed.data.tier) {
    return { ok: false, error: "User is already on this tier" };
  }

  await db
    .update(schema.waitlistEntries)
    .set({
      tier: parsed.data.tier,
      updatedAt: new Date(),
    })
    .where(eq(schema.waitlistEntries.id, entry.id));

  await writeAuditLog({
    adminEmail: admin.email,
    action: "change_tier",
    targetEntryId: entry.id,
    targetEmail: entry.email,
    oldValue: entry.tier,
    newValue: parsed.data.tier,
  });

  return { ok: true };
}

// ============================================================================
// Delete entry (soft delete — ban + clear PII)
// ============================================================================

export async function deleteUserAction(entryId: string): Promise<AdminCrudState> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unauthorized" };
  }

  const [entry] = await db
    .select({
      id: schema.waitlistEntries.id,
      email: schema.waitlistEntries.email,
      userId: schema.waitlistEntries.userId,
    })
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.id, entryId))
    .limit(1);

  if (!entry) {
    return { ok: false, error: "Entry not found" };
  }

  // Soft delete: ban + anonymize PII but keep the row for analytics.
  await db
    .update(schema.waitlistEntries)
    .set({
      banned: true,
      banReason: "Account deleted by admin",
      email: `deleted-${entry.id.slice(0, 8)}@removed.local`,
      fullName: null,
      userId: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.waitlistEntries.id, entry.id));

  // Delete the auth user if they had one.
  if (entry.userId) {
    try {
      const { createSupabaseAdminClient } = await import("@/lib/supabase/admin");
      const adminClient = createSupabaseAdminClient();
      await adminClient.auth.admin.deleteUser(entry.userId);
    } catch (err) {
      console.error("[deleteUserAction] auth user delete failed", err);
    }
  }

  await writeAuditLog({
    adminEmail: admin.email,
    action: "delete",
    targetEntryId: entry.id,
    targetEmail: entry.email,
    note: "Soft-deleted: PII anonymized, auth user removed",
  });

  return { ok: true };
}

// ============================================================================
// Audit log query
// ============================================================================

export type AuditLogEntry = {
  id: string;
  adminEmail: string;
  action: string;
  targetEmail: string | null;
  oldValue: string | null;
  newValue: string | null;
  note: string | null;
  createdAt: Date;
};

export async function getAuditLogAction(
  limit = 50,
): Promise<AuditLogEntry[]> {
  await requireAdmin();

  const rows = await db
    .select({
      id: schema.adminAuditLog.id,
      adminEmail: schema.adminAuditLog.adminEmail,
      action: schema.adminAuditLog.action,
      targetEmail: schema.adminAuditLog.targetEmail,
      oldValue: schema.adminAuditLog.oldValue,
      newValue: schema.adminAuditLog.newValue,
      note: schema.adminAuditLog.note,
      createdAt: schema.adminAuditLog.createdAt,
    })
    .from(schema.adminAuditLog)
    .orderBy(desc(schema.adminAuditLog.createdAt))
    .limit(limit);

  return rows;
}

// ============================================================================
// Search + filter entries
// ============================================================================

export type SearchFilters = {
  query?: string;           // email or name contains
  tier?: "free" | "pro" | "founder" | "all";
  status?: "pending" | "invited" | "activated" | "all";
  flagged?: boolean;
  banned?: boolean;
  limit?: number;
  offset?: number;
};

export type SearchEntry = {
  id: string;
  email: string;
  fullName: string | null;
  referralCode: string;
  referralCount: number;
  visits: number;
  status: string;
  tier: string;
  flagged: boolean;
  banned: boolean;
  fraudScore: number;
  createdAt: Date;
};

export async function searchEntriesAction(
  filters: SearchFilters,
): Promise<{ entries: SearchEntry[]; total: number }> {
  await requireAdmin();

  const conditions: SQL[] = [];

  if (filters.query) {
    const q = `%${filters.query}%`;
    conditions.push(
      or(
        ilike(schema.waitlistEntries.email, q),
        ilike(schema.waitlistEntries.fullName, q),
        ilike(schema.waitlistEntries.referralCode, q),
      ) as SQL,
    );
  }

  if (filters.tier && filters.tier !== "all") {
    conditions.push(eq(schema.waitlistEntries.tier, filters.tier));
  }

  if (filters.status && filters.status !== "all") {
    conditions.push(eq(schema.waitlistEntries.status, filters.status));
  }

  if (filters.flagged) {
    conditions.push(eq(schema.waitlistEntries.flagged, true));
  }

  if (filters.banned) {
    conditions.push(eq(schema.waitlistEntries.banned, true));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [countRow]] = await Promise.all([
    db
      .select({
        id: schema.waitlistEntries.id,
        email: schema.waitlistEntries.email,
        fullName: schema.waitlistEntries.fullName,
        referralCode: schema.waitlistEntries.referralCode,
        referralCount: schema.waitlistEntries.referralCount,
        visits: schema.waitlistEntries.visits,
        status: schema.waitlistEntries.status,
        tier: schema.waitlistEntries.tier,
        flagged: schema.waitlistEntries.flagged,
        banned: schema.waitlistEntries.banned,
        fraudScore: schema.waitlistEntries.fraudScore,
        createdAt: schema.waitlistEntries.createdAt,
      })
      .from(schema.waitlistEntries)
      .where(whereClause)
      .orderBy(
        desc(schema.waitlistEntries.referralCount),
        schema.waitlistEntries.createdAt,
      )
      .limit(filters.limit ?? 50)
      .offset(filters.offset ?? 0),

    db
      .select({ total: sql<number>`count(*)::int` })
      .from(schema.waitlistEntries)
      .where(whereClause),
  ]);

  return {
    entries: rows as SearchEntry[],
    total: countRow?.total ?? 0,
  };
}
