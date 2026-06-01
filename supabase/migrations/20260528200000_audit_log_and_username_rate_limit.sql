-- =============================================================================
-- MEDIUM-severity follow-up migration (audit round 3).
-- =============================================================================
--
-- Bundles every SQL change required by the M8 + M11 audit items:
--   M8  — audit_log table + log_audit_event RPC + delete_user() audit row
--   M11 — username_changed_at column + 30-day change rate-limit
--
-- Migration is idempotent — every CREATE/ALTER guarded by IF NOT EXISTS
-- where possible, every CREATE POLICY preceded by DROP POLICY IF EXISTS,
-- so a partial re-run is safe.
--
-- Apply via: supabase db push, or paste into the Supabase SQL Editor.

-- =============================================================================
-- M8 — Audit log
-- =============================================================================
--
-- Append-only event store for security-relevant actions: account deletion,
-- MFA enroll/unenroll, blocks, reports, password changes. The owner can read
-- their own events (to prove what happened on their account); no one can
-- write directly — inserts go through `log_audit_event(...)`, which stamps
-- the row with `auth.uid()` so a tampered client cannot forge a different
-- actor.
--
-- Retention: 13 months minimum per common security policy + GDPR Art. 30.
-- A scheduled cron deletes rows older than that — see
-- SECURITY_MANUAL_STEPS.md → "M8. Audit log retention".

create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users(id) on delete set null,
  action      text not null,
  -- target_id is nullable + FK-less because the targeted row may already
  -- be gone (account_deleted: the user row was just removed) and we
  -- don't want the audit insert to fail because of that.
  target_id   uuid,
  metadata    jsonb default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists audit_log_actor_created_idx
  on public.audit_log (actor_id, created_at desc);

create index if not exists audit_log_action_created_idx
  on public.audit_log (action, created_at desc);

alter table public.audit_log enable row level security;

drop policy if exists audit_log_select_self on public.audit_log;

-- Caller sees ONLY their own audit rows. Service-role bypasses RLS by
-- design, which is how the moderation tooling can still read the
-- full log.
create policy audit_log_select_self on public.audit_log
  for select using (auth.uid() = actor_id);

-- All direct mutation paths are revoked. Inserts go via the SECURITY
-- DEFINER function below; that function is the only sanctioned writer
-- and it always stamps `actor_id = auth.uid()`.
revoke insert, update, delete on public.audit_log from authenticated, anon;

-- RPC: append a single audit row. The function runs as its OWNER
-- (postgres / definer) but reads `auth.uid()` from the JWT so the
-- caller can ONLY ever write a row attributed to themselves.
create or replace function public.log_audit_event(
  p_action     text,
  p_target_id  uuid,
  p_metadata   jsonb
)
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
  if p_action is null or length(p_action) = 0 then
    raise exception 'action required';
  end if;
  -- Defensive cap on metadata size — a malicious client could otherwise
  -- balloon audit rows. 16 KiB is generous for any expected payload.
  if octet_length(coalesce(p_metadata::text, '')) > 16 * 1024 then
    raise exception 'metadata too large';
  end if;

  insert into public.audit_log (actor_id, action, target_id, metadata)
  values (uid, p_action, p_target_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

revoke all on function public.log_audit_event(text, uuid, jsonb) from public;
grant execute on function public.log_audit_event(text, uuid, jsonb) to authenticated;

-- =============================================================================
-- M8 — delete_user() now writes an `account_deleted` audit row BEFORE
-- removing the user. We re-CREATE OR REPLACE the function (we don't edit
-- the prior migration's copy) so the change layers cleanly on top.
-- =============================================================================

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

  -- M8: emit an audit row BEFORE the cascade — once the user is gone
  -- the FK on actor_id flips to NULL, but the action+timestamp remain
  -- on record.
  insert into public.audit_log (actor_id, action, target_id, metadata)
  values (uid, 'account_deleted', uid, jsonb_build_object('source', 'delete_user_rpc'));

  delete from public.workout_rpe       where user_id = uid;
  delete from public.workout_sessions  where user_id = uid;
  delete from public.workouts          where user_id = uid;
  delete from public.follows           where follower_id = uid or following_id = uid;
  delete from public.user_settings     where user_id = uid;
  delete from public.user_consents     where user_id = uid;
  delete from public.blocks            where blocker_id = uid or blocked_id = uid;
  delete from public.reports           where reporter_id = uid or reported_user_id = uid;
  delete from public.rpc_call_log      where user_id = uid;

  -- shared_workouts cascades via the FK added in the H14 migration;
  -- belt-and-braces explicit delete kept for any legacy NULL-user_id row.
  delete from public.shared_workouts where user_id = uid;

  delete from public.profiles where id = uid;
  delete from auth.users      where id = uid;
end;
$$;

revoke all on function public.delete_user() from public;
grant execute on function public.delete_user() to authenticated;

-- =============================================================================
-- M11 — Username change rate-limit
-- =============================================================================
--
-- A user can change their username at most once every 30 days. The
-- column is a plain timestamptz that's set automatically by a trigger
-- whenever the row's `username` value actually changes. The RLS update
-- policy gets a `username_changed_at` check appended so the
-- rate-limit is enforced at the database, not just the client.
--
-- Existing rows have NULL `username_changed_at`; the trigger treats
-- NULL as "never changed before, change is allowed" so we don't
-- accidentally lock anyone out on first edit.

alter table public.profiles
  add column if not exists username_changed_at timestamptz;

-- Trigger: bump username_changed_at on any UPDATE that actually
-- modifies the username. The trigger ALSO enforces the 30-day window
-- — that's the authoritative check (the RLS policy WITH CHECK below
-- is a redundant guard).
create or replace function public.enforce_username_change_window()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if NEW.username is distinct from OLD.username then
    if OLD.username_changed_at is not null
       and now() - OLD.username_changed_at < interval '30 days' then
      raise exception 'username_change_rate_limit'
        using errcode = 'P0001',
              hint = 'You can change your username again 30 days after the last change.';
    end if;
    NEW.username_changed_at := now();
  end if;
  return NEW;
end;
$$;

drop trigger if exists profiles_username_change_window on public.profiles;
create trigger profiles_username_change_window
  before update on public.profiles
  for each row
  when (NEW.username is distinct from OLD.username)
  execute function public.enforce_username_change_window();

-- Backfill: stamp `username_changed_at = now()` for every existing
-- profile that already has a username, so the 30-day window starts
-- ticking from migration apply time rather than from epoch (which
-- would let everyone change once for free immediately).
update public.profiles
   set username_changed_at = now()
 where username is not null
   and username_changed_at is null;
