import "server-only";
import { eq, sql, and, gte } from "drizzle-orm";

import { db, schema } from "@/db";
import {
  FLAG_THRESHOLD,
  isTempEmail,
  normalizeEmail,
} from "@/lib/fraud-email";

export { FLAG_THRESHOLD, isTempEmail, normalizeEmail } from "@/lib/fraud-email";

/**
 * Anti-Fraud Detection System
 * ---------------------------
 * Detects and scores suspicious signups using multiple signals:
 *
 *   1. IP-based detection      — multiple signups from the same IP
 *   2. Email pattern detection — plus-addressing (user+test1, user+test2)
 *   3. Velocity detection      — rapid signups from same IP or fingerprint
 *   4. Referral velocity       — a single referrer getting too many signups
 *
 * Each signup gets a fraud score 0-100. Scores >= 70 are flagged for review.
 * Flagged entries don't get referral rewards until an admin approves them.
 *
 * The detection is heuristic (not ML) — designed to be transparent and
 * auditable. Each signal contributes a fixed number of points.
 */

/** Max signups per IP per hour before flagging. */
const MAX_SIGNUPS_PER_IP_PER_HOUR = 3;

/** Max signups per fingerprint per hour before flagging. */
const MAX_SIGNUPS_PER_FINGERPRINT_PER_HOUR = 2;

/** Max referrals a single code can receive per hour before flagging. */
const MAX_REFERRALS_PER_HOUR = 10;

export type FraudAssessment = {
  score: number;           // 0-100
  flagged: boolean;
  reasons: string[];       // human-readable list of triggered signals
};

/**
 * Calculate a fraud score for a new signup.
 *
 * Signals (each adds points):
 *   +40  — temp email domain
 *   +30  — same IP has >= 3 signups in last hour
 *   +25  — same fingerprint has >= 2 signups in last hour
 *   +20  — email pattern match (plus-addressing of an existing user)
 *   +15  — referrer has >= 10 referrals in last hour (referral farming)
 *   +10  — no fingerprint provided (headless browser?)
 *
 * Max possible: 140, capped at 100.
 */
export async function assessSignupFraud(params: {
  email: string;
  ip: string | null;
  fingerprint: string | null;
  referrerEntryId: string | null;
}): Promise<FraudAssessment> {
  const { email, ip, fingerprint, referrerEntryId } = params;
  let score = 0;
  const reasons: string[] = [];

  if (isTempEmail(email)) {
    score += 40;
    reasons.push("Temporary email domain");
  }

  if (ip) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [ipCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.waitlistEntries)
      .where(
        and(
          eq(schema.waitlistEntries.signupIp, ip),
          gte(schema.waitlistEntries.createdAt, oneHourAgo),
        ),
      );

    const count = ipCount?.count ?? 0;
    if (count >= MAX_SIGNUPS_PER_IP_PER_HOUR) {
      score += 30;
      reasons.push(`${count} signups from IP ${ip} in the last hour`);
    }
  }

  if (fingerprint) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [fpCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.waitlistEntries)
      .where(
        and(
          eq(schema.waitlistEntries.fingerprint, fingerprint),
          gte(schema.waitlistEntries.createdAt, oneHourAgo),
        ),
      );

    const count = fpCount?.count ?? 0;
    if (count >= MAX_SIGNUPS_PER_FINGERPRINT_PER_HOUR) {
      score += 25;
      reasons.push(`${count} signups from this device in the last hour`);
    }
  } else {
    score += 10;
    reasons.push("No browser fingerprint provided");
  }

  const normalized = normalizeEmail(email);
  if (normalized !== email.toLowerCase()) {
    const [existing] = await db
      .select({ id: schema.waitlistEntries.id })
      .from(schema.waitlistEntries)
      .where(eq(schema.waitlistEntries.email, normalized))
      .limit(1);

    if (existing) {
      score += 20;
      reasons.push("Email matches existing user via plus-addressing");
    }
  }

  if (referrerEntryId) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [refCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.waitlistEntries)
      .where(
        and(
          eq(schema.waitlistEntries.referredByEntryId, referrerEntryId),
          gte(schema.waitlistEntries.createdAt, oneHourAgo),
        ),
      );

    const count = refCount?.count ?? 0;
    if (count >= MAX_REFERRALS_PER_HOUR) {
      score += 15;
      reasons.push(`Referrer has ${count} referrals in the last hour (possible farming)`);
    }
  }

  const finalScore = Math.min(score, 100);
  const flagged = finalScore >= FLAG_THRESHOLD;

  return { score: finalScore, flagged, reasons };
}

export type FraudStats = {
  flaggedCount: number;
  bannedCount: number;
  avgFraudScore: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  topFlaggedIps: Array<{ ip: string; count: number }>;
};

export async function getFraudStats(): Promise<FraudStats> {
  const [overall] = await db
    .select({
      flaggedCount: sql<number>`count(*) filter (where ${schema.waitlistEntries.flagged})::int`,
      bannedCount: sql<number>`count(*) filter (where ${schema.waitlistEntries.banned})::int`,
      avgFraudScore: sql<number>`coalesce(avg(${schema.waitlistEntries.fraudScore}), 0)::float`,
      highRiskCount: sql<number>`count(*) filter (where ${schema.waitlistEntries.fraudScore} >= 70)::int`,
      mediumRiskCount: sql<number>`count(*) filter (where ${schema.waitlistEntries.fraudScore} >= 30 and ${schema.waitlistEntries.fraudScore} < 70)::int`,
      lowRiskCount: sql<number>`count(*) filter (where ${schema.waitlistEntries.fraudScore} < 30)::int`,
    })
    .from(schema.waitlistEntries);

  const topIps = await db
    .select({
      ip: schema.waitlistEntries.signupIp,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.flagged, true))
    .groupBy(schema.waitlistEntries.signupIp)
    .orderBy(sql`count(*) desc`)
    .limit(5);

  return {
    flaggedCount: overall?.flaggedCount ?? 0,
    bannedCount: overall?.bannedCount ?? 0,
    avgFraudScore: Math.round(overall?.avgFraudScore ?? 0),
    highRiskCount: overall?.highRiskCount ?? 0,
    mediumRiskCount: overall?.mediumRiskCount ?? 0,
    lowRiskCount: overall?.lowRiskCount ?? 0,
    topFlaggedIps: topIps
      .filter((row) => row.ip !== null)
      .map((row) => ({ ip: row.ip!, count: row.count })),
  };
}
