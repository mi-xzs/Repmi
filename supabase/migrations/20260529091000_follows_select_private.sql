-- =============================================================================
-- A9 / L1 — Restrict follows SELECT for private profiles
-- =============================================================================
--
-- Previously `follows_select_all` was `using (true)` — the entire follow
-- graph was world-readable to any signed-in user. That leaks the social
-- graph of PRIVATE profiles (who a private account follows / is followed
-- by) and ignores blocks.
--
-- New policy `follows_select_visible` makes a follow row visible only when:
--   1. the viewer is one of the two parties (you can always see your own
--      follows in either direction), OR
--   2. BOTH parties are public profiles AND there is no block in either
--      direction between the viewer and either party.
--
-- BEHAVIOUR CHANGE (audit before applying): a non-follower viewing a
-- private profile now sees 0 rows here, so any UI deriving follower/
-- following COUNTS from this table (see fetchFollowCounts callers) will
-- render 0 for private profiles to outsiders. If counts must remain
-- visible while the list stays hidden, expose them via a SECURITY DEFINER
-- RPC instead of reading this table directly.

drop policy if exists follows_select_all on public.follows;

create policy follows_select_visible on public.follows
  for select using (
    auth.uid() in (follower_id, following_id)
    or (
      exists (select 1 from public.profiles p
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
