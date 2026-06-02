// src/services/loginThrottle.ts
//
// SECURITY (H2) — Client-side failed-login throttle.
//
// Supabase's backend rate-limits the /token endpoint at ~30 req/h per IP,
// which mostly defeats scripts. This module adds a complementary client-side
// throttle that targets the manual / interactive attacker: after 5 failed
// attempts on a given email, the Log-In button locks for an exponentially
// increasing window. The intent is UX-grade discouragement, not crypto-grade
// defence — a determined attacker can clear localStorage and try again.
//
// State is keyed by lowercased+trimmed email so:
//   - Switching email starts a fresh counter (avoids penalising the wrong
//     person on a shared device).
//   - Lockouts survive page reloads (otherwise the attacker just hits F5).
//
// Storage: AsyncStorage. On web this is backed by localStorage; on native
// it's a flat file. Neither is sensitive — these are just timestamps, no
// credential material.

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'login_throttle:';

// Tier table — index = failed-attempt count (0-based). The first 4 fails
// are free (no lock). The 5th fail (index 5) locks for 30s, etc.
//
// Tuned for human-grade abuse: a typo or two costs nothing, repeated
// brute-force is friction-ed off quickly without being so harsh that a
// real user with a forgotten password is stuck for hours.
const LOCKOUT_SECONDS: readonly number[] = [
  0,    // 0 fails
  0,    // 1
  0,    // 2
  0,    // 3
  0,    // 4
  30,   // 5  → 30s
  60,   // 6  → 1m
  120,  // 7  → 2m
  300,  // 8  → 5m
];
// 9+ fails: cap at 15 min so a real user isn't locked out for hours.
const MAX_LOCKOUT_SECONDS = 15 * 60;

type ThrottleRecord = {
  attempts: number;
  lockedUntilMs: number; // epoch ms; 0 = not locked
};

function storageKey(email: string): string {
  return `${KEY_PREFIX}${email.trim().toLowerCase()}`;
}

function lockoutForAttempts(attempts: number): number {
  if (attempts < LOCKOUT_SECONDS.length) return LOCKOUT_SECONDS[attempts];
  return MAX_LOCKOUT_SECONDS;
}

async function readRecord(email: string): Promise<ThrottleRecord> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(email));
    if (!raw) return { attempts: 0, lockedUntilMs: 0 };
    const parsed = JSON.parse(raw) as Partial<ThrottleRecord>;
    return {
      attempts: typeof parsed.attempts === 'number' ? parsed.attempts : 0,
      lockedUntilMs:
        typeof parsed.lockedUntilMs === 'number' ? parsed.lockedUntilMs : 0,
    };
  } catch {
    // Corrupt entry — start fresh rather than blocking the user.
    return { attempts: 0, lockedUntilMs: 0 };
  }
}

async function writeRecord(email: string, rec: ThrottleRecord): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(email), JSON.stringify(rec));
  } catch {
    // Storage failure is non-fatal — the throttle just becomes
    // session-local for this email, which is still better than nothing.
  }
}

/**
 * Returns the number of seconds the user must wait before another login
 * attempt is permitted for this email. 0 = not locked.
 *
 * Safe to call repeatedly (e.g. from a render-time `useEffect` countdown).
 */
export async function getLockoutSecondsRemaining(email: string): Promise<number> {
  if (!email) return 0;
  const { lockedUntilMs } = await readRecord(email);
  if (!lockedUntilMs) return 0;
  const remainingMs = lockedUntilMs - Date.now();
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

/**
 * Record a failed login attempt for the given email and return the new
 * lockout window (in seconds) and total attempt count. Callers should
 * display the lockout countdown when `lockoutSeconds > 0`.
 */
export async function recordFailedAttempt(
  email: string,
): Promise<{ lockoutSeconds: number; attempts: number }> {
  if (!email) return { lockoutSeconds: 0, attempts: 0 };
  const prev = await readRecord(email);
  const attempts = prev.attempts + 1;
  const lockoutSeconds = lockoutForAttempts(attempts);
  const lockedUntilMs =
    lockoutSeconds > 0 ? Date.now() + lockoutSeconds * 1000 : 0;
  await writeRecord(email, { attempts, lockedUntilMs });
  return { lockoutSeconds, attempts };
}

/**
 * Clear any throttle state for the given email. Call on successful login.
 */
export async function clearThrottle(email: string): Promise<void> {
  if (!email) return;
  try {
    await AsyncStorage.removeItem(storageKey(email));
  } catch {
    /* non-fatal */
  }
}

/**
 * Format a lockout duration for display. Keeps copy short.
 *   45  → "45s"
 *   120 → "2m"
 *   915 → "15m"
 */
export function formatLockout(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes}m`;
}
