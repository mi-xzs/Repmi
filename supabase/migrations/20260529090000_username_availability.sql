-- =============================================================================
-- A5 / M1 — is_username_available RPC
-- =============================================================================
--
-- Lets a signed-in client check username availability WITHOUT being able to
-- read the profiles table directly (which RLS otherwise restricts). The
-- function is SECURITY DEFINER so it runs with the owner's rights, but it
-- returns only a boolean — never any row data — so it cannot be used to
-- enumerate or exfiltrate profiles.
--
-- The regex is applied INSIDE the existence check on purpose: an invalid
-- candidate (wrong charset/length) can never match an existing row, so the
-- function returns the right answer for malformed input too. The
-- authoritative format gate still lives in the app + the profiles
-- constraints; this just keeps the availability check self-consistent.
--
-- `set search_path = public` pins resolution so a malicious search_path
-- can't shadow `profiles` with an attacker-controlled relation (standard
-- SECURITY DEFINER hardening).

create or replace function public.is_username_available(p_username text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.profiles
     where lower(username) = lower(p_username)
       and p_username ~ '^[a-zA-Z0-9_]{2,20}$'
  );
$$;

-- Least privilege: drop the default PUBLIC execute grant, then grant only
-- to authenticated users (anon callers don't need username checks).
revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to authenticated;
