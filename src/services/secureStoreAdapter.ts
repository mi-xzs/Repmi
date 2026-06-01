// src/services/secureStoreAdapter.ts
//
// SECURITY: Supabase auth tokens (access + refresh JWT bundle) live in
// device storage so the session survives app restarts. Previously these
// were kept in AsyncStorage, which is plain unencrypted JSON files on
// disk — anyone with `adb` access or filesystem access to a rooted /
// jailbroken device can lift the session and sign in as the user.
//
// SecureStore wraps the platform secure key store (Keychain on iOS,
// EncryptedSharedPreferences / Keystore on Android), which is the
// correct home for credential material.
//
// CAVEAT — Android 2 KB per-value limit. EncryptedSharedPreferences
// caps each individual value at ~2048 bytes. A typical Supabase session
// bundle (access JWT + refresh JWT + user object) is comfortably above
// that, so we chunk values transparently:
//
//   - On setItem: split the string into <=1800-byte slices, store each
//     slice under `${key}__chunk_${i}` and store the chunk count under
//     the canonical key.
//   - On getItem: read the canonical key. If it's a chunk-count marker,
//     read and concatenate the slices; otherwise return the value as-is
//     for backwards compatibility with non-chunked entries (e.g. flags
//     other code might store via the adapter in the future).
//   - On removeItem: clean up every chunk plus the canonical key.
//
// `getItemAsync` returns `null` for missing keys, never throws — that
// matches the contract Supabase's storage interface expects.

import * as SecureStore from 'expo-secure-store';

// Stay well below the 2048-byte Android limit. UTF-8 chars can be up
// to 4 bytes each, so 1800 ASCII chars is always safe; if the session
// ever contains multibyte chars (it shouldn't, JWTs are base64url) the
// margin still holds for the common case.
const CHUNK_SIZE = 1800;
const CHUNK_MARKER = '__chunks__:';

function chunkKey(key: string, index: number): string {
  return `${key}__chunk_${index}`;
}

async function clearExistingChunks(key: string): Promise<void> {
  // Best-effort cleanup of any prior chunked write under this key.
  // We don't know the prior count, so peek at the canonical key first.
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
    // If we can't read, assume there's nothing to clean. The set
    // below will overwrite the canonical key cleanly.
  }
}

export const supabaseSecureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const head = await SecureStore.getItemAsync(key);
      if (head === null) return null;
      if (!head.startsWith(CHUNK_MARKER)) {
        // Plain single-value entry (small enough not to chunk).
        return head;
      }
      const count = parseInt(head.slice(CHUNK_MARKER.length), 10);
      if (!Number.isFinite(count) || count <= 0) return null;
      const parts: string[] = [];
      for (let i = 0; i < count; i++) {
        const part = await SecureStore.getItemAsync(chunkKey(key, i));
        if (part === null) {
          // Corrupt / partial write — treat as missing so Supabase
          // forces a fresh sign-in rather than crashing on bad JSON.
          return null;
        }
        parts.push(part);
      }
      return parts.join('');
    } catch (e) {
      // Never throw from storage reads — Supabase treats null as
      // "no session" and will route the user to sign-in.
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
      // Write chunks first, header last — so a partial write leaves
      // an inconsistent-but-detectable state rather than a header
      // pointing at missing chunks.
      for (let i = 0; i < total; i++) {
        const slice = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        await SecureStore.setItemAsync(chunkKey(key, i), slice);
      }
      await SecureStore.setItemAsync(key, `${CHUNK_MARKER}${total}`);
    } catch (e) {
      // Surface as a warning — losing the session means the user is
      // forced to re-auth next launch, which is annoying but not
      // catastrophic and definitely better than crashing.
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
