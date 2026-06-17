import "server-only";
import { desc, sql } from "drizzle-orm";

import { db, schema, type WaitlistEntry } from "@/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/server-env";

/**
 * Admin read queries
 * ------------------
 * These functions are intended for the `/admin` dashboard. Each one
 * verifies that the caller is an authenticated admin (per the
 * `ADMIN_EMAILS` env var) before returning data.
 *
 * Position ranking rule (same as `src/lib/queries/waitlist.ts`):
 *
 *   ORDER BY referral_count DESC, created_at ASC
 *   position = ROW_NUMBER() OVER (that ordering)
 *
 * We compute position client-side as `index + 1` to avoid a second query
 * — the ORDER BY already establishes the ranking.
 */

/** Row shape for the admin dashboard table. */
export type AdminWaitlistRow = {
  position: number;
  id: WaitlistEntry["id"];
  email: string;
  fullName: string | null;
  referralCode: string;
  referralCount: number;
  visits: number;
  status: WaitlistEntry["status"];
  createdAt: Date;
  userId: string | null;
  referredByEntryId: string | null;
};

/** The currently authenticated admin user (or throws if not authorized). */
export type AdminUser = {
  id: string;
  email: string;
};

/**
 * Throws if the current request is not from an authenticated admin.
 * Returns the admin user object on success.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    throw new AdminAuthError("You must be signed in to access this resource.");
  }

  if (!isAdminEmail(user.email)) {
    throw new AdminAuthError("Forbidden: admin access required.");
  }

  return { id: user.id, email: user.email };
}

/**
 * Custom error class so Server Actions / Route Handlers can distinguish
 * admin-auth failures from other errors and return appropriate HTTP status.
 */
export class AdminAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminAuthError";
  }
}

/** Aggregate stats for the admin dashboard header. */
export type AdminStats = {
  totalEntries: number;
  pendingCount: number;
  invitedCount: number;
  activatedCount: number;
  totalReferrals: number;
  totalVisits: number;
};

/** Fetch aggregate counts for the admin dashboard summary cards. */
export async function getAdminStats(): Promise<AdminStats> {
  await requireAdmin();

  const [row] = await db
    .select({
      totalEntries: sql<number>`count(*)::int`,
      pendingCount: sql<number>`count(*) filter (where ${schema.waitlistEntries.status} = 'pending')::int`,
      invitedCount: sql<number>`count(*) filter (where ${schema.waitlistEntries.status} = 'invited')::int`,
      activatedCount: sql<number>`count(*) filter (where ${schema.waitlistEntries.status} = 'activated')::int`,
      totalReferrals: sql<number>`coalesce(sum(${schema.waitlistEntries.referralCount}), 0)::int`,
      totalVisits: sql<number>`coalesce(sum(${schema.waitlistEntries.visits}), 0)::int`,
    })
    .from(schema.waitlistEntries);

  return {
    totalEntries: row?.totalEntries ?? 0,
    pendingCount: row?.pendingCount ?? 0,
    invitedCount: row?.invitedCount ?? 0,
    activatedCount: row?.activatedCount ?? 0,
    totalReferrals: row?.totalReferrals ?? 0,
    totalVisits: row?.totalVisits ?? 0,
  };
}

/**
 * Fetch all waitlist entries with computed position, ordered by the ranking
 * rule. Intended for the admin table.
 *
 * @param limit  Maximum rows to return (default 1000). Pagination is via
 *               `offset` — for >10k rows, switch to cursor-based pagination.
 * @param offset Number of rows to skip.
 */
export async function getAdminEntries(
  limit = 1000,
  offset = 0,
): Promise<AdminWaitlistRow[]> {
  await requireAdmin();

  const rows = await db
    .select({
      id: schema.waitlistEntries.id,
      email: schema.waitlistEntries.email,
      fullName: schema.waitlistEntries.fullName,
      referralCode: schema.waitlistEntries.referralCode,
      referralCount: schema.waitlistEntries.referralCount,
      visits: schema.waitlistEntries.visits,
      status: schema.waitlistEntries.status,
      createdAt: schema.waitlistEntries.createdAt,
      userId: schema.waitlistEntries.userId,
      referredByEntryId: schema.waitlistEntries.referredByEntryId,
    })
    .from(schema.waitlistEntries)
    .orderBy(
      desc(schema.waitlistEntries.referralCount),
      schema.waitlistEntries.createdAt,
    )
    .limit(limit)
    .offset(offset);

  // Position = index + 1 because the ORDER BY already establishes rank.
  return rows.map((row, idx) => ({
    position: idx + 1 + offset,
    ...row,
  }));
}
