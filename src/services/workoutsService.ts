import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { WorkoutData } from '../types/exercise';
import { logError } from './logger';

interface WorkoutRow {
  id: string;
  name: string;
  data: WorkoutData;
}

export async function fetchWorkouts(userId: string): Promise<WorkoutData[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('id, name, data')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row: WorkoutRow) => ({
    ...row.data,
    id: row.id,
    workoutName: row.name,
  }));
}

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

export async function deleteWorkout(userId: string, workoutId: string): Promise<void> {
  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', workoutId)
    .eq('user_id', userId);
  if (error) throw error;
}

// ─── One-time AsyncStorage → Supabase migration ──────────────────────────────

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
    return;
  }

  await AsyncStorage.setItem(MIGRATION_KEY, 'true');
}
