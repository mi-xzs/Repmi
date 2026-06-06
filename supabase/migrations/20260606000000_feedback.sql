-- ============================================================================
-- Feedback / bug reports
--
-- A lightweight channel for users to send bug reports and suggestions straight
-- to the database (reviewed in the Supabase dashboard) instead of relying on a
-- mailto: link that silently fails in the browser.
--
-- Security model (mirrors search_profiles / reports):
--   * The table is NOT directly writable by clients — INSERT/UPDATE/DELETE are
--     revoked from authenticated & anon. All writes go through submit_feedback(),
--     a SECURITY DEFINER function that validates input and enforces a per-user
--     rate limit. Clients therefore can't set arbitrary columns (status, user_id,
--     created_at) and every write is validated in one place.
--   * submit_feedback uses parameterised values only (no dynamic SQL / string
--     concatenation) and runs with `set search_path = ''`, so SQL injection and
--     search-path hijacking are not possible.
--   * Users can read back only their own submissions (RLS select-self).
-- ============================================================================

create table if not exists public.feedback (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  category     text not null check (category in ('bug', 'idea', 'other')),
  message      text not null check (char_length(message) between 1 and 2000),
  app_version  text,
  platform     text check (platform in ('ios', 'android', 'web')),
  status       text not null default 'open'
                 check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at   timestamptz not null default now()
);

create index if not exists feedback_user_created_idx
  on public.feedback (user_id, created_at desc);

create index if not exists feedback_status_created_idx
  on public.feedback (status, created_at desc);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.feedback enable row level security;

drop policy if exists feedback_select_self on public.feedback;

create policy feedback_select_self on public.feedback
  for select using (auth.uid() = user_id);

-- No direct writes — everything goes through submit_feedback().
revoke insert, update, delete on public.feedback from authenticated, anon;

-- ── submit_feedback() — validated, rate-limited insert ───────────────────────
create or replace function public.submit_feedback(
  p_category     text,
  p_message      text,
  p_app_version  text,
  p_platform     text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid    uuid := auth.uid();
  msg    text := btrim(coalesce(p_message, ''));
  recent int;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- SECURITY (M1) — block the shared demo account from spamming feedback.
  if public.is_demo_user(uid) then
    raise exception 'demo accounts cannot send feedback';
  end if;

  -- Validate category against the whitelist (defence in depth — the table
  -- CHECK enforces it too, but failing here gives a clean error).
  if p_category is null or p_category not in ('bug', 'idea', 'other') then
    raise exception 'invalid category';
  end if;

  -- Validate message length (1..2000 chars after trimming).
  if char_length(msg) = 0 then
    raise exception 'message required';
  end if;
  if char_length(msg) > 2000 then
    raise exception 'message too long';
  end if;

  -- Serialise concurrent submissions from the same user so the rate-limit
  -- count-then-insert can't race (TOCTOU). Transaction-scoped lock, keyed on
  -- the user — auto-released at commit, and never blocks *other* users.
  perform pg_advisory_xact_lock(hashtext('submit_feedback'), hashtext(uid::text));

  -- Rate limit: at most 5 submissions / hour / user.
  select count(*) into recent
    from public.feedback f
   where f.user_id = uid
     and f.created_at > now() - interval '1 hour';
  if recent >= 5 then
    raise exception 'rate limit exceeded';
  end if;

  insert into public.feedback (user_id, category, message, app_version, platform)
  values (
    uid,
    p_category,
    msg,
    nullif(left(coalesce(p_app_version, ''), 40), ''),
    case when p_platform in ('ios', 'android', 'web') then p_platform else null end
  );
end;
$$;

-- Supabase's default privileges grant EXECUTE to anon/authenticated/service_role
-- as explicit per-role grants, separate from PUBLIC — so revoking from PUBLIC
-- alone leaves anon able to call this. Revoke anon explicitly: only logged-in
-- users may submit feedback. (The `auth.uid() is null` check above is the
-- backstop, but least privilege means anon shouldn't reach the function at all.)
revoke all on function public.submit_feedback(text, text, text, text) from public, anon;
grant execute on function public.submit_feedback(text, text, text, text) to authenticated;
