-- ============================================================================
-- Smart Waitlist — Migration 0001: Tier System + Custom Referral Codes
-- ============================================================================
-- Adds:
--   1. `waitlist_tier` enum (free, pro, founder)
--   2. `tier` column to waitlist_entries (default 'free')
--   3. `has_custom_code` column to track user-customized referral codes
--   4. Updated ranking index to include tier
--
-- Safe to run on an existing database — all changes are additive.
-- Run this AFTER 0000_initial.sql.
-- ============================================================================

-- 1. Add the tier enum ------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'waitlist_tier') then
    create type waitlist_tier as enum ('free', 'pro', 'founder');
  end if;
end $$;

-- 2. Add tier column (default 'free' for existing rows) ---------------------
alter table public.waitlist_entries
  add column if not exists tier waitlist_tier not null default 'free';

-- 3. Add has_custom_code column (default false) -----------------------------
alter table public.waitlist_entries
  add column if not exists has_custom_code boolean not null default false;

-- 4. Drop the old ranking index + create a new one that includes tier ------
--    Old: (referral_count, created_at)
--    New: (tier, referral_count, created_at) — matches the new ranking rule
drop index if exists waitlist_entries_ranking_idx;
create index if not exists waitlist_entries_ranking_idx
  on public.waitlist_entries (tier, referral_count, created_at);

-- 5. Add an index on tier alone (for admin tier filtering) ------------------
create index if not exists waitlist_entries_tier_idx
  on public.waitlist_entries (tier);

-- 6. Update the RLS INSERT policy to allow setting tier at insert -----------
--    (Existing policy already allows any column values; no change needed.
--    The service-role client bypasses RLS for tier upgrades anyway.)

-- Done. Verify:
--   select tier, count(*) from public.waitlist_entries group by tier;
