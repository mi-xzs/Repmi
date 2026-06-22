import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800;
const CHUNK_MARKER = '__chunks__:';

function chunkKey(key: string, index: number): string {
  return `${key}__chunk_${index}`;
}

async function clearExistingChunks(key: string): Promise<void> {
  try {
    const head = await SecureStore.getItemAsync(key);
    if (head && head.startsWith(CHUNK_MARKER)) {
      const count = parseInt(head.slice(CHUNK_MARKER.length), 10);
      if (Number.isFinite(count) && count > 0) {
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(chunkKey(key, i));
        }
      }
    }
  } catch {
  }
}

export const supabaseSecureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const head = await SecureStore.getItemAsync(key);
      if (head === null) return null;
      if (!head.startsWith(CHUNK_MARKER)) {
        return head;
      }
      const count = parseInt(head.slice(CHUNK_MARKER.length), 10);
      if (!Number.isFinite(count) || count <= 0) return null;
      const parts: string[] = [];
      for (let i = 0; i < count; i++) {
        const part = await SecureStore.getItemAsync(chunkKey(key, i));
        if (part === null) {
          return null;
        }
        parts.push(part);
      }
      return parts.join('');
    } catch (e) {
      if (__DEV__) console.warn('[secureStoreAdapter] getItem failed:', e);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await clearExistingChunks(key);
      if (value.length <= CHUNK_SIZE) {
        await SecureStore.setItemAsync(key, value);
        return;
      }
      const total = Math.ceil(value.length / CHUNK_SIZE);
      for (let i = 0; i < total; i++) {
        const slice = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        await SecureStore.setItemAsync(chunkKey(key, i), slice);
      }
      await SecureStore.setItemAsync(key, `${CHUNK_MARKER}${total}`);
    } catch (e) {
      if (__DEV__) console.warn('[secureStoreAdapter] setItem failed:', e);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await clearExistingChunks(key);
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      if (__DEV__) console.warn('[secureStoreAdapter] removeItem failed:', e);
    }
  },
};
