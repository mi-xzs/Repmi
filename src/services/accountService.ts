import { supabase } from './supabase';
import { clearLocalUserData } from './clearLocalUserData';
import {
  authenticateBiometric,
  isBiometricAvailable,
} from './biometricService';

// SECURITY (M2) — buckets the user owns objects in. We sweep every
// file under the user's `${userId}/` prefix at delete time so no
// avatar / cover orphans survive the account deletion (GDPR
// "right to be forgotten"). Add new buckets here as they're created.
const USER_OWNED_BUCKETS = ['avatars', 'covers'] as const;

/**
 * A6 / M3 — Fresh re-auth gate for destructive operations
 * (disable MFA, delete account).
 *
 * Two factors:
 *  - Biometric (if hardware present) proves the human at the screen is
 *    the device owner — a thief with an unlocked phone is blocked.
 *  - Password re-verification proves the actor still knows the
 *    credential, not just that they grabbed an already-signed-in session.
 *
 * Throws `cancelled` on biometric cancel and `password_mismatch` on a
 * bad password so the caller can show the right toast.
 */
export async function requireReAuth(
  email: string,
  password: string,
  reason: string,
): Promise<void> {
  if (await isBiometricAvailable()) {
    const ok = await authenticateBiometric(reason);
    if (!ok) throw new Error('cancelled');
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error('password_mismatch');
}

/**
 * List every object the user owns under `${userId}/` in a bucket and
 * delete them in a single `remove()` call. Returns nothing — failures
 * are swallowed (the DB cleanup is the user-facing guarantee).
 *
 * SECURITY (M2): previous implementation deleted hard-coded paths of
 * the form `${userId}.${ext}`, but the upload path was migrated to
 * `${userId}/${randomUUID}.${ext}` (see profileService.uploadProfileImage).
 * The hard-coded list therefore matched zero objects in production and
 * orphaned every avatar/cover on account deletion. Switching to a
 * prefix-list-then-remove sweep deletes the new-style paths AND any
 * stragglers from older clients.
 */
async function purgeUserStoragePrefix(bucket: string, userId: string): Promise<void> {
  try {
    const { data, error } = await supabase.storage.from(bucket).list(userId, { limit: 100 });
    if (error || !data?.length) return;
    const paths = data.map(f => `${userId}/${f.name}`);
    await supabase.storage.from(bucket).remove(paths);
  } catch {
    // best-effort — DB cleanup is the user-facing guarantee
  }
}

/**
 * Permanently delete the signed-in user's account and all associated data.
 *
 * Order matters:
 *  1. Strip storage objects (avatar/cover) — list every file under the
 *     user's `${userId}/` prefix in each bucket and remove them. We don't
 *     hard-code extensions because uploads use randomised filenames
 *     (`${userId}/${uuid}.${ext}`).
 *  2. Call the SECURITY DEFINER `delete_user` RPC, which removes the user's
 *     rows from every public table plus `auth.users`.
 *  3. Sign out locally and wipe AsyncStorage so the device is clean even if
 *     someone signs in as a different user immediately after.
 *
 * Errors from step 1 are non-fatal — the DB cleanup is what users actually
 * care about. Errors from step 2 are fatal; the caller surfaces them.
 *
 * SECURITY (H3): Step 3 now goes through `clearLocalUserData()` instead of
 * `AsyncStorage.clear()` so both AsyncStorage AND SecureStore caches are
 * swept. This matters for the new-style sensitive caches (pending sessions,
 * workouts list, water counts) that live in SecureStore.
 */
export async function deleteAccount(userId: string): Promise<void> {
  await Promise.allSettled(
    USER_OWNED_BUCKETS.map(b => purgeUserStoragePrefix(b, userId)),
  );

  const { error } = await supabase.rpc('delete_user');
  if (error) throw error;

  await supabase.auth.signOut().catch(() => {});
  await clearLocalUserData();
}
