import "server-only";
import { desc, sql, eq, and, ne } from "drizzle-orm";

import { db, schema } from "@/db";

/**
 * Public leaderboard queries
 * --------------------------
 * Data for the public `/leaderboard` page and user profile cards (`/u/[code]`).
 * These queries do NOT require auth — they only return non-sensitive fields.
 *
 * Privacy rules:
 *   - Emails are NEVER exposed — only fullName or masked email
 *   - Banned users are excluded
 *   - Users can "opt out" of the public leaderboard (future: add `public` column)
 */

/** Top N public leaderboard entries (no emails, no sensitive data). */
export type PublicLeaderboardEntry = {
  position: number;
  referralCount: number;
  displayName: string;
  tier: "free" | "pro" | "founder";
  referralCode: string;
};

/** Public profile data for `/u/[code]` pages. */
export type PublicProfile = {
  referralCode: string;
  displayName: string;
  referralCount: number;
  tier: "free" | "pro" | "founder";
  position: number;
  joinedAt: Date;
  achievements: string[];
  totalUsers: number;
};

/**
 * Fetch the top N referrers for the public leaderboard.
 * Excludes banned users. Emails are masked if no fullName is set.
 */
export async function getPublicLeaderboard(
  limit = 100,
): Promise<PublicLeaderboardEntry[]> {
  const rows = await db
    .select({
      referralCount: schema.waitlistEntries.referralCount,
      fullName: schema.waitlistEntries.fullName,
      email: schema.waitlistEntries.email,
      tier: schema.waitlistEntries.tier,
      referralCode: schema.waitlistEntries.referralCode,
    })
    .from(schema.waitlistEntries)
    .where(
      and(
        eq(schema.waitlistEntries.banned, false),
        ne(schema.waitlistEntries.email, "deleted@removed.local"),
      ),
    )
    .orderBy(
      // tier priority: founder > pro > free
      sql`case ${schema.waitlistEntries.tier} when 'founder' then 3 when 'pro' then 2 else 1 end desc`,
      desc(schema.waitlistEntries.referralCount),
      schema.waitlistEntries.createdAt,
    )
    .limit(limit);

  return rows.map((row, idx) => ({
    position: idx + 1,
    referralCount: row.referralCount,
    displayName: row.fullName ?? maskEmail(row.email),
    tier: row.tier,
    referralCode: row.referralCode,
  }));
}

/**
 * Fetch a single user's public profile by referral code.
 * Returns null if the code doesn't exist or the user is banned.
 */
export async function getPublicProfile(
  referralCode: string,
): Promise<PublicProfile | null> {
  const [entry] = await db
    .select({
      id: schema.waitlistEntries.id,
      referralCode: schema.waitlistEntries.referralCode,
      fullName: schema.waitlistEntries.fullName,
      email: schema.waitlistEntries.email,
      referralCount: schema.waitlistEntries.referralCount,
      tier: schema.waitlistEntries.tier,
      createdAt: schema.waitlistEntries.createdAt,
      banned: schema.waitlistEntries.banned,
    })
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.referralCode, referralCode))
    .limit(1);

  if (!entry || entry.banned) return null;

  // Compute position
  const [positionRow] = await db
    .select({ ahead: sql<number>`count(*)::int` })
    .from(schema.waitlistEntries)
    .where(
      and(
        sql`case ${schema.waitlistEntries.tier} when 'founder' then 3 when 'pro' then 2 else 1 end > case ${entry.tier}::text when 'founder' then 3 when 'pro' then 2 else 1 end
            or (${schema.waitlistEntries.referralCount} > ${entry.referralCount})
            or (${schema.waitlistEntries.referralCount} = ${entry.referralCount} and ${schema.waitlistEntries.createdAt} < ${entry.createdAt})`,
      ),
    );

  const [totalRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(schema.waitlistEntries);

  return {
    referralCode: entry.referralCode,
    displayName: entry.fullName ?? maskEmail(entry.email),
    referralCount: entry.referralCount,
    tier: entry.tier,
    position: (positionRow?.ahead ?? 0) + 1,
    joinedAt: entry.createdAt,
    achievements: getAchievements(entry.referralCount, entry.tier),
    totalUsers: totalRow?.total ?? 0,
  };
}

/**
 * Achievement system — returns badge names based on milestones.
 */
function getAchievements(referralCount: number, tier: string): string[] {
  const achievements: string[] = [];

  if (referralCount >= 1) achievements.push("First Referral");
  if (referralCount >= 5) achievements.push("Getting Social");
  if (referralCount >= 10) achievements.push("Connector");
  if (referralCount >= 25) achievements.push("Influencer");
  if (referralCount >= 50) achievements.push("Viral Sensation");
  if (referralCount >= 100) achievements.push("Legend");

  if (tier === "pro") achievements.push("Pro Member");
  if (tier === "founder") achievements.push("Founder");

  return achievements;
}

/** Mask email for public display: "founder@example.com" → "f••••@e••••.com" */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const maskedLocal = local.length <= 1 ? local : `${local[0]}${"•".repeat(Math.max(4, local.length - 1))}`;
  const [domainName, ...tldParts] = domain.split(".");
  const tld = tldParts.join(".");
  if (!domainName || !tld) return email;
  const maskedDomain = domainName.length <= 1 ? domainName : `${domainName[0]}${"•".repeat(Math.max(4, domainName.length - 1))}`;
  return `${maskedLocal}@${maskedDomain}.${tld}`;
}
