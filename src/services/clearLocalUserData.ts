import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { secureClearAll } from './secureUserCache';

const KNOWN_ASYNC_STORAGE_KEYS = [
  'workouts',
  'pending_sessions_v1',
  'sessions_migrated_sb_v1',
  'settings_synced_sb_v1',
  'workouts_synced_sb_v1',
  'priv_publicProfile',
  'priv_openFollows',
  'deletedWorkoutIds',
  'favoriteWorkouts',
  'pref_weightUnit',
  'pref_heightUnit',
  'equipped_season_title',
];

const DYNAMIC_PREFIXES = [
  'water-ml:',
  'sessions_',
  'rpe_',
];

export async function clearLocalUserData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(KNOWN_ASYNC_STORAGE_KEYS);
  } catch (e) {
    if (__DEV__) console.warn('[clearLocalUserData] multiRemove failed', e);
  }

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

  try {
    await secureClearAll();
  } catch (e) {
    if (__DEV__) console.warn('[clearLocalUserData] secureClearAll failed', e);
  }

  for (const key of ['supabase.auth.token']) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
    }
  }
}
