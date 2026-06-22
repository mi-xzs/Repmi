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

export const PASSWORD_RULE_LABELS: Record<keyof PasswordRules, string> = {
  minLength:    `At least ${PASSWORD_MIN_LENGTH} characters`,
  hasUppercase: 'An uppercase letter',
  hasDigit:     'A number',
  hasSymbol:    'A symbol (e.g. !@#$%)',
};

// ─── A7 / M5 — breached-password check (HaveIBeenPwned) ──────────────────────

const HIBP_RANGE_URL = 'https://api.pwnedpasswords.com/range/';

export type BreachCheckResult =
  | { status: 'ok' }
  | { status: 'breached'; count: number }
  | { status: 'unavailable' };

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
    return { status: 'unavailable' };
  }
}
