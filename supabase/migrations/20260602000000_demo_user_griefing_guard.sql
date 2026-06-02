-- =============================================================================
-- Server-side demo-account griefing guards.
-- =============================================================================
--
-- Backstop for the client-side `useDemoGuard()` checks in:
--   - LoginScreen / SettingsScreen (privacy, username, password, MFA)
--   - UserProfileScreen (follow / block / report)
--   - AchievementsScreen (AddFriendModal follow toggle)
--
-- The client guard catches the casual visitor. This migration catches the
-- DELIBERATE attacker who opens DevTools, removes the guard, and tries to:
--   1. Spam follow requests at real users from the shared demo account
--   2. Block real users from the demo account (polluting their block table)
--   3. File fake reports against real users (creates real moderation work)
--   4. Permanently rename the demo handle (server-side 30-day rate-limit
--      means one bad actor can lock it for a month)
--   5. Flip the demo profile to private (hides it from search/leaderboard,
--      defeats the "fully populated" pitch for every future recruiter)
--   6. Change the demo goal / avatar_path / cover_path to grief the visuals
--
-- WHAT THIS MIGRATION CAN'T FIX
-- -----------------------------
-- MFA enrolment and password changes hit GoTrue (the Supabase auth service),
-- not PostgREST. RLS cannot reach those endpoints, so the client guard in
-- SettingsScreen is the only line of defence for:
--   - `supabase.auth.mfa.enroll(...)`     — locking the demo with TOTP
--   - `supabase.auth.resetPasswordForEmail(...)` — triggering reset emails
--   - `supabase.auth.updateUser({ password })`  — changing demo password
-- Closing those properly requires either an Auth Hook (Supabase Pro+) or a
-- scheduled job that periodically un-enrols MFA from the demo account.
-- Documented in SECURITY_MANUAL_STEPS.md for follow-up.
--
-- Migration is idempotent (DROP POLICY IF EXISTS / CREATE OR REPLACE) and
-- safe to re-run.
--
-- Apply via: supabase db push, or paste into the Supabase SQL Editor.

-- =============================================================================
-- 1. is_demo_user(uuid) — central truth source for the demo identity
-- =============================================================================
--
-- SECURITY DEFINER so it can read `auth.users.email` regardless of caller
-- privileges. STABLE because the result is invariant within a single
-- transaction (a user's email doesn't change mid-statement). Returns false
-- on NULL input or unknown uid (defaults to "treat as not demo" — fail-open
-- for this helper because the policies AND-in the negative; a missing user
-- already fails the ownership check upstream).
--
-- ⚠️  IF YOU CHANGE THE DEMO EMAIL  ⚠️
-- Update the literal below to match `EXPO_PUBLIC_DEMO_EMAIL` in `.env`
-- and on Vercel. Otherwise the guard quietly stops applying.

create or replace function public.is_demo_user(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select lower(email) = lower('demo.2ty7503i@repmi.test')
       from auth.users
      where id = uid),
    false
  );
$$;

revoke all on function public.is_demo_user(uuid) from public;
grant execute on function public.is_demo_user(uuid) to authenticated;
grant execute on function public.is_demo_user(uuid) to anon;

-- =============================================================================
-- 2. follows — block demo from creating follow edges
-- =============================================================================
--
-- The existing `follows_insert_self` policy (added in 20260528100000) already
-- requires `auth.uid() = follower_id` and that neither party has blocked the
-- other. We tighten it with one more clause: the demo account cannot insert
-- ANY follow edge. This prevents the attack of "demo follows every real user
-- on the platform" / spamming follow REQUESTS at private accounts.
--
-- Demo can still RECEIVE follows from real accounts (which it gets via the
-- seed script's fake leaderboard users) — only the demo-as-follower path is
-- blocked.

drop policy if exists follows_insert_self on public.follows;
create policy follows_insert_self on public.follows
  for insert
  with check (
    auth.uid() = follower_id
    -- Block griefing from the shared demo account.
    and not public.is_demo_user(auth.uid())
    -- Existing block-check (preserved from 20260528100000).
    and not exists (
      select 1 from public.blocks b
       where (b.blocker_id = follows.following_id and b.blocked_id = follows.follower_id)
          or (b.blocker_id = follows.follower_id  and b.blocked_id = follows.following_id)
    )
  );

-- =============================================================================
-- 3. blocks — block demo from blocking real users
-- =============================================================================
--
-- A demo visitor blocking real users pollutes shared state (the demo's block
-- list affects every future visitor's search results / follow filters). The
-- demo doesn't need to block anyone; if the seed users misbehave that's a
-- seed-data fix.

drop policy if exists blocks_insert_self on public.blocks;
create policy blocks_insert_self on public.blocks
  for insert
  with check (
    auth.uid() = blocker_id
    and not public.is_demo_user(auth.uid())
  );

-- =============================================================================
-- 4. reports — block demo from filing reports
-- =============================================================================
--
-- A bad actor filing fake reports against real users from the demo account
-- creates real moderation work and (if reports ever trigger automated action,
-- e.g. shadow-bans on N reports) could be weaponised. Demo has no legitimate
-- reason to report anyone.

drop policy if exists reports_insert_self on public.reports;
create policy reports_insert_self on public.reports
  for insert
  with check (
    auth.uid() = reporter_id
    and not public.is_demo_user(auth.uid())
  );

-- =============================================================================
-- 5. profiles — block demo from griefing its own profile cosmetics
-- =============================================================================
--
-- The demo account's profile is shared display state. A visitor renaming it
-- to `xxhackerxx`, flipping it to private, or wiping the avatar would degrade
-- the experience for every future recruiter. The 30-day server-side username
-- rate-limit (trigger `enforce_username_change_window` from 20260528200000)
-- means a rename would stick for a MONTH.
--
-- A trigger is cleaner than a policy here because we want to block writes to
-- SPECIFIC COLUMNS only (XP / streak / weekly_xp cache writes from the normal
-- session-save path must still succeed — those are the whole point of the
-- demo). The trigger raises a friendly error so a tampered client surfaces
-- the same "demo mode" copy the UI shows.

create or replace function public.profiles_block_demo_griefing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_demo_user(auth.uid()) then
    return NEW;
  end if;

  -- Demo account — reject writes to any column that affects the shared
  -- demo experience. Other columns (XP, streak, last_workout_at, etc.)
  -- pass through normally so the demo still earns XP / updates streaks
  -- as visitors complete sessions during their tour.
  if NEW.username is distinct from OLD.username then
    raise exception 'demo_mode: the demo account cannot be renamed';
  end if;
  if NEW.is_public_profile is distinct from OLD.is_public_profile then
    raise exception 'demo_mode: the demo profile visibility cannot be changed';
  end if;
  if NEW.goal is distinct from OLD.goal then
    raise exception 'demo_mode: the demo goal cannot be changed';
  end if;
  if NEW.avatar_path is distinct from OLD.avatar_path then
    raise exception 'demo_mode: the demo avatar cannot be changed';
  end if;
  if NEW.cover_path is distinct from OLD.cover_path then
    raise exception 'demo_mode: the demo cover cannot be changed';
  end if;
  -- avatar_url / cover_url get rewritten on every signed-URL mint, so we
  -- DON'T block them — blocking would break the seed script's avatar
  -- refresh path. The actual underlying file is path-protected above.

  return NEW;
end;
$$;

drop trigger if exists profiles_block_demo_griefing_trg on public.profiles;
create trigger profiles_block_demo_griefing_trg
  before update on public.profiles
  for each row execute function public.profiles_block_demo_griefing();

-- =============================================================================
-- 6. Smoke-test (read-only — safe to run after migration)
-- =============================================================================
--
-- Paste the block below into the SQL editor while signed in AS THE DEMO USER
-- (via supabase impersonation) to verify each guard fires. Each statement
-- should error with a `demo_mode:` or RLS rejection — no row should change.
--
--   insert into public.follows (follower_id, following_id) values
--     (auth.uid(), '<some-real-user-uuid>'); -- expect: RLS rejection
--   insert into public.blocks (blocker_id, blocked_id) values
--     (auth.uid(), '<some-real-user-uuid>'); -- expect: RLS rejection
--   insert into public.reports (reporter_id, reported_user_id, reason) values
--     (auth.uid(), '<some-real-user-uuid>', 'spam'); -- expect: RLS rejection
--   update public.profiles set username = 'xxhackerxx' where id = auth.uid();
--     -- expect: demo_mode: the demo account cannot be renamed
--   update public.profiles set is_public_profile = false where id = auth.uid();
--     -- expect: demo_mode: the demo profile visibility cannot be changed
--
-- And as a NORMAL user, all of the above should still work (insert your own
-- test follow / block / report; rename your own profile).
