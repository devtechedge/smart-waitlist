import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  doublePrecision,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations, type InferSelectModel, type InferInsertModel } from "drizzle-orm";

/**
 * Smart Waitlist — Drizzle Schema
 * -------------------------------
 * Two tables:
 *   - `profiles`         : auth-linked user metadata (1:1 with auth.users)
 *   - `waitlist_entries` : the waitlist itself (1:1 with profiles via user_id,
 *                          or anonymous until claimed via email match)
 *
 * Position is NOT stored as a column. It is computed dynamically using the
 * ranking rule: `referral_count DESC, created_at ASC`. This avoids the
 * transactional complexity of swap-on-referral and stays correct under
 * concurrent inserts. See `src/lib/queries/waitlist.ts → computePosition`.
 *
 * Row-Level Security is enabled at the SQL level (see README.md → Manual
 * Schema Setup). Drizzle ORM does not manage RLS policies directly; they are
 * applied via `drizzle-kit push` migrations or the SQL Editor.
 */

/**
 * Waitlist entry status lifecycle:
 *   pending → invited → activated
 *
 *   - pending   : on the waitlist, waiting for access
 *   - invited   : received an invite (admin can flip this)
 *   - activated : has signed up for the actual product
 */
export const waitlistStatus = pgEnum("waitlist_status", [
  "pending",
  "invited",
  "activated",
]);

/**
 * Early access tier: free → pro → founder.
 * Affects position ranking: founder > pro > free.
 */
export const waitlistTier = pgEnum("waitlist_tier", ["free", "pro", "founder"]);

/**
 * `profiles`
 * ----------
 * One row per Supabase Auth user. Created by a DB trigger on `auth.users`
 * INSERT (see README SQL), or manually by `claimOrCreateWaitlistEntryAction`
 * when an anonymous waitlist entry is linked to a new auth user.
 *
 * `is_admin` is a DB-level flag (alternative to the ADMIN_EMAILS env var).
 * For Phase 2 we primarily use ADMIN_EMAILS, but the column is here for
 * future use and auditability.
 */
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    email: text("email").notNull().unique(),
    fullName: text("full_name"),
    isAdmin: boolean("is_admin").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("profiles_email_idx").on(table.email),
    index("profiles_is_admin_idx").on(table.isAdmin),
  ],
);

/**
 * `waitlist_entries`
 * ------------------
 * The core waitlist record. `user_id` is nullable so that anonymous visitors
 * can join the waitlist by email and later "claim" their entry when they
 * sign up via Supabase Auth.
 *
 * Referral mechanics:
 *   - `referral_code`     : public short code embedded in shareable URL `/?ref=CODE`
 *   - `referred_by_entry_id` : self-FK to the referrer's waitlist_entries.id
 *   - `referral_count`    : how many people have joined using this user's code
 *   - `visits`            : how many times `/?ref=CODE` was visited (analytics)
 *
 * The position ranking uses `referral_count DESC, created_at ASC`, so a higher
 * referral_count means a lower (better) position number; ties are broken by
 * who signed up first.
 */
export const waitlistEntries = pgTable(
  "waitlist_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** Links to auth.users.id once the visitor signs up. Nullable for anonymous entries. */
    userId: uuid("user_id").references(() => profiles.id, { onDelete: "set null" }),

    /** Email is the natural key for matching anonymous entries to auth users. */
    email: text("email").notNull().unique(),

    /** Optional display name (collected at signup or waitlist join). */
    fullName: text("full_name"),

    /** Public 6-char base36 code, e.g. "k3f9a2". Generated server-side. */
    referralCode: text("referral_code").notNull().unique(),

    /** Self-reference: the entry whose referral code brought this user in. */
    referredByEntryId: uuid("referred_by_entry_id").references(
      (): AnyPgColumn => waitlistEntries.id,
      { onDelete: "set null" },
    ),

    /** Number of successful referrals (signed-up users who used this code). */
    referralCount: integer("referral_count").notNull().default(0),

    /** Number of `/?ref=CODE` visits (regardless of signup). Analytics only. */
    visits: integer("visits").notNull().default(0),

    status: waitlistStatus("status").notNull().default("pending"),

    /** Early access tier — affects position ranking (pro/founder get priority). */
    tier: waitlistTier("tier").notNull().default("free"),

    /** Whether the user has customized their referral code (vs auto-generated). */
    hasCustomCode: boolean("has_custom_code").notNull().default(false),

    // ── Anti-Fraud fields (Feature 4) ────────────────────────────────────
    /** IP address at signup — used for multi-account detection. */
    signupIp: text("signup_ip"),
    /** Browser fingerprint hash — detects same-device multi-accounting. */
    fingerprint: text("fingerprint"),
    /** Fraud risk score 0-100 (0 = clean, 100 = definitely fraudulent). */
    fraudScore: integer("fraud_score").notNull().default(0),
    /** Whether the entry is flagged for admin review. */
    flagged: boolean("flagged").notNull().default(false),

    // ── Admin fields (Feature 3) ─────────────────────────────────────────
    /** Soft-ban: user can't sign in or access dashboard while banned. */
    banned: boolean("banned").notNull().default(false),
    /** Reason for ban (if any). */
    banReason: text("ban_reason"),

    // ── Stripe fields (Feature 1) ────────────────────────────────────────
    /** Stripe customer ID — set after first payment. */
    stripeCustomerId: text("stripe_customer_id"),
    /** Stripe subscription ID (for recurring Pro tier). */
    stripeSubscriptionId: text("stripe_subscription_id"),

    // ── Geography (Feature 4: Heatmap) ───────────────────────────────────
    signupCountry: text("country"),
    signupCity: text("city"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("waitlist_entries_user_id_idx").on(table.userId),
    index("waitlist_entries_referred_by_idx").on(table.referredByEntryId),
    // Composite index optimizes the position-ranking query:
    //   ORDER BY tier_priority DESC, referral_count DESC, created_at ASC
    index("waitlist_entries_ranking_idx").on(
      table.tier,
      table.referralCount,
      table.createdAt,
    ),
    uniqueIndex("waitlist_entries_referral_code_idx").on(table.referralCode),
    index("waitlist_entries_tier_idx").on(table.tier),
    // Anti-fraud indexes
    index("waitlist_entries_signup_ip_idx").on(table.signupIp),
    index("waitlist_entries_fingerprint_idx").on(table.fingerprint),
    index("waitlist_entries_flagged_idx").on(table.flagged),
    index("waitlist_entries_banned_idx").on(table.banned),
    // Stripe indexes
    index("waitlist_entries_stripe_customer_idx").on(table.stripeCustomerId),
  ],
);

/**
 * `admin_audit_log`
 * -----------------
 * Records every admin action (ban, unban, tier change, delete, invite) for
 * compliance and accountability. Append-only — never updated or deleted.
 */
export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** The admin who performed the action. */
    adminEmail: text("admin_email").notNull(),
    /** The action performed. */
    action: text("action").notNull(),
    /** The target entry's ID (if applicable). */
    targetEntryId: uuid("target_entry_id"),
    /** The target entry's email (denormalized for readability). */
    targetEmail: text("target_email"),
    /** Old value (e.g. old tier) — for diff display. */
    oldValue: text("old_value"),
    /** New value (e.g. new tier). */
    newValue: text("new_value"),
    /** Optional note from the admin. */
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("admin_audit_log_admin_email_idx").on(table.adminEmail),
    index("admin_audit_log_target_entry_idx").on(table.targetEntryId),
    index("admin_audit_log_created_at_idx").on(table.createdAt),
  ],
);

/**
 * Drizzle relations — enable the query builder to traverse FKs.
 *   profile.waitlistEntry  (1:1)
 *   waitlistEntry.user     (1:1, may be null)
 *   waitlistEntry.referredBy (1:1 self, may be null)
 *   waitlistEntry.referrals  (1:N self, the inverse of referredBy)
 */
export const profilesRelations = relations(profiles, ({ one }) => ({
  waitlistEntry: one(waitlistEntries, {
    fields: [profiles.id],
    references: [waitlistEntries.userId],
  }),
}));

export const waitlistEntriesRelations = relations(waitlistEntries, ({ one, many }) => ({
  user: one(profiles, {
    fields: [waitlistEntries.userId],
    references: [profiles.id],
  }),

  referredBy: one(waitlistEntries, {
    fields: [waitlistEntries.referredByEntryId],
    references: [waitlistEntries.id],
    relationName: "waitlist_referrals",
  }),

  referrals: many(waitlistEntries, {
    relationName: "waitlist_referrals",
  }),
}));

// ============================================================================
// v5 Tables — 10 Complex Features
// ============================================================================

/** Position history — tracks position changes over time for charting. */
export const positionHistory = pgTable(
  "position_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entryId: uuid("entry_id").notNull().references(() => waitlistEntries.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    referralCount: integer("referral_count").notNull(),
    tier: waitlistTier("tier").notNull().default("free"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("position_history_entry_id_idx").on(table.entryId),
    index("position_history_recorded_at_idx").on(table.recordedAt),
  ],
);

/** Milestone definitions — e.g. "First Referral", "Connector", "Legend". */
export const milestones = pgTable(
  "milestones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threshold: integer("threshold").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    perk: text("perk").notNull(),
    badgeIcon: text("badge_icon"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

/** Tracks which milestones each user has unlocked. */
export const userMilestones = pgTable(
  "user_milestones",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entryId: uuid("entry_id").notNull().references(() => waitlistEntries.id, { onDelete: "cascade" }),
    milestoneId: uuid("milestone_id").notNull().references(() => milestones.id, { onDelete: "cascade" }),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("user_milestones_entry_id_idx").on(table.entryId),
  ],
);

/** VIP promo codes — give instant tier upgrades. */
export const promoCodes = pgTable(
  "promo_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull().unique(),
    tier: waitlistTier("tier").notNull().default("pro"),
    maxUses: integer("max_uses"),
    usesCount: integer("uses_count").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    note: text("note"),
  },
);

/** Webhook integrations (Slack/Discord). */
export const webhookConfigs = pgTable(
  "webhook_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    platform: text("platform").notNull().default("slack"),
    events: text("events").array().notNull().default([]),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

/** App settings — single-row table for launch date, mode, etc. */
export const appSettings = pgTable(
  "app_settings",
  {
    id: integer("id").primaryKey().default(1),
    launchDate: timestamp("launch_date", { withTimezone: true }),
    launchMode: text("launch_mode").notNull().default("waitlist"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

/**
 * Convenience type aliases — used by Server Actions and Server Components
 * for full type inference from the DB schema all the way to the UI.
 */
export type Profile = InferSelectModel<typeof profiles>;
export type NewProfile = InferInsertModel<typeof profiles>;

export type WaitlistEntry = InferSelectModel<typeof waitlistEntries>;
export type NewWaitlistEntry = InferInsertModel<typeof waitlistEntries>;

export type WaitlistStatus = (typeof waitlistStatus.enumValues)[number];
export type WaitlistTier = (typeof waitlistTier.enumValues)[number];

export type AdminAuditLog = InferSelectModel<typeof adminAuditLog>;
export type NewAdminAuditLog = InferInsertModel<typeof adminAuditLog>;

export type PositionHistory = InferSelectModel<typeof positionHistory>;
export type Milestone = InferSelectModel<typeof milestones>;
export type UserMilestone = InferSelectModel<typeof userMilestones>;
export type PromoCode = InferSelectModel<typeof promoCodes>;
export type WebhookConfig = InferSelectModel<typeof webhookConfigs>;
export type AppSettings = InferSelectModel<typeof appSettings>;
