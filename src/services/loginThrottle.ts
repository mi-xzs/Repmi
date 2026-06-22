import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'login_throttle:';

const LOCKOUT_SECONDS: readonly number[] = [
  0,
  0,
  0,
  0,
  0,
  30,
  60,
  120,
  300,
];
const MAX_LOCKOUT_SECONDS = 15 * 60;

type ThrottleRecord = {
  attempts: number;
  lockedUntilMs: number;
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
    return { attempts: 0, lockedUntilMs: 0 };
  }
}

async function writeRecord(email: string, rec: ThrottleRecord): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(email), JSON.stringify(rec));
  } catch {
  }
}

export async function getLockoutSecondsRemaining(email: string): Promise<number> {
  if (!email) return 0;
  const { lockedUntilMs } = await readRecord(email);
  if (!lockedUntilMs) return 0;
  const remainingMs = lockedUntilMs - Date.now();
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

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

export async function clearThrottle(email: string): Promise<void> {
  if (!email) return;
  try {
    await AsyncStorage.removeItem(storageKey(email));
  } catch {
  }
}

export function formatLockout(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes}m`;
}
