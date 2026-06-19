-- ============================================================================
-- Smart Waitlist — Migration 0002: Complex Features (v3)
-- ============================================================================
-- Adds columns + tables for:
--   1. Anti-Fraud system (signup_ip, fingerprint, fraud_score, flagged)
--   2. Admin CRUD (banned, ban_reason)
--   3. Stripe Payments (stripe_customer_id, stripe_subscription_id)
--   4. Admin audit log (new table)
--
-- Safe to run on an existing database — all changes are additive.
-- Run this AFTER 0000_initial.sql AND 0001_tier_system.sql.
-- ============================================================================

-- 1. Anti-Fraud columns ------------------------------------------------------
alter table public.waitlist_entries
  add column if not exists signup_ip text;
alter table public.waitlist_entries
  add column if not exists fingerprint text;
alter table public.waitlist_entries
  add column if not exists fraud_score integer not null default 0;
alter table public.waitlist_entries
  add column if not exists flagged boolean not null default false;

-- 2. Admin columns -----------------------------------------------------------
alter table public.waitlist_entries
  add column if not exists banned boolean not null default false;
alter table public.waitlist_entries
  add column if not exists ban_reason text;

-- 3. Stripe columns ----------------------------------------------------------
alter table public.waitlist_entries
  add column if not exists stripe_customer_id text;
alter table public.waitlist_entries
  add column if not exists stripe_subscription_id text;

-- 4. Indexes for new columns -------------------------------------------------
create index if not exists waitlist_entries_signup_ip_idx
  on public.waitlist_entries (signup_ip);
create index if not exists waitlist_entries_fingerprint_idx
  on public.waitlist_entries (fingerprint);
create index if not exists waitlist_entries_flagged_idx
  on public.waitlist_entries (flagged);
create index if not exists waitlist_entries_banned_idx
  on public.waitlist_entries (banned);
create index if not exists waitlist_entries_stripe_customer_idx
  on public.waitlist_entries (stripe_customer_id);

-- 5. Admin audit log table ---------------------------------------------------
create table if not exists public.admin_audit_log (
  id                uuid primary key default gen_random_uuid(),
  admin_email       text not null,
  action            text not null,
  target_entry_id   uuid,
  target_email      text,
  old_value         text,
  new_value         text,
  note              text,
  created_at        timestamptz not null default now()
);

create index if not exists admin_audit_log_admin_email_idx
  on public.admin_audit_log (admin_email);
create index if not exists admin_audit_log_target_entry_idx
  on public.admin_audit_log (target_entry_id);
create index if not exists admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at);

-- Enable RLS on audit log — only admins (service-role) can read/write.
alter table public.admin_audit_log enable row level security;

-- No policies = no access via anon/authenticated keys.
-- All access goes through the service-role client (bypasses RLS).

-- Done. Verify:
--   select column_name from information_schema.columns
--   where table_name = 'waitlist_entries' order by ordinal_position;
--   select count(*) from public.admin_audit_log;
