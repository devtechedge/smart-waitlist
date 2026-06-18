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

// ============================================================================
// Analytics queries (for charts)
// ============================================================================

/** Daily signup counts for the last N days (for line/area chart). */
export type DailySignupPoint = {
  date: string;       // YYYY-MM-DD
  signups: number;
  referrals: number;  // signups that came via a referral
};

/** Tier distribution (for pie/donut chart). */
export type TierDistribution = {
  tier: "free" | "pro" | "founder";
  count: number;
};

/** Status distribution (for pie/donut chart). */
export type StatusDistribution = {
  status: "pending" | "invited" | "activated";
  count: number;
};

/** Top referrers (for bar chart). */
export type TopReferrer = {
  fullName: string | null;
  email: string;
  referralCount: number;
};

/** Aggregate analytics payload for the admin charts. */
export type AdminAnalytics = {
  dailySignups: DailySignupPoint[];
  tierDistribution: TierDistribution[];
  statusDistribution: StatusDistribution[];
  topReferrers: TopReferrer[];
};

/**
 * Fetch all analytics data for the admin charts. Gathers:
 *   - Daily signups for last 30 days (with referral split)
 *   - Tier distribution (free/pro/founder counts)
 *   - Status distribution (pending/invited/activated)
 *   - Top 10 referrers
 */
export async function getAdminAnalytics(): Promise<AdminAnalytics> {
  await requireAdmin();

  const [dailySignups, tierRows, statusRows, topReferrers] = await Promise.all([
    // Daily signups for last 30 days
    db
      .select({
        date: sql<string>`to_char(date_trunc('day', ${schema.waitlistEntries.createdAt}), 'YYYY-MM-DD')`,
        signups: sql<number>`count(*)::int`,
        referrals: sql<number>`count(*) filter (where ${schema.waitlistEntries.referredByEntryId} is not null)::int`,
      })
      .from(schema.waitlistEntries)
      .where(
        sql`${schema.waitlistEntries.createdAt} >= now() - interval '30 days'`
      )
      .groupBy(sql`date_trunc('day', ${schema.waitlistEntries.createdAt})`)
      .orderBy(sql`date_trunc('day', ${schema.waitlistEntries.createdAt})`),

    // Tier distribution
    db
      .select({
        tier: schema.waitlistEntries.tier,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.waitlistEntries)
      .groupBy(schema.waitlistEntries.tier),

    // Status distribution
    db
      .select({
        status: schema.waitlistEntries.status,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.waitlistEntries)
      .groupBy(schema.waitlistEntries.status),

    // Top 10 referrers
    db
      .select({
        fullName: schema.waitlistEntries.fullName,
        email: schema.waitlistEntries.email,
        referralCount: schema.waitlistEntries.referralCount,
      })
      .from(schema.waitlistEntries)
      .where(sql`${schema.waitlistEntries.referralCount} > 0`)
      .orderBy(desc(schema.waitlistEntries.referralCount))
      .limit(10),
  ]);

  // Fill in missing days (days with 0 signups won't appear in the SQL output).
  const today = new Date();
  const dateMap = new Map(dailySignups.map((d) => [d.date, d]));
  const filledDaily: DailySignupPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const existing = dateMap.get(dateStr);
    filledDaily.push({
      date: dateStr,
      signups: existing?.signups ?? 0,
      referrals: existing?.referrals ?? 0,
    });
  }

  return {
    dailySignups: filledDaily,
    tierDistribution: tierRows as TierDistribution[],
    statusDistribution: statusRows as StatusDistribution[],
    topReferrers: topReferrers as TopReferrer[],
  };
}
