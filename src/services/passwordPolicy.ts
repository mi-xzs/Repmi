// src/services/passwordPolicy.ts
//
// H1 — Password complexity policy.
//
// A7 / M5 — length floor raised 6 -> 8 (NIST 800-63B Rev.4 minimum for
// MFA-backed accounts, which this app supports via TOTP + biometric),
// and a breach check added (see checkPasswordBreached below).
//
// SECURITY / DEVIATION: NIST 800-63B §5.1.1.2 also recommends NO
// composition rules (research shows they push users toward predictable
// patterns like "Password1!"). The user has explicitly opted to KEEP the
// complexity rules; the rationale is that the in-app threat model favours
// the perceived assurance of a strict policy. We retain them here by
// product decision — revisit if signup friction becomes a concern.
//
// Synchronous rule set (must all hold) — drives the live checklist:
//   - length >= PASSWORD_MIN_LENGTH
//   - at least one uppercase letter (A-Z)
//   - at least one digit (0-9)
//   - at least one non-alphanumeric character (symbol)
//
// Asynchronous gate (run once at submit, NOT per keystroke):
//   - checkPasswordBreached() — HaveIBeenPwned k-anonymity lookup.
//
// The validator returns a structured per-rule pass/fail map so the UI
// can render a live checklist as the user types. `isValid` is the
// gating boolean — every consumer should treat any falsy rule as
// disabling the submit button.

import * as Crypto from 'expo-crypto';

export interface PasswordRules {
  minLength: boolean;
  hasUppercase: boolean;
  hasDigit: boolean;
  hasSymbol: boolean;
}

export interface PasswordValidation {
  rules: PasswordRules;
  isValid: boolean;
}

export const PASSWORD_MIN_LENGTH = 8;

export function validatePassword(password: string): PasswordValidation {
  const rules: PasswordRules = {
    minLength:    password.length >= PASSWORD_MIN_LENGTH,
    hasUppercase: /[A-Z]/.test(password),
    hasDigit:     /[0-9]/.test(password),
    hasSymbol:    /[^A-Za-z0-9]/.test(password),
  };
  const isValid =
    rules.minLength &&
    rules.hasUppercase &&
    rules.hasDigit &&
    rules.hasSymbol;
  return { rules, isValid };
}

/** Per-rule label used by the live checklist UI. */
export const PASSWORD_RULE_LABELS: Record<keyof PasswordRules, string> = {
  minLength:    `At least ${PASSWORD_MIN_LENGTH} characters`,
  hasUppercase: 'An uppercase letter',
  hasDigit:     'A number',
  hasSymbol:    'A symbol (e.g. !@#$%)',
};

// ─── A7 / M5 — breached-password check (HaveIBeenPwned) ──────────────────────

const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range/';

/**
 * Result of a breach lookup. `unavailable` is distinct from `ok` on
 * purpose: callers MUST be able to tell "confirmed clean" apart from
 * "couldn't reach the service" and decide their own fail-open/closed
 * policy. The screens here fail OPEN (allow the password) on
 * `unavailable` so a network blip never blocks all signups/resets.
 */
export type BreachCheckResult =
  | { status: 'ok' }
  | { status: 'breached'; count: number }
  | { status: 'unavailable' };

/**
 * Check a password against HaveIBeenPwned using k-anonymity: we hash the
 * password with SHA-1, send only the first 5 hex chars of the digest to
 * the API, and match the remaining suffix locally. The plaintext (and
 * the full hash) never leave the device — the server only ever sees a
 * 5-char prefix shared by thousands of unrelated hashes.
 *
 * `Add-Padding: true` asks HIBP to pad the response with synthetic
 * zero-count entries so the *size* of the response can't be used to
 * infer how many real hashes share the prefix. Those padded rows carry a
 * count of 0, so we ignore any match whose count isn't > 0.
 */
export async function checkPasswordBreached(
  password: string,
): Promise<BreachCheckResult> {
  try {
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA1,
      password,
    );
    const sha1 = digest.toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);

    const res = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    });
    if (!res.ok) return { status: 'unavailable' };

    const body = await res.text();
    for (const line of body.split('\n')) {
      const [hashSuffix, countStr] = line.trim().split(':');
      if (hashSuffix === suffix) {
        const count = parseInt(countStr, 10) || 0;
        return count > 0 ? { status: 'breached', count } : { status: 'ok' };
      }
    }
    return { status: 'ok' };
  } catch {
    // Network failure, hashing failure, etc. — fail open; the caller
    // logs and proceeds rather than locking users out.
    return { status: 'unavailable' };
  }
}
