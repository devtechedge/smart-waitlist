-- ============================================================================
-- Smart Waitlist — Migration 0003: 10 Complex Features (v5)
-- ============================================================================
-- Adds tables/columns for:
--   1. Launch countdown config (settings table)
--   2. Position history tracking
--   3. Milestone rewards
--   4. VIP promo codes
--   5. Webhook integrations (Slack/Discord)
--   6. Signup geography (country/city on waitlist_entries)
--
-- Safe to run on an existing database — all additive + idempotent policies.
-- ============================================================================

-- 1. Add geography columns to waitlist_entries -------------------------------
alter table public.waitlist_entries
  add column if not exists country text;
alter table public.waitlist_entries
  add column if not exists city text;
alter table public.waitlist_entries
  add column if not exists latitude double precision;
alter table public.waitlist_entries
  add column if not exists longitude double precision;

create index if not exists waitlist_entries_country_idx
  on public.waitlist_entries (country);

-- 2. Position history table (tracks position changes over time) --------------
create table if not exists public.position_history (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references public.waitlist_entries(id) on delete cascade,
  position    integer not null,
  referral_count integer not null,
  tier        waitlist_tier not null default 'free',
  recorded_at timestamptz not null default now()
);

create index if not exists position_history_entry_id_idx
  on public.position_history (entry_id);
create index if not exists position_history_recorded_at_idx
  on public.position_history (recorded_at);

alter table public.position_history enable row level security;

drop policy if exists "Users can read own position history" on public.position_history;
create policy "Users can read own position history"
  on public.position_history for select
  using (exists (
    select 1 from public.waitlist_entries
    where waitlist_entries.id = position_history.entry_id
    and waitlist_entries.user_id = auth.uid()
  ));

-- 3. Milestone rewards table -------------------------------------------------
create table if not exists public.milestones (
  id              uuid primary key default gen_random_uuid(),
  threshold       integer not null unique,  -- referral count needed
  title           text not null,
  description     text not null,
  perk            text not null,             -- e.g. "early-access", "badge", "discount"
  badge_icon      text,                      -- lucide icon name
  created_at      timestamptz not null default now()
);

-- Seed default milestones
insert into public.milestones (threshold, title, description, perk, badge_icon)
values
  (1,  'First Referral',     'You got your first referral!', 'bronze-badge', 'Sprout'),
  (5,  'Getting Social',     '5 referrals — you are building momentum!', 'silver-badge', 'Users'),
  (10, 'Connector',          '10 referrals — you are a connector!', 'gold-badge', 'Network'),
  (25, 'Influencer',         '25 referrals — influencer status unlocked!', 'platinum-badge', 'Sparkles'),
  (50, 'Viral Sensation',    '50 referrals — you are going viral!', 'diamond-badge', 'TrendingUp'),
  (100,'Legend',             '100 referrals — legendary status!', 'founder-badge', 'Crown')
on conflict (threshold) do nothing;

-- Track which milestones each user has unlocked
create table if not exists public.user_milestones (
  id           uuid primary key default gen_random_uuid(),
  entry_id     uuid not null references public.waitlist_entries(id) on delete cascade,
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  unlocked_at  timestamptz not null default now(),
  unique(entry_id, milestone_id)
);

create index if not exists user_milestones_entry_id_idx on public.user_milestones (entry_id);

alter table public.user_milestones enable row level security;

drop policy if exists "Users can read own milestones" on public.user_milestones;
create policy "Users can read own milestones"
  on public.user_milestones for select
  using (exists (
    select 1 from public.waitlist_entries
    where waitlist_entries.id = user_milestones.entry_id
    and waitlist_entries.user_id = auth.uid()
  ));

-- 4. VIP Promo codes table ---------------------------------------------------
create table if not exists public.promo_codes (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  tier            waitlist_tier not null default 'pro',
  max_uses        integer,                   -- null = unlimited
  uses_count      integer not null default 0,
  expires_at      timestamptz,
  created_by      text not null,             -- admin email
  created_at      timestamptz not null default now(),
  note            text
);

create index if not exists promo_codes_code_idx on public.promo_codes (code);

alter table public.promo_codes enable row level security;
-- Only admins (service-role) can read/create promo codes.

-- 5. Webhook integrations (Slack/Discord) ------------------------------------
create table if not exists public.webhook_configs (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  url          text not null,
  platform     text not null default 'slack',  -- 'slack' or 'discord'
  events       text[] not null default '{}',   -- e.g. ['signup','milestone','upgrade']
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table public.webhook_configs enable row level security;

-- 6. App settings (launch date, etc.) ----------------------------------------
create table if not exists public.app_settings (
  id          integer primary key default 1,
  launch_date timestamptz,
  launch_mode text not null default 'waitlist',  -- 'waitlist' | 'launched'
  updated_at  timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- Done. Verify:
-- select * from public.milestones;
-- select * from public.app_settings;
