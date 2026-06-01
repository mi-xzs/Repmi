-- =============================================================================
-- Enable Row Level Security on every user-owned table + add baseline policies.
-- =============================================================================
--
-- SECURITY OVERVIEW
-- -----------------
-- Until this migration the anon-key holder (i.e. any installed copy of the
-- mobile app) could SELECT / INSERT / UPDATE / DELETE any row in any table
-- via PostgREST. That meant a tampered or third-party client could:
--
--   - read every user's workouts, sessions, RPE entries, and settings
--   - overwrite another user's profile XP / streak cache (mass-assignment)
--   - create or delete follow relationships on someone else's behalf (IDOR)
--   - mint shared_workouts rows with a forged `shared_by` username
--
-- This migration enables RLS on every app table and adds the minimal
-- ownership policies needed to constrain those mutations to `auth.uid()`.
-- Public-read columns (profiles, follows, shared_workouts) get an explicit
-- SELECT policy so the existing read paths continue to function.
--
-- Policy convention:
--   - `<table>_select_*` — read policies
--   - `<table>_insert_self` — INSERT WITH CHECK (auth.uid() = <owner_col>)
--   - `<table>_update_self` — UPDATE USING + WITH CHECK same
--   - `<table>_delete_self` — DELETE USING same
--
-- Apply via: supabase db push, or paste into the Supabase SQL Editor.
-- The migration is intentionally idempotent — every CREATE POLICY is
-- preceded by a DROP POLICY IF EXISTS so it can be re-run safely after
-- edits.

-- =============================================================================
-- 1. profiles
-- =============================================================================

alter table public.profiles enable row level security;

-- Add an `is_public_profile` consent flag if it doesn't already exist.
-- Default = true so existing users don't suddenly disappear from search /
-- leaderboards mid-release. NOTE: once the consent UI ships (Settings →
-- Privacy → "Public profile"), the default should be flipped to FALSE
-- for new sign-ups so we're opt-in rather than opt-out.
alter table public.profiles
  add column if not exists is_public_profile boolean not null default true;

drop policy if exists profiles_select_public  on public.profiles;
drop policy if exists profiles_insert_self    on public.profiles;
drop policy if exists profiles_update_self    on public.profiles;
drop policy if exists profiles_delete_self    on public.profiles;

-- SELECT: anyone signed in can read profiles that are flagged public,
-- OR your own profile regardless of the flag.
create policy profiles_select_public on public.profiles
  for select
  using (
    is_public_profile = true
    or auth.uid() = id
  );

-- INSERT: a user can only create their OWN profile row. (Sign-up flow
-- creates a row with id = auth.uid().)
create policy profiles_insert_self on public.profiles
  for insert
  with check (auth.uid() = id);

-- UPDATE: a user can only update their own profile row. This is what
-- closes the mass-assignment hole on total_xp / weekly_xp / streak
-- columns — even though those columns are still client-writable in
-- principle, RLS now scopes the write to `WHERE auth.uid() = id`, so
-- a client can only ever lie about its OWN cache.
create policy profiles_update_self on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy profiles_delete_self on public.profiles
  for delete
  using (auth.uid() = id);

-- =============================================================================
-- 2. follows
-- =============================================================================

alter table public.follows enable row level security;

drop policy if exists follows_select_all     on public.follows;
drop policy if exists follows_insert_self    on public.follows;
drop policy if exists follows_delete_self    on public.follows;

-- SELECT: follow graph is public. The follow-list modal renders both
-- directions and the leaderboard needs to enumerate who you follow.
create policy follows_select_all on public.follows
  for select
  using (true);

-- INSERT: you can only insert a follow with YOURSELF as the follower.
-- Closes the IDOR (previously any signed-in client could insert
-- arbitrary `follower_id` values).
create policy follows_insert_self on public.follows
  for insert
  with check (auth.uid() = follower_id);

-- DELETE: same — you can only delete follow rows where you're the
-- follower. Lets users unfollow their own follows but prevents
-- griefing someone else's follow graph.
create policy follows_delete_self on public.follows
  for delete
  using (auth.uid() = follower_id);

-- No UPDATE policy — follows are immutable; rows are created or deleted
-- but never edited. The absence of a policy means UPDATE is denied.

-- =============================================================================
-- 3. shared_workouts
-- =============================================================================
--
-- Adds expires_at + revoked_at + user_id (uuid FK) columns. The old
-- string `shared_by` column is KEPT for one release so already-published
-- links keep resolving; new code writes `user_id` going forward.

alter table public.shared_workouts enable row level security;

alter table public.shared_workouts
  add column if not exists expires_at timestamptz not null default (now() + interval '30 days');

alter table public.shared_workouts
  add column if not exists revoked_at timestamptz;

alter table public.shared_workouts
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Backfill `user_id` from `profiles.username -> profiles.id` for existing
-- rows. Best-effort: rows whose creator renamed or deleted their profile
-- between share creation and now will have `user_id IS NULL`; they remain
-- readable (the SELECT policy allows that) but un-revocable. Acceptable
-- for one release; the legacy `shared_by` column will be dropped in a
-- follow-up once telemetry confirms all live shares have `user_id` set.
update public.shared_workouts s
   set user_id = p.id
  from public.profiles p
 where s.user_id is null
   and s.shared_by is not null
   and s.shared_by = p.username;

drop policy if exists shared_workouts_select_active   on public.shared_workouts;
drop policy if exists shared_workouts_insert_self     on public.shared_workouts;
drop policy if exists shared_workouts_update_owner    on public.shared_workouts;
drop policy if exists shared_workouts_delete_owner    on public.shared_workouts;

-- SELECT: a share row is readable while it's neither expired nor
-- revoked. Public-by-design — knowledge of the UUID is the access
-- token. (UUIDv4 is sufficiently unguessable; if abuse is observed
-- the follow-up is to migrate to opaque short-codes + a rate limit.)
create policy shared_workouts_select_active on public.shared_workouts
  for select
  using (
    expires_at > now()
    and revoked_at is null
  );

-- INSERT: any signed-in user can create a share, but `user_id` must
-- equal their own auth uid (or be NULL for back-compat with the legacy
-- client that doesn't stamp it yet — the new client always stamps it).
create policy shared_workouts_insert_self on public.shared_workouts
  for insert
  with check (
    user_id is null
    or auth.uid() = user_id
  );

-- UPDATE: only the creator can update (i.e. revoke) the share. This is
-- what gates `revokeShareLink(id)` in sharingService.ts — the client
-- merely issues an UPDATE setting revoked_at, RLS enforces ownership.
create policy shared_workouts_update_owner on public.shared_workouts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy shared_workouts_delete_owner on public.shared_workouts
  for delete
  using (auth.uid() = user_id);

-- =============================================================================
-- 4. workout_sessions
-- =============================================================================

alter table public.workout_sessions enable row level security;

drop policy if exists workout_sessions_select_self  on public.workout_sessions;
drop policy if exists workout_sessions_insert_self  on public.workout_sessions;
drop policy if exists workout_sessions_update_self  on public.workout_sessions;
drop policy if exists workout_sessions_delete_self  on public.workout_sessions;

-- Private data — never readable by anyone other than the owner.
create policy workout_sessions_select_self on public.workout_sessions
  for select using (auth.uid() = user_id);

create policy workout_sessions_insert_self on public.workout_sessions
  for insert with check (auth.uid() = user_id);

create policy workout_sessions_update_self on public.workout_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy workout_sessions_delete_self on public.workout_sessions
  for delete using (auth.uid() = user_id);

-- =============================================================================
-- 5. workout_rpe
-- =============================================================================

alter table public.workout_rpe enable row level security;

drop policy if exists workout_rpe_select_self  on public.workout_rpe;
drop policy if exists workout_rpe_insert_self  on public.workout_rpe;
drop policy if exists workout_rpe_update_self  on public.workout_rpe;
drop policy if exists workout_rpe_delete_self  on public.workout_rpe;

create policy workout_rpe_select_self on public.workout_rpe
  for select using (auth.uid() = user_id);

create policy workout_rpe_insert_self on public.workout_rpe
  for insert with check (auth.uid() = user_id);

create policy workout_rpe_update_self on public.workout_rpe
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy workout_rpe_delete_self on public.workout_rpe
  for delete using (auth.uid() = user_id);

-- =============================================================================
-- 6. workouts
-- =============================================================================

alter table public.workouts enable row level security;

drop policy if exists workouts_select_self  on public.workouts;
drop policy if exists workouts_insert_self  on public.workouts;
drop policy if exists workouts_update_self  on public.workouts;
drop policy if exists workouts_delete_self  on public.workouts;

create policy workouts_select_self on public.workouts
  for select using (auth.uid() = user_id);

create policy workouts_insert_self on public.workouts
  for insert with check (auth.uid() = user_id);

create policy workouts_update_self on public.workouts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy workouts_delete_self on public.workouts
  for delete using (auth.uid() = user_id);

-- =============================================================================
-- 7. user_settings
-- =============================================================================

alter table public.user_settings enable row level security;

drop policy if exists user_settings_select_self  on public.user_settings;
drop policy if exists user_settings_insert_self  on public.user_settings;
drop policy if exists user_settings_update_self  on public.user_settings;
drop policy if exists user_settings_delete_self  on public.user_settings;

create policy user_settings_select_self on public.user_settings
  for select using (auth.uid() = user_id);

create policy user_settings_insert_self on public.user_settings
  for insert with check (auth.uid() = user_id);

create policy user_settings_update_self on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy user_settings_delete_self on public.user_settings
  for delete using (auth.uid() = user_id);
