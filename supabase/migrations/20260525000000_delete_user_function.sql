-- Self-serve account deletion.
--
-- Called by the authenticated user via `supabase.rpc('delete_user')`. Runs as
-- the function owner (postgres) so it can reach into auth.users, but verifies
-- auth.uid() inside the body so a caller can only ever delete themselves.
--
-- Storage objects (avatar/cover files) are NOT deleted here — the client
-- removes them before calling this function. If a future call path skips
-- that step, the orphaned files remain in the bucket; clean those up out
-- of band.
--
-- Apply via: supabase db push, or paste into Supabase SQL Editor.

create or replace function public.delete_user()
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  uname text;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select username into uname from public.profiles where id = uid;

  delete from public.workout_rpe       where user_id = uid;
  delete from public.workout_sessions  where user_id = uid;
  delete from public.workouts          where user_id = uid;
  delete from public.follows           where follower_id = uid or following_id = uid;
  delete from public.user_settings     where user_id = uid;

  -- shared_workouts has no user_id column, only the `shared_by` username
  -- string. Best-effort cleanup; if the user renamed at some point, older
  -- shares under previous usernames will remain.
  if uname is not null then
    delete from public.shared_workouts where shared_by = uname;
  end if;

  delete from public.profiles where id = uid;
  delete from auth.users      where id = uid;
end;
$$;

revoke all on function public.delete_user() from public;
grant execute on function public.delete_user() to authenticated;
