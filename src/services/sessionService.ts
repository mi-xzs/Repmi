import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { WorkoutSession } from '../screens/WorkoutScreen';
import { WorkoutData } from '../types/exercise';
import { secureGet, secureSet, secureRemove } from './secureUserCache';
import { logError, logCacheCorruption } from './logger';
import {
  PendingSessionsCacheSchema,
  WorkoutSessionSchema,
  DeletedWorkoutIdsSchema,
  safeJsonParse,
} from './cacheSchemas';
import { WorkoutSessionPayloadSchema } from './payloadSchemas';
import { z } from 'zod';

export interface RPEEntry {
  workoutId: string;
  rating: number;
  recordedAt: string;
}

export interface SessionWithWorkoutId extends WorkoutSession {
  workoutId: string;
}

export async function saveSession(
  userId: string,
  workoutId: string,
  session: WorkoutSession,
): Promise<void> {
  const validated = WorkoutSessionPayloadSchema.safeParse(session);
  if (!validated.success) {
    logError('session.save.invalidPayload', { workoutId });
    throw new Error('Workout session contains invalid data and was not saved.');
  }

  const { error } = await supabase.from('workout_sessions').insert({
    user_id: userId,
    workout_id: workoutId,
    date: validated.data.date,
    duration: validated.data.duration,
    exercises: validated.data.exercises,
  });
  if (error) throw error;
}

export async function loadSessionsForWorkout(
  userId: string,
  workoutId: string,
): Promise<WorkoutSession[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('date, duration, exercises')
    .eq('user_id', userId)
    .eq('workout_id', workoutId)
    .order('date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(row => ({
    date: row.date,
    duration: row.duration,
    exercises: row.exercises,
  }));
}

export async function loadAllSessions(userId: string): Promise<SessionWithWorkoutId[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('workout_id, date, duration, exercises')
    .eq('user_id', userId)
    .order('date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(row => ({
    workoutId: row.workout_id,
    date: row.date,
    duration: row.duration,
    exercises: row.exercises,
  }));
}

export async function loadDurationsForWorkout(
  userId: string,
  workoutId: string,
): Promise<number[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('duration')
    .eq('user_id', userId)
    .eq('workout_id', workoutId)
    .order('date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(row => row.duration);
}

export async function saveRPEEntry(
  userId: string,
  workoutId: string,
  rating: number,
  recordedAt: string,
): Promise<void> {
  const { error } = await supabase.from('workout_rpe').insert({
    user_id: userId,
    workout_id: workoutId,
    rating,
    recorded_at: recordedAt,
  });
  if (error) throw error;
}

export async function loadRPEEntries(
  userId: string,
  workoutId: string,
): Promise<RPEEntry[]> {
  const { data, error } = await supabase
    .from('workout_rpe')
    .select('workout_id, rating, recorded_at')
    .eq('user_id', userId)
    .eq('workout_id', workoutId)
    .order('recorded_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(row => ({
    workoutId: row.workout_id,
    rating: row.rating,
    recordedAt: row.recorded_at,
  }));
}

const MIGRATION_KEY = 'sessions_migrated_sb_v1';

export async function migrateFromAsyncStorage(
  userId: string,
  workouts: WorkoutData[],
): Promise<void> {
  const done = await AsyncStorage.getItem(MIGRATION_KEY);
  if (done) return;

  const activeIds = workouts.map(w => w.id).filter((id): id is string => !!id);
  const deletedRaw = await AsyncStorage.getItem('deletedWorkoutIds');
  const deletedParsed = deletedRaw ? DeletedWorkoutIdsSchema.safeParse(safeJsonParse(deletedRaw)) : null;
  const deletedIds: string[] = deletedParsed?.success ? deletedParsed.data : [];
  if (deletedRaw && deletedParsed && !deletedParsed.success) {
    logCacheCorruption('deletedWorkoutIds');
    await AsyncStorage.removeItem('deletedWorkoutIds').catch(() => {});
  }
  const allIds = [...new Set([...activeIds, ...deletedIds])];

  const sessionInserts: object[] = [];
  const rpeInserts: object[] = [];

  for (const id of allIds) {
    const rawSessions = await AsyncStorage.getItem(`sessions_${id}`);
    if (rawSessions) {
      const parsed = z.array(WorkoutSessionSchema).safeParse(safeJsonParse(rawSessions));
      if (parsed.success) {
        for (const s of parsed.data as WorkoutSession[]) {
          const strict = WorkoutSessionPayloadSchema.safeParse(s);
          if (!strict.success) {
            logCacheCorruption(`sessions_${id}`, { reason: 'strictSchemaMiss' });
            continue;
          }
          sessionInserts.push({
            user_id: userId,
            workout_id: id,
            date: strict.data.date,
            duration: strict.data.duration,
            exercises: strict.data.exercises,
          });
        }
      } else {
        logCacheCorruption(`sessions_${id}`);
      }
    }

    const rawRPE = await AsyncStorage.getItem(`rpe_${id}`);
    if (rawRPE) {
      const rpeSchema = z.array(z.object({
        workoutId: z.string().optional(),
        rating: z.number(),
        recordedAt: z.string(),
      }).loose());
      const parsed = rpeSchema.safeParse(safeJsonParse(rawRPE));
      if (parsed.success) {
        for (const entry of parsed.data) {
          rpeInserts.push({
            user_id: userId,
            workout_id: id,
            rating: entry.rating,
            recorded_at: entry.recordedAt,
          });
        }
      } else {
        logCacheCorruption(`rpe_${id}`);
      }
    }
  }

  if (sessionInserts.length > 0) {
    await supabase
      .from('workout_sessions')
      .insert(sessionInserts)
      .then(({ error }) => { if (error) throw error; });
  }
  if (rpeInserts.length > 0) {
    await supabase
      .from('workout_rpe')
      .insert(rpeInserts)
      .then(({ error }) => { if (error) throw error; });
  }

  if (sessionInserts.length > 0 || rpeInserts.length > 0) {
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
  }
}

// ─── Offline-tolerant retry queue for live session saves ─────────────────────

const PENDING_KEY = 'pending_sessions_v1';

interface PendingSession {
  workoutId: string;
  session: WorkoutSession;
}

async function readPendingQueue(): Promise<PendingSession[]> {
  try {
    const secure = await secureGet(PENDING_KEY);
    if (secure) {
      const parsed = PendingSessionsCacheSchema.safeParse(safeJsonParse(secure));
      if (parsed.success) {
        return parsed.data as PendingSession[];
      }
      logCacheCorruption(PENDING_KEY, { source: 'secureStore' });
      await secureRemove(PENDING_KEY);
    }
  } catch (e) {
    logError('session.queue.corrupt', { source: 'secureStore', name: (e as Error)?.name });
  }
  try {
    const legacy = await AsyncStorage.getItem(PENDING_KEY);
    if (legacy) {
      const parsed = PendingSessionsCacheSchema.safeParse(safeJsonParse(legacy));
      if (!parsed.success) {
        logCacheCorruption(PENDING_KEY, { source: 'asyncStorageLegacy' });
        await AsyncStorage.removeItem(PENDING_KEY);
        return [];
      }
      const items = parsed.data as PendingSession[];
      if (items.length > 0) {
        await secureSet(PENDING_KEY, JSON.stringify(items));
      }
      await AsyncStorage.removeItem(PENDING_KEY);
      return items;
    }
  } catch (e) {
    logError('session.queue.corrupt', { source: 'asyncStorageLegacy', name: (e as Error)?.name });
  }
  return [];
}

async function writePendingQueue(queue: PendingSession[]): Promise<void> {
  if (queue.length === 0) {
    await secureRemove(PENDING_KEY);
    await AsyncStorage.removeItem(PENDING_KEY).catch(() => {});
    return;
  }
  await secureSet(PENDING_KEY, JSON.stringify(queue));
  await AsyncStorage.removeItem(PENDING_KEY).catch(() => {});
}

export async function queuePendingSession(
  workoutId: string,
  session: WorkoutSession,
): Promise<void> {
  const queue = await readPendingQueue();
  queue.push({ workoutId, session });
  await writePendingQueue(queue);
}

export async function flushPendingSessions(userId: string): Promise<void> {
  const queue = await readPendingQueue();
  if (queue.length === 0) return;

  const remaining: PendingSession[] = [];
  for (const item of queue) {
    try {
      await saveSession(userId, item.workoutId, item.session);
    } catch (e) {
      logError('session.queue.flush.retry', { name: (e as Error)?.name });
      remaining.push(item);
    }
  }
  await writePendingQueue(remaining);
}
