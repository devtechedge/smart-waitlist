import "server-only";
import { and, desc, eq, gt, lt, or, sql, type SQL } from "drizzle-orm";

import { db, schema, type WaitlistEntry } from "@/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicAppOrigin } from "@/lib/public-env";

/**
 * Waitlist read queries
 * ---------------------
 * Pure read functions intended for Server Components. Mutations live in
 * `src/app/actions/waitlist.ts` and are explicitly marked `"use server"`.
 *
 * Position ranking rule (single source of truth — keep in sync with
 * `computeAdminEntries` in `src/lib/queries/admin.ts`):
 *
 *   ORDER BY referral_count DESC, created_at ASC
 *
 *   position = 1 + COUNT(users ranked strictly ahead of me)
 *             = 1 + COUNT(referral_count > mine
 *                         OR (referral_count = mine AND created_at < mine))
 */

/** Authenticated user as returned by Supabase Auth. */
export type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
};

/** Fetch the current authenticated user, or `null` if not signed in. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) return null;

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;

  return { id: user.id, email: user.email, fullName };
}

/**
 * Tier priority mapping — higher = better (ahead in queue).
 * Used for position ranking: founder > pro > free.
 */
const TIER_PRIORITY: Record<string, number> = {
  founder: 3,
  pro: 2,
  free: 1,
};

/**
 * Compute a user's waitlist position based on the ranking rule.
 *
 * Ranking (highest priority first):
 *   1. tier_priority DESC  (founder=3 > pro=2 > free=1)
 *   2. referral_count DESC
 *   3. created_at ASC (earlier signup wins ties)
 *
 * Position = 1 + COUNT(users ranked strictly ahead of me).
 */
export async function computePosition(
  entry: Pick<WaitlistEntry, "referralCount" | "createdAt" | "tier">,
): Promise<number> {
  const myPriority = TIER_PRIORITY[entry.tier] ?? 1;

  // A user is "ahead" of me if:
  //   - their tier_priority > mine, OR
  //   - same tier AND more referrals, OR
  //   - same tier AND same referrals AND earlier created_at
  const aheadCondition = or(
    sql`case ${schema.waitlistEntries.tier}
          when 'founder' then 3
          when 'pro' then 2
          else 1
        end > ${myPriority}`,
    and(
      sql`case ${schema.waitlistEntries.tier}
            when 'founder' then 3
            when 'pro' then 2
            else 1
          end = ${myPriority}`,
      or(
        gt(schema.waitlistEntries.referralCount, entry.referralCount),
        and(
          eq(schema.waitlistEntries.referralCount, entry.referralCount),
          lt(schema.waitlistEntries.createdAt, entry.createdAt),
        ),
      ),
    ),
  ) as SQL;

  const [result] = await db
    .select({
      ahead: sql<number>`count(*)::int`,
    })
    .from(schema.waitlistEntries)
    .where(aheadCondition);

  return (result?.ahead ?? 0) + 1;
}

/** Total number of users on the waitlist (including the current user). */
export async function getTotalWaitlistCount(): Promise<number> {
  const [result] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(schema.waitlistEntries);

  return result?.total ?? 0;
}

/** Shape returned by `getDashboardData` — the full payload needed by `/dashboard`. */
export type DashboardData = {
  entry: WaitlistEntry;
  position: number;
  totalUsers: number;
  referralLink: string;
  leaderboard: Array<{
    position: number;
    referralCount: number;
    fullName: string | null;
    isMe: boolean;
    tier: "free" | "pro" | "founder";
  }>;
};

/**
 * Fetch the current user's waitlist entry + position + leaderboard.
 *
 * Returns `null` if the user is unauthenticated or has no entry yet
 * (the dashboard will then prompt them to claim their spot — see
 * `claimOrCreateWaitlistEntryAction` in `src/app/actions/waitlist.ts`).
 */
export async function getDashboardData(): Promise<DashboardData | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const [entry] = await db
    .select()
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.email, user.email))
    .limit(1);

  if (!entry) return null;

  const [position, totalUsers] = await Promise.all([
    computePosition(entry),
    getTotalWaitlistCount(),
  ]);

  // Top 10 leaderboard — same ranking rule (tier priority, then referrals, then created_at).
  const leaderboardRows = await db
    .select({
      referralCount: schema.waitlistEntries.referralCount,
      fullName: schema.waitlistEntries.fullName,
      email: schema.waitlistEntries.email,
      tier: schema.waitlistEntries.tier,
    })
    .from(schema.waitlistEntries)
    .orderBy(
      // tier priority: founder > pro > free
      sql`case ${schema.waitlistEntries.tier} when 'founder' then 3 when 'pro' then 2 else 1 end desc`,
      desc(schema.waitlistEntries.referralCount),
      schema.waitlistEntries.createdAt,
    )
    .limit(10);

  // Recompute positions in-app (avoids a second round-trip with window functions).
  const leaderboard = leaderboardRows.map((row, idx) => ({
    position: idx + 1,
    referralCount: row.referralCount,
    fullName: row.fullName ?? maskForLeaderboard(row.email),
    isMe: row.email === user.email,
    tier: row.tier,
  }));

  return {
    entry,
    position,
    totalUsers,
    referralLink: `${publicAppOrigin()}/?ref=${entry.referralCode}`,
    leaderboard,
  };
}

/** Pull the user's waitlist entry without the dashboard payload. */
export async function getMyWaitlistEntry(): Promise<WaitlistEntry | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const [entry] = await db
    .select()
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.email, user.email))
    .limit(1);

  return entry ?? null;
}

/**
 * Lightweight stats for the landing page hero (e.g., "Join 2,431 others").
 * Returns `null` if the DB is unreachable so the landing page can degrade
 * gracefully (the headline just omits the count).
 */
export async function getLandingStats(): Promise<{ totalUsers: number } | null> {
  try {
    const totalUsers = await getTotalWaitlistCount();
    return { totalUsers };
  } catch {
    return null;
  }
}

/**
 * Validate that a referral code exists. Used by the landing page to decide
 * whether to show a "Referred by friend" banner. Returns the entry's
 * `fullName` (or masked email) for display, or `null` if the code is invalid.
 */
export async function resolveReferralCode(
  refCode: string,
): Promise<{ referrerName: string | null } | null> {
  const [entry] = await db
    .select({
      fullName: schema.waitlistEntries.fullName,
      email: schema.waitlistEntries.email,
    })
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.referralCode, refCode))
    .limit(1);

  if (!entry) return null;
  return { referrerName: entry.fullName ?? maskForLeaderboard(entry.email) };
}

/** Show the first 2 chars of the email + domain, e.g. "fo••@ex••.com". */
function maskForLeaderboard(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const maskedLocal = local.length <= 2 ? local : `${local.slice(0, 2)}${"•".repeat(3)}`;
  return `${maskedLocal}@${domain}`;
}
