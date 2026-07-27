-- ============================================================================
-- Smart Waitlist & Referral Engine — Canonical Supabase Schema
-- ============================================================================
-- This is the authoritative SQL schema. It mirrors the Drizzle ORM schema
-- in `src/db/schema.ts` and adds the pieces Drizzle can't manage:
--   - The `profiles` table trigger (auto-creates a profile on auth.users INSERT)
--   - Row-Level Security (RLS) policies
--   - The `updated_at` trigger function
--
-- How to apply:
--   Option A (recommended): Run `npm run db:push` — Drizzle Kit pushes the
--   table/enum structure directly. Then run JUST the RLS + trigger blocks
--   below (sections "Row Level Security" and "Triggers") via the Supabase
--   SQL Editor.
--
--   Option B (manual): Paste this entire file into the Supabase SQL Editor
--   and run it. This creates everything from scratch. Safe to re-run
--   (uses `if not exists` / `or replace` / `drop ... if exists`).
--
-- After applying, set these env vars in `.env.local` (see .env.example):
--   - NEXT_PUBLIC_SUPABASE_URL
--   - NEXT_PUBLIC_SUPABASE_ANON_KEY
--   - SUPABASE_SERVICE_ROLE_KEY
--   - DATABASE_URL
-- ============================================================================

-- Extensions -----------------------------------------------------------------
create extension if not exists "pgcrypto";

-- Enums ----------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'waitlist_status'
  ) then
    create type waitlist_status as enum ('pending', 'invited', 'activated');
  end if;
end $$;

-- ============================================================================
-- Tables
-- ============================================================================

-- profiles -------------------------------------------------------------------
-- One row per Supabase Auth user. Auto-created by the trigger below.
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null unique,
  full_name    text,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists profiles_email_idx    on public.profiles (email);
create index if not exists profiles_is_admin_idx on public.profiles (is_admin);

-- waitlist_entries -----------------------------------------------------------
-- The core waitlist record. `user_id` is nullable so anonymous visitors can
-- join by email and later "claim" their entry when they sign up.
--
-- Position is NOT a column — it's computed dynamically using the ranking:
--   ORDER BY referral_count DESC, created_at ASC
-- See `src/lib/queries/waitlist.ts → computePosition`.
create table if not exists public.waitlist_entries (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references public.profiles(id) on delete set null,
  email                 text not null unique,
  full_name             text,
  referral_code         text not null unique,
  referred_by_entry_id  uuid references public.waitlist_entries(id) on delete set null,
  referral_count        integer not null default 0,
  visits                integer not null default 0,
  status                waitlist_status not null default 'pending',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists waitlist_entries_user_id_idx
  on public.waitlist_entries (user_id);
create index if not exists waitlist_entries_referred_by_idx
  on public.waitlist_entries (referred_by_entry_id);
-- Composite index optimizes the position-ranking query:
--   ORDER BY referral_count DESC, created_at ASC
create index if not exists waitlist_entries_ranking_idx
  on public.waitlist_entries (referral_count, created_at);
create unique index if not exists waitlist_entries_referral_code_idx
  on public.waitlist_entries (referral_code);

-- ============================================================================
-- Triggers
-- ============================================================================

-- updated_at trigger function (reusable) ------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Drop + recreate so re-running this script (and Supabase Preview) is safe.
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists waitlist_entries_set_updated_at on public.waitlist_entries;
create trigger waitlist_entries_set_updated_at
  before update on public.waitlist_entries
  for each row execute function public.set_updated_at();

-- Auto-create a profile when a new auth.users row is inserted ---------------
-- This fires on every Supabase Auth signup. It creates a matching `profiles`
-- row so the app can look up user metadata without hitting the Supabase
-- Auth API on every request.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Drop + recreate the trigger so re-running this script is safe.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row Level Security
-- ============================================================================
-- Enable RLS on both tables. By default, RLS DENIES all access — the
-- policies below open up only what's needed.
--
-- Admin operations (listing all entries, CSV export) use the service-role
-- key from Server Actions, which bypasses RLS entirely. The `ADMIN_EMAILS`
-- env var gates which authenticated users may invoke those actions.
-- ============================================================================

alter table public.profiles          enable row level security;
alter table public.waitlist_entries  enable row level security;

-- profiles policies ----------------------------------------------------------
-- A user can read + update only their own profile. Inserts are handled by
-- the `handle_new_user` trigger (security definer), so no INSERT policy
-- is needed for end users.
drop policy if exists "Profiles are readable by owner" on public.profiles;
create policy "Profiles are readable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id);

-- waitlist_entries policies --------------------------------------------------
-- 1. Anyone can INSERT their own entry (signup). The `user_id` must match
--    the authenticated user, OR be null (anonymous email-only signup).
-- 2. A user can SELECT only their own entry.
-- 3. A user can UPDATE only their own entry (e.g. claim an anonymous entry
--    by setting user_id after signup).
-- 4. No DELETE policy — deletions happen only via service-role (admin).

drop policy if exists "Anyone can insert a waitlist entry" on public.waitlist_entries;
create policy "Anyone can insert a waitlist entry"
  on public.waitlist_entries for insert
  with check (
    user_id is null
    or user_id = auth.uid()
  );

drop policy if exists "Users can read own waitlist entry" on public.waitlist_entries;
create policy "Users can read own waitlist entry"
  on public.waitlist_entries for select
  using (user_id = auth.uid());

drop policy if exists "Users can update own waitlist entry" on public.waitlist_entries;
create policy "Users can update own waitlist entry"
  on public.waitlist_entries for update
  using (user_id = auth.uid() or user_id is null);

-- ============================================================================
-- Done.
-- ============================================================================
-- Verify with:
--   select * from pg_policies where schemaname = 'public';
--   select * from pg_tables where schemaname = 'public';
-- ============================================================================
