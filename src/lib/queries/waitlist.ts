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
 * Compute a user's waitlist position based on the ranking rule.
 * Returns `null` if the user has no entry yet.
 */
export async function computePosition(
  entry: Pick<WaitlistEntry, "referralCount" | "createdAt">,
): Promise<number> {
  // `or()` returns `SQL | undefined`; both branches here are non-null, so we
  // assert to `SQL` for ergonomics. The `.where()` call below accepts
  // `SQL | undefined`, so the assertion is purely for type-narrowing clarity.
  const aheadCondition = or(
    gt(schema.waitlistEntries.referralCount, entry.referralCount),
    and(
      eq(schema.waitlistEntries.referralCount, entry.referralCount),
      lt(schema.waitlistEntries.createdAt, entry.createdAt),
    ),
  ) as SQL;

  const [result] = await db
    .select({
      ahead: sql<number>`count(*)::int`,
    })
    .from(schema.waitlistEntries)
    .where(aheadCondition);

  // `ahead` is the number of users strictly ahead; our position = ahead + 1.
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

  // Top 10 leaderboard — same ranking rule.
  const leaderboardRows = await db
    .select({
      referralCount: schema.waitlistEntries.referralCount,
      fullName: schema.waitlistEntries.fullName,
      email: schema.waitlistEntries.email,
    })
    .from(schema.waitlistEntries)
    .orderBy(
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
