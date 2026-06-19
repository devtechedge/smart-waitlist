import "server-only";
import { eq, desc, and, gte, lte, sql, asc } from "drizzle-orm";

import { db, schema } from "@/db";
import { computePosition } from "@/lib/queries/waitlist";

/**
 * v5 feature queries
 * ------------------
 * Read functions for the 10 new complex features:
 *   1. Launch countdown (app settings)
 *   2. Social proof feed (recent signups)
 *   3. Milestones (definitions + user unlocks)
 *   4. Geographic heatmap (country/city counts)
 *   5. Referral chain (tree of referrals)
 *   6. Promo codes (validation + redemption)
 *   7. Conversion funnel (visit → signup → referral → upgrade)
 *   8. Webhook configs (Slack/Discord)
 *   9. (i18n is client-side, no queries needed)
 *   10. Position history (time-series)
 */

// ============================================================================
// 1. Launch settings
// ============================================================================

export async function getLaunchSettings(): Promise<{
  launchDate: Date | null;
  launchMode: "waitlist" | "launched";
}> {
  const [settings] = await db
    .select({
      launchDate: schema.appSettings.launchDate,
      launchMode: schema.appSettings.launchMode,
    })
    .from(schema.appSettings)
    .where(eq(schema.appSettings.id, 1))
    .limit(1);

  return {
    launchDate: settings?.launchDate ?? null,
    launchMode: (settings?.launchMode as "waitlist" | "launched") ?? "waitlist",
  };
}

// ============================================================================
// 2. Social proof feed (recent signups for live toasts)
// ============================================================================

export type SocialProofEntry = {
  id: string;
  displayName: string;
  city: string | null;
  country: string | null;
  minutesAgo: number;
};

export async function getRecentSignups(limit = 10): Promise<SocialProofEntry[]> {
  const rows = await db
    .select({
      id: schema.waitlistEntries.id,
      fullName: schema.waitlistEntries.fullName,
      email: schema.waitlistEntries.email,
      city: schema.waitlistEntries.signupCity,
      country: schema.waitlistEntries.signupCountry,
      createdAt: schema.waitlistEntries.createdAt,
    })
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.banned, false))
    .orderBy(desc(schema.waitlistEntries.createdAt))
    .limit(limit);

  const now = Date.now();

  return rows.map((row) => ({
    id: row.id,
    displayName: row.fullName ?? maskEmail(row.email),
    city: row.city,
    country: row.country,
    minutesAgo: Math.floor((now - row.createdAt.getTime()) / 60_000),
  }));
}

// ============================================================================
// 3. Milestones
// ============================================================================

export type MilestoneWithStatus = {
  id: string;
  threshold: number;
  title: string;
  description: string;
  perk: string;
  badgeIcon: string | null;
  unlocked: boolean;
  unlockedAt: Date | null;
};

export async function getMilestonesForUser(
  entryId: string,
  currentReferralCount: number,
): Promise<MilestoneWithStatus[]> {
  const [allMilestones, userUnlocks] = await Promise.all([
    db
      .select()
      .from(schema.milestones)
      .orderBy(asc(schema.milestones.threshold)),
    db
      .select({
        milestoneId: schema.userMilestones.milestoneId,
        unlockedAt: schema.userMilestones.unlockedAt,
      })
      .from(schema.userMilestones)
      .where(eq(schema.userMilestones.entryId, entryId)),
  ]);

  const unlockMap = new Map(userUnlocks.map((u) => [u.milestoneId, u.unlockedAt]));

  return allMilestones.map((m) => ({
    id: m.id,
    threshold: m.threshold,
    title: m.title,
    description: m.description,
    perk: m.perk,
    badgeIcon: m.badgeIcon,
    unlocked: (unlockMap.get(m.id) !== undefined) || currentReferralCount >= m.threshold,
    unlockedAt: unlockMap.get(m.id) ?? null,
  }));
}

/** Check + unlock any milestones the user has newly earned. Returns newly unlocked. */
export async function checkAndUnlockMilestones(entryId: string): Promise<MilestoneWithStatus[]> {
  const [entry] = await db
    .select({ referralCount: schema.waitlistEntries.referralCount })
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.id, entryId))
    .limit(1);

  if (!entry) return [];

  // Find milestones the user qualifies for but hasn't unlocked yet.
  const [unlockedRows] = await Promise.all([
    db
      .select({ milestoneId: schema.userMilestones.milestoneId })
      .from(schema.userMilestones)
      .where(eq(schema.userMilestones.entryId, entryId)),
  ]);

  const alreadyUnlocked = new Set(unlockedRows.map((u) => u.milestoneId));

  const qualifying = await db
    .select()
    .from(schema.milestones)
    .where(
      and(
        lte(schema.milestones.threshold, entry.referralCount),
      ),
    );

  const newMilestones = qualifying.filter((m) => !alreadyUnlocked.has(m.id));

  // Insert new unlocks
  if (newMilestones.length > 0) {
    await db.insert(schema.userMilestones).values(
      newMilestones.map((m) => ({
        entryId,
        milestoneId: m.id,
      })),
    );
  }

  return newMilestones.map((m) => ({
    id: m.id,
    threshold: m.threshold,
    title: m.title,
    description: m.description,
    perk: m.perk,
    badgeIcon: m.badgeIcon,
    unlocked: true,
    unlockedAt: new Date(),
  }));
}

// ============================================================================
// 4. Geographic heatmap data
// ============================================================================

export type GeoDataPoint = {
  country: string | null;
  city: string | null;
  count: number;
  latitude: number | null;
  longitude: number | null;
};

export async function getGeoSignupData(): Promise<GeoDataPoint[]> {
  const rows = await db
    .select({
      country: schema.waitlistEntries.signupCountry,
      city: schema.waitlistEntries.signupCity,
      count: sql<number>`count(*)::int`,
      latitude: sql<number>`avg(${schema.waitlistEntries.latitude})::float`,
      longitude: sql<number>`avg(${schema.waitlistEntries.longitude})::float`,
    })
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.banned, false))
    .groupBy(schema.waitlistEntries.signupCountry, schema.waitlistEntries.signupCity)
    .orderBy(desc(sql`count(*)`));

  return rows.map((r) => ({
    country: r.country,
    city: r.city,
    count: r.count,
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

// ============================================================================
// 5. Referral chain (tree visualization)
// ============================================================================

export type ReferralNode = {
  id: string;
  email: string;
  fullName: string | null;
  referralCode: string;
  referralCount: number;
  tier: string;
  depth: number;
  children: ReferralNode[];
};

/** Fetch the referral tree for a given entry (up to 3 levels deep). */
export async function getReferralChain(
  rootEntryId: string,
  maxDepth = 3,
): Promise<ReferralNode | null> {
  const [root] = await db
    .select({
      id: schema.waitlistEntries.id,
      email: schema.waitlistEntries.email,
      fullName: schema.waitlistEntries.fullName,
      referralCode: schema.waitlistEntries.referralCode,
      referralCount: schema.waitlistEntries.referralCount,
      tier: schema.waitlistEntries.tier,
    })
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.id, rootEntryId))
    .limit(1);

  if (!root) return null;

  async function fetchChildren(parentId: string, depth: number): Promise<ReferralNode[]> {
    if (depth >= maxDepth) return [];

    const children = await db
      .select({
        id: schema.waitlistEntries.id,
        email: schema.waitlistEntries.email,
        fullName: schema.waitlistEntries.fullName,
        referralCode: schema.waitlistEntries.referralCode,
        referralCount: schema.waitlistEntries.referralCount,
        tier: schema.waitlistEntries.tier,
      })
      .from(schema.waitlistEntries)
      .where(eq(schema.waitlistEntries.referredByEntryId, parentId))
      .orderBy(desc(schema.waitlistEntries.referralCount));

    return Promise.all(
      children.map(async (child) => ({
        ...child,
        depth,
        children: await fetchChildren(child.id, depth + 1),
      })),
    );
  }

  return {
    ...root,
    depth: 0,
    children: await fetchChildren(root.id, 1),
  };
}

// ============================================================================
// 6. Promo codes
// ============================================================================

export type PromoCodeValidation = {
  valid: boolean;
  error?: string;
  tier?: "free" | "pro" | "founder";
};

export async function validatePromoCode(code: string): Promise<PromoCodeValidation> {
  const normalized = code.trim().toUpperCase();

  const [promo] = await db
    .select()
    .from(schema.promoCodes)
    .where(eq(schema.promoCodes.code, normalized))
    .limit(1);

  if (!promo) {
    return { valid: false, error: "Invalid promo code" };
  }

  if (promo.expiresAt && promo.expiresAt < new Date()) {
    return { valid: false, error: "This promo code has expired" };
  }

  if (promo.maxUses !== null && promo.usesCount >= promo.maxUses) {
    return { valid: false, error: "This promo code has reached its usage limit" };
  }

  return { valid: true, tier: promo.tier as "free" | "pro" | "founder" };
}

/** Increment promo code usage count. */
export async function incrementPromoCodeUsage(code: string): Promise<void> {
  const normalized = code.trim().toUpperCase();
  await db
    .update(schema.promoCodes)
    .set({ usesCount: sql`${schema.promoCodes.usesCount} + 1` })
    .where(eq(schema.promoCodes.code, normalized));
}

// ============================================================================
// 7. Conversion funnel analytics
// ============================================================================

export type FunnelData = {
  visits: number;          // total referral link visits
  signups: number;         // total waitlist entries
  referrals: number;       // entries that came via referral
  upgraded: number;        // entries on pro/founder tier
  conversionRate: number;  // signups / visits
  referralRate: number;    // referrals / signups
  upgradeRate: number;     // upgraded / signups
};

export async function getFunnelData(): Promise<FunnelData> {
  const [row] = await db
    .select({
      visits: sql<number>`coalesce(sum(${schema.waitlistEntries.visits}), 0)::int`,
      signups: sql<number>`count(*)::int`,
      referrals: sql<number>`count(*) filter (where ${schema.waitlistEntries.referredByEntryId} is not null)::int`,
      upgraded: sql<number>`count(*) filter (where ${schema.waitlistEntries.tier} in ('pro', 'founder'))::int`,
    })
    .from(schema.waitlistEntries);

  const visits = row?.visits ?? 0;
  const signups = row?.signups ?? 0;
  const referrals = row?.referrals ?? 0;
  const upgraded = row?.upgraded ?? 0;

  return {
    visits,
    signups,
    referrals,
    upgraded,
    conversionRate: visits > 0 ? Math.round((signups / visits) * 100) : 0,
    referralRate: signups > 0 ? Math.round((referrals / signups) * 100) : 0,
    upgradeRate: signups > 0 ? Math.round((upgraded / signups) * 100) : 0,
  };
}

// ============================================================================
// 8. Webhook configs
// ============================================================================

export async function getActiveWebhooksForEvent(
  event: string,
): Promise<Array<{ url: string; platform: string; name: string }>> {
  const rows = await db
    .select()
    .from(schema.webhookConfigs)
    .where(eq(schema.webhookConfigs.isActive, true));

  return rows
    .filter((w) => w.events.includes(event))
    .map((w) => ({ url: w.url, platform: w.platform, name: w.name }));
}

// ============================================================================
// 10. Position history
// ============================================================================

export type PositionHistoryPoint = {
  position: number;
  referralCount: number;
  tier: string;
  recordedAt: Date;
};

export async function getPositionHistory(
  entryId: string,
  days = 30,
): Promise<PositionHistoryPoint[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      position: schema.positionHistory.position,
      referralCount: schema.positionHistory.referralCount,
      tier: schema.positionHistory.tier,
      recordedAt: schema.positionHistory.recordedAt,
    })
    .from(schema.positionHistory)
    .where(
      and(
        eq(schema.positionHistory.entryId, entryId),
        gte(schema.positionHistory.recordedAt, since),
      ),
    )
    .orderBy(asc(schema.positionHistory.recordedAt));

  return rows;
}

/** Record the current position for an entry (called periodically). */
export async function recordPositionSnapshot(entryId: string): Promise<void> {
  const [entry] = await db
    .select({
      referralCount: schema.waitlistEntries.referralCount,
      tier: schema.waitlistEntries.tier,
    })
    .from(schema.waitlistEntries)
    .where(eq(schema.waitlistEntries.id, entryId))
    .limit(1);

  if (!entry) return;

  const position = await computePosition({
    ...entry,
    createdAt: new Date(), // not used by computePosition but required by type
  } as Parameters<typeof computePosition>[0]);

  await db.insert(schema.positionHistory).values({
    entryId,
    position,
    referralCount: entry.referralCount,
    tier: entry.tier,
  });
}

// ============================================================================

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const maskedLocal = local.length <= 1 ? local : `${local[0]}${"•".repeat(3)}`;
  const [domainName, ...tldParts] = domain.split(".");
  const tld = tldParts.join(".");
  if (!domainName || !tld) return email;
  return `${maskedLocal}@${domainName[0]}•••.${tld}`;
}
