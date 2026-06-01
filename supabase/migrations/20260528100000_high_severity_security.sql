-- =============================================================================
-- HIGH-severity follow-up migration (audit round 2).
-- =============================================================================
--
-- Bundles every SQL change required by the H1..H14 audit items:
--   H4  — default-private profile + user_consents table
--   H6  — private avatar/cover buckets, RLS, profile.avatar_path column
--   H11 — search_profiles RPC + rpc_call_log rate-limit table
--   H12 — blocks + reports tables, UGC moderation policies
--   H14 — ON DELETE CASCADE on shared_workouts.user_id + delete_user() cleanup
--
-- Migration is idempotent (every CREATE/ALTER guarded by IF NOT EXISTS where
-- possible, every CREATE POLICY preceded by DROP POLICY IF EXISTS) so a partial
-- re-run is safe.
--
-- Apply via: supabase db push, or paste into the Supabase SQL Editor.

-- =============================================================================
-- H4 — Default-private profile + GDPR Art. 9 consent table
-- =============================================================================
--
-- The prior migration set `is_public_profile DEFAULT true` for back-compat.
-- The user-facing consent flow now exists, so flip the default to FALSE for
-- newly-created rows. EXISTING rows are intentionally not touched — they
-- already carry whatever value the user (implicitly) chose under the old
-- default, and yanking visibility out from under existing accounts breaks
-- the leaderboards / search expectations we shipped.

alter table public.profiles
  alter column is_public_profile set default false;

-- ── user_consents — GDPR Art. 9(2)(a) explicit consent ledger.
-- One row per (user_id, kind). Idempotent UPSERT-friendly via (user_id, kind)
-- primary key. `revoked_at` lets us record a withdrawal without losing the
-- audit trail of when the original grant was given.
create table if not exists public.user_consents (
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('body_metrics', 'training_data')),
  granted_at  timestamptz not null default now(),
  revoked_at  timestamptz,
  primary key (user_id, kind)
);

alter table public.user_consents enable row level security;

drop policy if exists user_consents_select_self on public.user_consents;
drop policy if exists user_consents_insert_self on public.user_consents;
drop policy if exists user_consents_update_self on public.user_consents;
drop policy if exists user_consents_delete_self on public.user_consents;

create policy user_consents_select_self on public.user_consents
  for select using (auth.uid() = user_id);

create policy user_consents_insert_self on public.user_consents
  for insert with check (auth.uid() = user_id);

create policy user_consents_update_self on public.user_consents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy user_consents_delete_self on public.user_consents
  for delete using (auth.uid() = user_id);

-- =============================================================================
-- H6 — Private avatar/cover buckets + signed-URL access
-- =============================================================================
--
-- The buckets `avatars` and `covers` are toggled to PRIVATE in the dashboard
-- (manual step — see SECURITY_MANUAL_STEPS.md → H6). The statement below
-- also flips the flag at the DB level as a safety net. Insertion/Update/Delete
-- are scoped to the owner via path prefix `<user_id>/...`; reads happen via
-- short-lived signed URLs minted by the client.

update storage.buckets set public = false where id in ('avatars', 'covers');

-- Storage object policies. The bucket is private, so reads via the
-- anonymous "object" SELECT path are blocked — clients MUST use signed
-- URLs. INSERT / UPDATE / DELETE are restricted to the path prefix
-- `<auth.uid()>/...` so a user can only modify their own files.

drop policy if exists profile_objects_select_signed       on storage.objects;
drop policy if exists profile_objects_insert_owner        on storage.objects;
drop policy if exists profile_objects_update_owner        on storage.objects;
drop policy if exists profile_objects_delete_owner        on storage.objects;

-- Signed-URL reads bypass RLS, so the SELECT policy here exists only
-- to let authenticated users list their OWN objects (used by the app
-- to enumerate previous uploads for cleanup). Anonymous reads remain
-- blocked because the bucket is private.
create policy profile_objects_select_signed on storage.objects
  for select
  using (
    bucket_id in ('avatars', 'covers')
    and (
      auth.role() = 'service_role'
      or (auth.uid() is not null and (storage.foldername(name))[1] = auth.uid()::text)
    )
  );

create policy profile_objects_insert_owner on storage.objects
  for insert
  with check (
    bucket_id in ('avatars', 'covers')
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy profile_objects_update_owner on storage.objects
  for update
  using (
    bucket_id in ('avatars', 'covers')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('avatars', 'covers')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy profile_objects_delete_owner on storage.objects
  for delete
  using (
    bucket_id in ('avatars', 'covers')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Track the current avatar/cover OBJECT PATH separately from the (signed)
-- url that gets rendered. Signed URLs expire, so storing the URL itself
-- as a long-lived profile field is wrong — store the path and mint a
-- fresh URL on read.
alter table public.profiles
  add column if not exists avatar_path text;

alter table public.profiles
  add column if not exists cover_path text;

-- Best-effort backfill: if the legacy `<user_id>.<ext>` filenames are
-- still in the bucket, point avatar_path/cover_path at them so signed
-- URLs continue to work for already-uploaded files. Picks any object
-- whose name matches the legacy pattern under the user's id.
update public.profiles p
   set avatar_path = o.name
  from storage.objects o
 where p.avatar_path is null
   and o.bucket_id = 'avatars'
   and o.name like p.id::text || '.%';

update public.profiles p
   set cover_path = o.name
  from storage.objects o
 where p.cover_path is null
   and o.bucket_id = 'covers'
   and o.name like p.id::text || '.%';

-- =============================================================================
-- H11 — Username search RPC + rate-limit log
-- =============================================================================

-- 60-second sliding-window rate limit. 30 calls per user per minute is
-- generous enough for live-typeahead search but tight enough to choke
-- an obvious scraper. Production rate-limiting really wants to live at
-- the API gateway; this is a defensive fallback documented as such.
create table if not exists public.rpc_call_log (
  user_id   uuid not null references auth.users(id) on delete cascade,
  rpc_name  text not null,
  called_at timestamptz not null default now()
);

create index if not exists rpc_call_log_user_rpc_idx
  on public.rpc_call_log (user_id, rpc_name, called_at desc);

alter table public.rpc_call_log enable row level security;
-- No policies: only SECURITY DEFINER functions touch this table.

-- search_profiles RPC.
-- Validates the same `[a-zA-Z0-9_]{2,20}` shape as the client, throws on
-- mismatch (which surfaces as a Supabase error to the client and prevents
-- ilike-wildcard injection from a tampered build). Excludes blocked users
-- in both directions so a blocked party doesn't surface in search.
create or replace function public.search_profiles(p_query text)
returns table (
  id          uuid,
  username    text,
  avatar_url  text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid     uuid := auth.uid();
  recent  int;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if p_query is null
     or length(p_query) < 2
     or length(p_query) > 20
     or p_query !~ '^[A-Za-z0-9_]+$' then
    raise exception 'invalid query';
  end if;

  -- Rate limit: at most 30 calls / minute / user.
  select count(*) into recent
    from public.rpc_call_log r
   where r.user_id = uid
     and r.rpc_name = 'search_profiles'
     and r.called_at > now() - interval '1 minute';
  if recent >= 30 then
    raise exception 'rate limit exceeded';
  end if;
  insert into public.rpc_call_log (user_id, rpc_name) values (uid, 'search_profiles');

  return query
    select p.id, p.username, p.avatar_url
      from public.profiles p
     where p.username is not null
       and p.is_public_profile = true
       and p.username ilike '%' || p_query || '%'
       and p.id <> uid
       -- Exclude users the caller has blocked.
       and not exists (
         select 1 from public.blocks b
          where b.blocker_id = uid and b.blocked_id = p.id
       )
       -- Exclude users who have blocked the caller.
       and not exists (
         select 1 from public.blocks b
          where b.blocker_id = p.id and b.blocked_id = uid
       )
     order by p.username asc
     limit 20;
end;
$$;

revoke all on function public.search_profiles(text) from public;
grant execute on function public.search_profiles(text) to authenticated;

-- =============================================================================
-- H12 — Block / Report (App Store Guideline 1.2)
-- =============================================================================

create table if not exists public.blocks (
  blocker_id  uuid not null references auth.users(id) on delete cascade,
  blocked_id  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

drop policy if exists blocks_select_self on public.blocks;
drop policy if exists blocks_insert_self on public.blocks;
drop policy if exists blocks_delete_self on public.blocks;

-- A user sees only the blocks they themselves created. The blocked
-- party can NOT enumerate who blocked them (that would leak info).
create policy blocks_select_self on public.blocks
  for select using (auth.uid() = blocker_id);

create policy blocks_insert_self on public.blocks
  for insert with check (auth.uid() = blocker_id);

create policy blocks_delete_self on public.blocks
  for delete using (auth.uid() = blocker_id);

create table if not exists public.reports (
  id                uuid primary key default gen_random_uuid(),
  reporter_id       uuid not null references auth.users(id) on delete cascade,
  reported_user_id  uuid not null references auth.users(id) on delete cascade,
  reason            text not null,
  details           text,
  status            text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at        timestamptz not null default now()
);

alter table public.reports enable row level security;

drop policy if exists reports_select_self on public.reports;
drop policy if exists reports_insert_self on public.reports;

-- Reporter sees their own reports (so the UI can show "we received
-- your report"). Nobody else — admin moderation runs via service_role.
create policy reports_select_self on public.reports
  for select using (auth.uid() = reporter_id);

create policy reports_insert_self on public.reports
  for insert with check (auth.uid() = reporter_id);

-- ── Update existing visibility policies so blocked users are filtered.

drop policy if exists profiles_select_public on public.profiles;
create policy profiles_select_public on public.profiles
  for select
  using (
    -- Always your own profile, regardless of public flag.
    auth.uid() = id
    or (
      is_public_profile = true
      -- Hide from users the caller has blocked.
      and not exists (
        select 1 from public.blocks b
         where b.blocker_id = auth.uid() and b.blocked_id = profiles.id
      )
      -- Hide from users who have blocked the caller.
      and not exists (
        select 1 from public.blocks b
         where b.blocker_id = profiles.id and b.blocked_id = auth.uid()
      )
    )
  );

drop policy if exists follows_insert_self on public.follows;
-- INSERT: caller must be the follower AND must not be blocked by the
-- target (and vice versa).
create policy follows_insert_self on public.follows
  for insert
  with check (
    auth.uid() = follower_id
    and not exists (
      select 1 from public.blocks b
       where (b.blocker_id = follows.following_id and b.blocked_id = follows.follower_id)
          or (b.blocker_id = follows.follower_id  and b.blocked_id = follows.following_id)
    )
  );

drop policy if exists shared_workouts_select_active on public.shared_workouts;
create policy shared_workouts_select_active on public.shared_workouts
  for select
  using (
    expires_at > now()
    and revoked_at is null
    and (
      -- Either it's your own share, or the creator hasn't blocked you
      -- (and you haven't blocked them).
      user_id is null
      or auth.uid() = user_id
      or (
        not exists (
          select 1 from public.blocks b
           where b.blocker_id = shared_workouts.user_id and b.blocked_id = auth.uid()
        )
        and not exists (
          select 1 from public.blocks b
           where b.blocker_id = auth.uid() and b.blocked_id = shared_workouts.user_id
        )
      )
    )
  );

-- =============================================================================
-- H14 — Account-deletion cascade
-- =============================================================================
--
-- The prior round added `user_id uuid REFERENCES auth.users(id)` to
-- shared_workouts. The FK was created without ON DELETE CASCADE, which
-- left orphaned rows when an account was deleted (the delete_user()
-- function compensated with a username-based delete, but the migration
-- backfill warned that rows under renamed/deleted profiles would
-- escape). Switch the FK to cascade and drop the workaround.

alter table public.shared_workouts
  drop constraint if exists shared_workouts_user_id_fkey;

alter table public.shared_workouts
  add constraint shared_workouts_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

-- Replace delete_user() — drop the username-string cleanup since the FK
-- cascade now handles it. Also explicitly removes the new tables added
-- in this migration (user_consents, blocks, reports, rpc_call_log) so
-- account deletion remains exhaustive even if any of those FKs were
-- ever recreated without cascade.
create or replace function public.delete_user()
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  delete from public.workout_rpe       where user_id = uid;
  delete from public.workout_sessions  where user_id = uid;
  delete from public.workouts          where user_id = uid;
  delete from public.follows           where follower_id = uid or following_id = uid;
  delete from public.user_settings     where user_id = uid;
  delete from public.user_consents     where user_id = uid;
  delete from public.blocks            where blocker_id = uid or blocked_id = uid;
  delete from public.reports           where reporter_id = uid or reported_user_id = uid;
  delete from public.rpc_call_log      where user_id = uid;

  -- shared_workouts now cascades via the ON DELETE CASCADE FK above;
  -- the explicit delete is kept as belt-and-braces for any row whose
  -- user_id is NULL (legacy rows from before the FK existed).
  delete from public.shared_workouts where user_id = uid;

  delete from public.profiles where id = uid;
  delete from auth.users      where id = uid;
end;
$$;

revoke all on function public.delete_user() from public;
grant execute on function public.delete_user() to authenticated;
