import { supabase } from './supabase';
import { clearLocalUserData } from './clearLocalUserData';
import {
  authenticateBiometric,
  isBiometricAvailable,
} from './biometricService';

const USER_OWNED_BUCKETS = ['avatars', 'covers'] as const;

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

async function purgeUserStoragePrefix(bucket: string, userId: string): Promise<void> {
  try {
    const { data, error } = await supabase.storage.from(bucket).list(userId, { limit: 100 });
    if (error || !data?.length) return;
    const paths = data.map(f => `${userId}/${f.name}`);
    await supabase.storage.from(bucket).remove(paths);
  } catch {
  }
}

export async function deleteAccount(userId: string): Promise<void> {
  await Promise.allSettled(
    USER_OWNED_BUCKETS.map(b => purgeUserStoragePrefix(b, userId)),
  );

  const { error } = await supabase.rpc('delete_user');
  if (error) throw error;

  await supabase.auth.signOut().catch(() => {});
  await clearLocalUserData();
}
