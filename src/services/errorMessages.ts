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

export function mapAuthError(err: unknown): string {
  const e = asMappable(err);

  if (e.status === 429) return 'Try again in a moment';
  if (e.status === 401 || e.status === 403) return 'Email or password is incorrect';

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
      return 'Something went wrong. Try again.';
  }
}

// ─── Database / PostgREST ───────────────────────────────────────────────

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

export function mapGenericError(_err: unknown): string {
  return 'Something went wrong. Try again.';
}
