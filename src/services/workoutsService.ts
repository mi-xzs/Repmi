// src/services/workoutsService.ts
//
// CRUD for the `workouts` table. The full WorkoutData blob is stored as
// JSONB in `data` to keep things simple — `id` and `name` are duplicated
// out so they can be indexed/queried without unpacking the JSON.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { WorkoutData } from '../types/exercise';
import { logError } from './logger';

interface WorkoutRow {
  id: string;
  name: string;
  data: WorkoutData;
}

/** Fetch all workout templates for a user, oldest-first. */
export async function fetchWorkouts(userId: string): Promise<WorkoutData[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, name, data')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row: WorkoutRow) => ({
    // The blob in `data` is authoritative; only force the id/name in case
    // they drifted between the columns and the blob.
    ...row.data,
    id: row.id,
    workoutName: row.name,
  }));
}

/** Insert or update a workout. Caller is responsible for `id`. */
export async function upsertWorkout(userId: string, workout: WorkoutData): Promise<void> {
  if (!workout.id) throw new Error('upsertWorkout: workout.id is required');

  const { error } = await supabase.from('workouts').upsert({
    id: workout.id,
    user_id: userId,
    name: workout.workoutName,
    data: workout,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/** Delete a workout by id. */
export async function deleteWorkout(userId: string, workoutId: string): Promise<void> {
  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', workoutId)
    .eq('user_id', userId);
  if (error) throw error;
}

// ─── One-time AsyncStorage → Supabase migration ──────────────────────────────
//
// Runs once per device. If the user has local-only workouts (from before this
// change), push them all up so the new Samsung install can see them.

const MIGRATION_KEY = 'workouts_synced_sb_v1';
const LOCAL_WORKOUTS_KEY = 'workouts';

export async function migrateWorkoutsFromAsyncStorage(userId: string): Promise<void> {
  const done = await AsyncStorage.getItem(MIGRATION_KEY);
  if (done) return;

  const raw = await AsyncStorage.getItem(LOCAL_WORKOUTS_KEY);
  if (!raw) {
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
    return;
  }

  let local: WorkoutData[];
  try {
    local = JSON.parse(raw);
  } catch (e) {
    logError('workouts.migrate.corrupt', { name: (e as Error)?.name });
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
    return;
  }

  const valid = local.filter(w => w && w.id);
  if (valid.length === 0) {
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
    return;
  }

  // Upsert in one batch — `id` is the primary key so existing rows are merged.
  const { error } = await supabase.from('workouts').upsert(
    valid.map(w => ({
      id: w.id,
      user_id: userId,
      name: w.workoutName,
      data: w,
      updated_at: new Date().toISOString(),
    })),
  );
  if (error) {
    logError('workouts.migrate.upsert.failed', { supabaseCode: (error as { code?: string }).code });
    return; // do NOT set the flag — retry on next launch
  }

  await AsyncStorage.setItem(MIGRATION_KEY, 'true');
}
