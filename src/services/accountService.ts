import { supabase } from './supabase';
import { clearLocalUserData } from './clearLocalUserData';
import {
  authenticateBiometric,
  isBiometricAvailable,
} from './biometricService';

const PROFILE_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

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
 * Permanently delete the signed-in user's account and all associated data.
 *
 * Order matters:
 *  1. Strip storage objects (avatar/cover). We attempt every known extension
 *     because we don't know which one the user uploaded; missing-file errors
 *     are ignored.
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
  const paths = PROFILE_IMAGE_EXTENSIONS.map(ext => `${userId}.${ext}`);

  await Promise.allSettled([
    supabase.storage.from('avatars').remove(paths),
    supabase.storage.from('covers').remove(paths),
  ]);

  const { error } = await supabase.rpc('delete_user');
  if (error) throw error;

  await supabase.auth.signOut().catch(() => {});
  await clearLocalUserData();
}
