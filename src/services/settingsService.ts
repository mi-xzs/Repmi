// src/services/settingsService.ts
//
// CRUD for the `user_settings` table. One row per user, primary key = user_id.
// Stores small per-user prefs (units, equipped title, favorite workouts).
// Other ad-hoc prefs go into the `extra` JSONB column.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type WeightUnit = 'kg' | 'lbs';
export type HeightUnit = 'cm' | 'ft';

export interface UserSettings {
  weightUnit: WeightUnit;
  heightUnit: HeightUnit;
  equippedSeasonTitle: string | null;
  favoriteWorkoutIds: string[];
  extra: Record<string, unknown>;
}

export const DEFAULT_SETTINGS: UserSettings = {
  weightUnit: 'kg',
  heightUnit: 'cm',
  equippedSeasonTitle: null,
  favoriteWorkoutIds: [],
  extra: {},
};

interface SettingsRow {
  weight_unit: WeightUnit | null;
  height_unit: HeightUnit | null;
  equipped_season_title: string | null;
  favorite_workout_ids: string[] | null;
  extra: Record<string, unknown> | null;
}

function rowToSettings(row: SettingsRow | null): UserSettings {
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    weightUnit: row.weight_unit ?? DEFAULT_SETTINGS.weightUnit,
    heightUnit: row.height_unit ?? DEFAULT_SETTINGS.heightUnit,
    equippedSeasonTitle: row.equipped_season_title,
    favoriteWorkoutIds: row.favorite_workout_ids ?? [],
    extra: row.extra ?? {},
  };
}

export async function fetchSettings(userId: string): Promise<UserSettings> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('weight_unit, height_unit, equipped_season_title, favorite_workout_ids, extra')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return rowToSettings(data as SettingsRow | null);
}

export async function upsertSettings(userId: string, settings: UserSettings): Promise<void> {
  const { error } = await supabase.from('user_settings').upsert({
    user_id: userId,
    weight_unit: settings.weightUnit,
    height_unit: settings.heightUnit,
    equipped_season_title: settings.equippedSeasonTitle,
    favorite_workout_ids: settings.favoriteWorkoutIds,
    extra: settings.extra,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

// ─── One-time AsyncStorage → Supabase migration ──────────────────────────────

const MIGRATION_KEY = 'settings_synced_sb_v1';

export async function migrateSettingsFromAsyncStorage(userId: string): Promise<UserSettings> {
  const remote = await fetchSettings(userId);

  const done = await AsyncStorage.getItem(MIGRATION_KEY);
  if (done) return remote;

  // Collect any local prefs that aren't already represented server-side.
  const [
    [, weightUnitRaw],
    [, heightUnitRaw],
    [, equippedTitle],
    [, favoritesRaw],
    [, publicProfile],
    [, openFollows],
  ] = await AsyncStorage.multiGet([
    'pref_weightUnit',
    'pref_heightUnit',
    'equipped_season_title',
    'favoriteWorkouts',
    'priv_publicProfile',
    'priv_openFollows',
  ]);

  let favorites: string[] = remote.favoriteWorkoutIds;
  if (favoritesRaw) {
    try {
      const parsed = JSON.parse(favoritesRaw);
      if (Array.isArray(parsed)) {
        // Union with remote — remote takes precedence on duplicates.
        favorites = Array.from(new Set([...remote.favoriteWorkoutIds, ...parsed]));
      }
    } catch (e) {
      console.error('settingsService: corrupt favorites in AsyncStorage', e);
    }
  }

  const weightUnit: WeightUnit =
    weightUnitRaw === 'kg' || weightUnitRaw === 'lbs'
      ? weightUnitRaw
      : remote.weightUnit;

  const heightUnit: HeightUnit =
    heightUnitRaw === 'cm' || heightUnitRaw === 'ft'
      ? heightUnitRaw
      : remote.heightUnit;

  const merged: UserSettings = {
    weightUnit,
    heightUnit,
    equippedSeasonTitle: remote.equippedSeasonTitle ?? equippedTitle ?? null,
    favoriteWorkoutIds: favorites,
    extra: {
      ...remote.extra,
      ...(publicProfile !== null ? { publicProfile: publicProfile === 'true' } : {}),
      ...(openFollows !== null   ? { openFollows:   openFollows   === 'true' } : {}),
    },
  };

  try {
    await upsertSettings(userId, merged);
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
  } catch (e) {
    console.error('settingsService: migration upsert failed', e);
    // Leave the flag unset so we retry next launch. Return merged so the
    // current session uses the local values anyway.
  }

  return merged;
}
