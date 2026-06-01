// src/services/secureUserCache.ts
//
// H3 — Secure JSON value storage for SENSITIVE user-data caches.
//
// Auth tokens already live in SecureStore via `secureStoreAdapter.ts`.
// This module is the equivalent home for the other sensitive blobs the
// app caches locally between sessions:
//
//   - pending_sessions_v1 (queued workout sessions awaiting sync)
//   - workouts cache       (full workout list incl. exercise data)
//   - priv_* settings      (private profile flags — duplicated here from
//                          AsyncStorage migration paths)
//   - water-ml:* keys      (per-day hydration counts; low-sensitivity but
//                          dynamic keys are handled the same way)
//
// SecureStore wraps the platform secure key store (Keychain on iOS,
// EncryptedSharedPreferences/Keystore on Android). Even on a rooted
// device, lifting these values requires more than a plain `adb pull`.
//
// Chunking is reused via the same approach as `secureStoreAdapter.ts`
// (Android caps each entry at ~2048 bytes), but the chunking metadata
// must NOT collide with the auth-storage adapter — we therefore use a
// distinct chunk marker prefix.
//
// Index: every key we ever write is also appended to a USER_KEYS_INDEX
// so the logout `clearLocalUserData()` helper can enumerate and delete
// every blob even when the keys are dynamic (e.g. `water-ml:<uid>:<day>`).

import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800;
const CHUNK_MARKER = '__cu_chunks__:';

const USER_KEYS_INDEX = '__repmi_user_keys_index_v1__';

function chunkKey(key: string, index: number): string {
  return `${key}__cu_${index}`;
}

/**
 * SecureStore disallows certain characters in keys (colons, hyphens etc
 * are actually OK on iOS but the SecureStore docs recommend
 * `[a-zA-Z0-9._-]`). Sanitise once on the way in so dynamic keys like
 * `water-ml:<uid>:<date>` never trip the native validator.
 */
function safeKey(rawKey: string): string {
  return rawKey.replace(/[^A-Za-z0-9._-]/g, '_');
}

async function readIndex(): Promise<string[]> {
  // M6 — the index is just a `string[]`; an inline shape-check is
  // cheaper than pulling in Zod here (and this module is required to
  // boot the rest of the cache layer that DOES use Zod).
  try {
    const raw = await SecureStore.getItemAsync(USER_KEYS_INDEX);
    if (!raw) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : [];
  } catch {
    return [];
  }
}

async function writeIndex(keys: string[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(USER_KEYS_INDEX, JSON.stringify(keys));
  } catch {
    // Index writes are best-effort — a missed entry only means the
    // `clearLocalUserData` sweep might miss it.
  }
}

async function trackKey(key: string): Promise<void> {
  const keys = await readIndex();
  if (!keys.includes(key)) {
    keys.push(key);
    await writeIndex(keys);
  }
}

async function untrackKey(key: string): Promise<void> {
  const keys = await readIndex();
  const next = keys.filter(k => k !== key);
  if (next.length !== keys.length) await writeIndex(next);
}

async function clearChunks(safe: string): Promise<void> {
  try {
    const head = await SecureStore.getItemAsync(safe);
    if (head && head.startsWith(CHUNK_MARKER)) {
      const count = parseInt(head.slice(CHUNK_MARKER.length), 10);
      if (Number.isFinite(count) && count > 0) {
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(chunkKey(safe, i));
        }
      }
    }
  } catch {
    // best effort
  }
}

export async function secureGet(key: string): Promise<string | null> {
  const safe = safeKey(key);
  try {
    const head = await SecureStore.getItemAsync(safe);
    if (head === null) return null;
    if (!head.startsWith(CHUNK_MARKER)) return head;
    const count = parseInt(head.slice(CHUNK_MARKER.length), 10);
    if (!Number.isFinite(count) || count <= 0) return null;
    const parts: string[] = [];
    for (let i = 0; i < count; i++) {
      const p = await SecureStore.getItemAsync(chunkKey(safe, i));
      if (p === null) return null;
      parts.push(p);
    }
    return parts.join('');
  } catch (e) {
    if (__DEV__) console.warn('[secureUserCache] get failed:', key, e);
    return null;
  }
}

export async function secureSet(key: string, value: string): Promise<void> {
  const safe = safeKey(key);
  try {
    await clearChunks(safe);
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(safe, value);
    } else {
      const total = Math.ceil(value.length / CHUNK_SIZE);
      for (let i = 0; i < total; i++) {
        await SecureStore.setItemAsync(
          chunkKey(safe, i),
          value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
        );
      }
      await SecureStore.setItemAsync(safe, `${CHUNK_MARKER}${total}`);
    }
    await trackKey(safe);
  } catch (e) {
    if (__DEV__) console.warn('[secureUserCache] set failed:', key, e);
  }
}

export async function secureRemove(key: string): Promise<void> {
  const safe = safeKey(key);
  try {
    await clearChunks(safe);
    await SecureStore.deleteItemAsync(safe);
    await untrackKey(safe);
  } catch (e) {
    if (__DEV__) console.warn('[secureUserCache] remove failed:', key, e);
  }
}

/**
 * Enumerate every key that this module has ever written and delete it.
 * Used by `clearLocalUserData()` on sign-out / account deletion so no
 * sensitive blob is left behind under the previous user's name.
 */
export async function secureClearAll(): Promise<void> {
  const keys = await readIndex();
  for (const safe of keys) {
    try {
      await clearChunks(safe);
      await SecureStore.deleteItemAsync(safe);
    } catch {
      // continue — best-effort sweep.
    }
  }
  try {
    await SecureStore.deleteItemAsync(USER_KEYS_INDEX);
  } catch {
    // ignored
  }
}
