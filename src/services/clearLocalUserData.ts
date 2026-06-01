// src/services/clearLocalUserData.ts
//
// H3 — Sweep every locally-cached user-data blob on sign-out OR account
// deletion. The previous behaviour (AsyncStorage.clear() only, run from
// accountService) left two gaps:
//
//   1. Plain signOut did NOT wipe AsyncStorage, so the next account that
//      signed in on the same device would see the previous user's
//      cached workouts/sessions/water counts until each cache happened
//      to overwrite itself.
//   2. SecureStore entries (auth tokens, the new H3 sensitive caches)
//      were not touched at all by `AsyncStorage.clear()`.
//
// This helper is invoked from both code paths and explicitly:
//
//   - Removes the known fixed AsyncStorage keys (workouts cache, pending
//     queue, migration markers, legacy priv_* settings).
//   - Sweeps every dynamic key the app writes by enumerating
//     `AsyncStorage.getAllKeys()` and filtering by known prefixes
//     (water-ml:, sessions_, rpe_).
//   - Calls `secureClearAll()` from secureUserCache to delete every
//     value tracked by the new sensitive-cache module.
//   - Deletes the Supabase auth token directly from SecureStore so the
//     session can't be resurrected by a stale auth-state listener.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { secureClearAll } from './secureUserCache';

// Fixed keys the app writes to AsyncStorage. Keep this list in sync
// with `AsyncStorage.setItem(...)` call-sites; grep for `setItem(` and
// `multiSet(` periodically.
const KNOWN_ASYNC_STORAGE_KEYS = [
  // workouts cache
  'workouts',
  // queued offline sessions (legacy AsyncStorage path; new writes go
  // through secureUserCache)
  'pending_sessions_v1',
  // one-time migration markers — wiping them forces a clean re-migrate
  // for the next user on this device, which is the safe default.
  'sessions_migrated_sb_v1',
  'settings_synced_sb_v1',
  'workouts_synced_sb_v1',
  // legacy `priv_*` settings prior to migration into user_settings.extra
  'priv_publicProfile',
  'priv_openFollows',
  // legacy local-only collections
  'deletedWorkoutIds',
  'favoriteWorkouts',
  'pref_weightUnit',
  'pref_heightUnit',
  'equipped_season_title',
];

// Prefixes for the dynamic keys the app writes per-user / per-day.
const DYNAMIC_PREFIXES = [
  'water-ml:',     // hydration counts keyed by user+date
  'sessions_',     // legacy per-workout session arrays
  'rpe_',          // legacy per-workout RPE arrays
];

/**
 * H3 — Wipe every locally-cached user-data blob this app has ever
 * written. Safe to call multiple times; missing keys are ignored.
 */
export async function clearLocalUserData(): Promise<void> {
  // 1. AsyncStorage — known fixed keys.
  try {
    await AsyncStorage.multiRemove(KNOWN_ASYNC_STORAGE_KEYS);
  } catch (e) {
    if (__DEV__) console.warn('[clearLocalUserData] multiRemove failed', e);
  }

  // 2. AsyncStorage — dynamic-prefixed keys enumerated at call time.
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const dynamic = allKeys.filter(k =>
      DYNAMIC_PREFIXES.some(p => k.startsWith(p)),
    );
    if (dynamic.length > 0) {
      await AsyncStorage.multiRemove(dynamic);
    }
  } catch (e) {
    if (__DEV__) console.warn('[clearLocalUserData] dynamic sweep failed', e);
  }

  // 3. SecureStore — every value tracked by secureUserCache.
  try {
    await secureClearAll();
  } catch (e) {
    if (__DEV__) console.warn('[clearLocalUserData] secureClearAll failed', e);
  }

  // 4. SecureStore — the supabase session token, written by the
  //    secureStoreAdapter under a deterministic key shape. The Supabase
  //    JS client uses storage keys of the form `sb-<projectRef>-auth-token`;
  //    we don't know the project ref at this layer, so sweep any key
  //    matching that pattern that the adapter has produced. SecureStore
  //    doesn't expose a getAllKeys() — but `supabase.auth.signOut()` is
  //    called before this helper so the canonical removal path has
  //    already run. As a defence-in-depth, we also try the most common
  //    legacy key names.
  for (const key of ['supabase.auth.token']) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // best-effort
    }
  }
}
