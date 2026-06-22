import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800;
const CHUNK_MARKER = '__cu_chunks__:';

const USER_KEYS_INDEX = '__repmi_user_keys_index_v1__';

function chunkKey(key: string, index: number): string {
  return `${key}__cu_${index}`;
}

function safeKey(rawKey: string): string {
  return rawKey.replace(/[^A-Za-z0-9._-]/g, '_');
}

async function readIndex(): Promise<string[]> {
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

export async function secureClearAll(): Promise<void> {
  const keys = await readIndex();
  for (const safe of keys) {
    try {
      await clearChunks(safe);
      await SecureStore.deleteItemAsync(safe);
    } catch {
    }
  }
  try {
    await SecureStore.deleteItemAsync(USER_KEYS_INDEX);
  } catch {
  }
}
