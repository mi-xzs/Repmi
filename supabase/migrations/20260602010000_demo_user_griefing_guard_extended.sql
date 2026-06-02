-- =============================================================================
-- Extend the demo-user griefing trigger to cover body-metric + target columns.
-- =============================================================================
--
-- Follow-up to 20260602000000_demo_user_griefing_guard.sql. The original
-- trigger blocked changes to identity/display fields (username,
-- is_public_profile, goal, avatar_path, cover_path). This adds:
--
--   - weight_kg, height_cm  — body metrics; visible on the demo profile and
--                             affect what the next recruiter sees
--   - weekly_target         — drives the leaderboard math + weekly XP target
--                             pill on the home screen
--   - age                   — visible on the profile card
--
-- Idempotent: CREATE OR REPLACE on the trigger function; the trigger itself
-- doesn't need to be re-created because it still references the same
-- function name. Safe to re-run.

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

  -- NEW in this migration: body-metric + target griefing.
  if NEW.weight_kg is distinct from OLD.weight_kg then
    raise exception 'demo_mode: the demo weight cannot be changed';
  end if;
  if NEW.height_cm is distinct from OLD.height_cm then
    raise exception 'demo_mode: the demo height cannot be changed';
  end if;
  if NEW.weekly_target is distinct from OLD.weekly_target then
    raise exception 'demo_mode: the demo weekly target cannot be changed';
  end if;
  if NEW.age is distinct from OLD.age then
    raise exception 'demo_mode: the demo age cannot be changed';
  end if;
  -- avatar_url / cover_url are short-lived signed URLs re-minted on every
  -- read, so we DON'T block them — the seed/refresh path needs to rewrite
  -- them periodically. The underlying file path is locked above.

  return NEW;
end;
$$;
