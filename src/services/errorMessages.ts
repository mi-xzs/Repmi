// src/services/errorMessages.ts
//
// M7 — Map Supabase / PostgREST errors to user-facing copy that does
// not leak server-side details.
//
// SECURITY (from the audit HIGH round): Supabase's `error.message`
// strings routinely contain:
//
//   - The user's email address (auth flows on duplicate-signup or
//     wrong-password — the message often echoes the input).
//   - Postgres constraint names, column names, and schema names (DB
//     write errors — leaks the DB shape to anyone reading the alert).
//   - RLS-policy names ("new row violates row-level security policy
//     'profiles_update_self'") — leaks the security-rule layout.
//
// All three are real, observed in shipped Supabase apps. The rule is
// simple: NEVER pass `error.message` to a UI surface. Use the mapper
// below.
//
// Both mappers also fall through to a generic "Something went wrong"
// for ANYTHING that doesn't match a known code, so a future Supabase
// version that adds new error shapes can't sneak a leak past us.

interface MappableError {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
}

function asMappable(err: unknown): MappableError {
  if (!err || typeof err !== 'object') return {};
  return err as MappableError;
}

// ─── Auth ───────────────────────────────────────────────────────────────
//
// Mapper is keyed off (a) Supabase Auth error codes when available, and
// (b) a small whitelist of message snippets that are LANGUAGE-AGNOSTIC
// (numeric codes / status — never user-facing text). It DOES NOT branch
// on error.message text where that text could echo PII.
//
// Important: We deliberately COLLAPSE "wrong email" + "wrong password"
// into the SAME generic copy ("Email or password is incorrect"). This
// is a privacy property — distinguishing them would let a script test
// for account existence by reading the error.

export function mapAuthError(err: unknown): string {
  const e = asMappable(err);

  // Supabase Auth API status codes (the auth-js client surfaces them).
  // 400 / 422 = invalid credentials, invalid body, weak password, etc.
  // 429 = rate-limited.
  if (e.status === 429) return 'Try again in a moment';
  if (e.status === 401 || e.status === 403) return 'Email or password is incorrect';

  // Newer supabase-js bundles a typed `code` on AuthApiError. Map the
  // documented codes; anything else falls through to the generic copy.
  switch (e.code) {
    case 'invalid_credentials':
    case 'invalid_grant':
    case 'invalid_password':
      return 'Email or password is incorrect';
    case 'email_not_confirmed':
      return 'Please confirm your email before signing in';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'Try again in a moment';
    case 'weak_password':
      return 'Password does not meet the requirements';
    case 'user_already_exists':
      // PRIVACY: this is the leak the audit called out. Don't say
      // "already in use" — say "could not sign you up" so the same
      // copy is shown for both reuse-of-known-email and any other
      // signup failure.
      return 'Could not sign you up — try a different email';
    case 'email_address_invalid':
    case 'invalid_email':
      return 'Email address is invalid';
    case 'session_not_found':
    case 'session_expired':
      return 'Your session has expired. Sign in again';
    case 'otp_expired':
    case 'mfa_challenge_expired':
      return 'The code has expired. Request a new one';
    case 'invalid_otp':
    case 'mfa_verification_failed':
      return 'Incorrect code. Try again';
    default:
      // Last-ditch generic copy. NEVER pass `e.message` through here —
      // it can carry the user's email or other PII.
      return 'Something went wrong. Try again.';
  }
}

// ─── Database / PostgREST ───────────────────────────────────────────────
//
// PostgREST returns Postgres SQLSTATE codes on `error.code`. We map a
// short whitelist — everything else falls through to generic copy.
//
// SQLSTATE reference:
//   23505 — unique_violation
//   23502 — not_null_violation
//   23503 — foreign_key_violation
//   23514 — check_violation
//   42501 — insufficient_privilege (RLS denial usually surfaces as this
//           via PostgREST, sometimes via PGRST116 / PGRST301)
//   PGRST116 — row does not exist (single() with empty result)
//   PGRST301 — JWT expired
//   PGRST204 — RLS denied
//
// We DO NOT branch on `error.message` — that text can include the
// offending column name and value, which leaks DB shape.

export function mapDatabaseError(err: unknown): string {
  const e = asMappable(err);

  switch (e.code) {
    case '23505':
      return 'That value is already in use';
    case '23502':
    case '23503':
    case '23514':
      return 'Could not save — try again';
    case '42501':
    case 'PGRST204':
    case 'PGRST116':
      return 'Permission denied';
    case 'PGRST301':
      return 'Your session has expired. Sign in again';
    default:
      return 'Something went wrong. Try again.';
  }
}

// ─── Generic / network ──────────────────────────────────────────────────
//
// Convenience helper for non-auth, non-DB failures (network blips,
// JSON parse errors on the wire, etc.). Always falls through to
// generic copy.

export function mapGenericError(_err: unknown): string {
  return 'Something went wrong. Try again.';
}
