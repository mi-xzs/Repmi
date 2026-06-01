-- =============================================================================
-- Follow requests (Instagram-style) for private accounts
-- =============================================================================
--
-- Adds a `pending` state to the follow edge. Following a PUBLIC account is
-- accepted immediately (unchanged behaviour); following a PRIVATE account
-- creates a request that the owner must approve.
--
-- Trust model: the CLIENT never decides the status. A BEFORE INSERT trigger
-- looks up the target's privacy and forces the correct status, so a tampered
-- client can't insert status='accepted' against a private target to skip the
-- gate. Approval is a pending -> accepted UPDATE the target alone can make
-- (RLS + a guard trigger). Reject / cancel are plain DELETEs.

-- ── 1. status column ─────────────────────────────────────────────────────────
-- default 'accepted' grandfathers every existing follow, so nobody loses
-- followers when this ships.
alter table public.follows
  add column if not exists status text not null default 'accepted'
  check (status in ('pending', 'accepted'));

-- Fast lookup for a user's incoming pending requests (the inbox query).
create index if not exists follows_pending_following_idx
  on public.follows (following_id)
  where status = 'pending';

-- ── 2. BEFORE INSERT: server decides pending vs accepted ─────────────────────
-- SECURITY DEFINER so it can read the target's is_public_profile regardless of
-- the inserting user's RLS visibility. Unknown/missing target -> private (safe).
create or replace function public.follows_set_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_is_public boolean;
begin
  select is_public_profile into target_is_public
    from public.profiles
   where id = NEW.following_id;

  NEW.status := case when target_is_public is true then 'accepted' else 'pending' end;
  return NEW;
end;
$$;

drop trigger if exists follows_set_status_trg on public.follows;
create trigger follows_set_status_trg
  before insert on public.follows
  for each row execute function public.follows_set_status();

-- ── 3. BEFORE UPDATE: guard the status transition ────────────────────────────
-- Only pending -> accepted is allowed; the two parties are immutable. Combined
-- with the RLS UPDATE policy (target only), this means the sole legal update is
-- the target approving an incoming request.
create or replace function public.follows_guard_update()
returns trigger
language plpgsql
as $$
begin
  if NEW.follower_id <> OLD.follower_id
     or NEW.following_id <> OLD.following_id then
    raise exception 'follows: cannot change the parties of a follow edge';
  end if;
  if OLD.status = 'accepted' and NEW.status <> 'accepted' then
    raise exception 'follows: cannot revert an accepted follow to pending';
  end if;
  return NEW;
end;
$$;

drop trigger if exists follows_guard_update_trg on public.follows;
create trigger follows_guard_update_trg
  before update on public.follows
  for each row execute function public.follows_guard_update();

-- ── 4. Auto-accept pending requests when a profile goes public ───────────────
-- Mirrors Instagram: flipping private -> public approves everyone waiting.
create or replace function public.follows_autoaccept_on_public()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.is_public_profile = true and OLD.is_public_profile = false then
    update public.follows
       set status = 'accepted'
     where following_id = NEW.id
       and status = 'pending';
  end if;
  return NEW;
end;
$$;

drop trigger if exists follows_autoaccept_on_public_trg on public.profiles;
create trigger follows_autoaccept_on_public_trg
  after update of is_public_profile on public.profiles
  for each row execute function public.follows_autoaccept_on_public();

-- ── 5. RLS: UPDATE (approve) + widened DELETE (reject / cancel) ──────────────
-- Target approves an incoming request. WITH CHECK pins the result to
-- 'accepted'; the guard trigger forbids the accepted->pending direction.
drop policy if exists follows_update_target on public.follows;
create policy follows_update_target on public.follows
  for update
  using (auth.uid() = following_id)
  with check (auth.uid() = following_id and status = 'accepted');

-- Either party may delete: the follower unfollows / cancels a request, OR the
-- target rejects a request / removes an existing follower. (Replaces the old
-- follower-only delete policy.)
drop policy if exists follows_delete_self on public.follows;
drop policy if exists follows_delete_either on public.follows;
create policy follows_delete_either on public.follows
  for delete
  using (auth.uid() in (follower_id, following_id));

-- ── 6. SELECT: keep pending rows private to the two parties ──────────────────
-- Re-create the A9 visibility policy with an explicit status guard on the
-- public branch so a third party can only ever see ACCEPTED edges. The
-- self/other-party branch still exposes pending rows (requester sees
-- "Requested"; target sees the incoming request).
drop policy if exists follows_select_visible on public.follows;
create policy follows_select_visible on public.follows
  for select using (
    auth.uid() in (follower_id, following_id)
    or (
      follows.status = 'accepted'
      and exists (select 1 from public.profiles p
                   where p.id = follows.follower_id and p.is_public_profile = true)
      and exists (select 1 from public.profiles p
                   where p.id = follows.following_id and p.is_public_profile = true)
      and not exists (
        select 1 from public.blocks b
         where (b.blocker_id = follows.follower_id  and b.blocked_id = auth.uid())
            or (b.blocker_id = auth.uid()            and b.blocked_id = follows.follower_id)
            or (b.blocker_id = follows.following_id  and b.blocked_id = auth.uid())
            or (b.blocker_id = auth.uid()            and b.blocked_id = follows.following_id)
      )
    )
  );
