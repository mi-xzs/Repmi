import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { WorkoutSession } from '../screens/WorkoutScreen';
import { WorkoutData } from '../types/exercise';

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
  const { error } = await supabase.from('workout_sessions').insert({
    user_id: userId,
    workout_id: workoutId,
    date: session.date,
    duration: session.duration,
    exercises: session.exercises,
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
  const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
  const allIds = [...new Set([...activeIds, ...deletedIds])];

  const sessionInserts: object[] = [];
  const rpeInserts: object[] = [];

  for (const id of allIds) {
    const rawSessions = await AsyncStorage.getItem(`sessions_${id}`);
    if (rawSessions) {
      try {
        const sessions: WorkoutSession[] = JSON.parse(rawSessions);
        for (const s of sessions) {
          sessionInserts.push({
            user_id: userId,
            workout_id: id,
            date: s.date,
            duration: s.duration,
            exercises: s.exercises,
          });
        }
      } catch {}
    }

    const rawRPE = await AsyncStorage.getItem(`rpe_${id}`);
    if (rawRPE) {
      try {
        const entries: RPEEntry[] = JSON.parse(rawRPE);
        for (const entry of entries) {
          rpeInserts.push({
            user_id: userId,
            workout_id: id,
            rating: entry.rating,
            recorded_at: entry.recordedAt,
          });
        }
      } catch {}
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

  // Only flip the one-shot flag if we actually pushed something. Otherwise a
  // device that signed in before any local data was written (e.g. logged-out
  // upgrade flow) would be permanently marked "done" without ever migrating.
  if (sessionInserts.length > 0 || rpeInserts.length > 0) {
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
  }
}

// ─── Offline-tolerant retry queue for live session saves ─────────────────────
//
// When `saveSession` fails (network blip, brief outage, etc.) we stash the
// session in AsyncStorage so it isn't lost. The queue is drained on app
// launch (XPContext) and after each successful save (WorkoutScreen).

const PENDING_KEY = 'pending_sessions_v1';

interface PendingSession {
  workoutId: string;
  session: WorkoutSession;
}

export async function queuePendingSession(
  workoutId: string,
  session: WorkoutSession,
): Promise<void> {
  let queue: PendingSession[] = [];
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (raw) queue = JSON.parse(raw);
  } catch (e) {
    console.error('queuePendingSession: corrupt queue, resetting', e);
    queue = [];
  }
  queue.push({ workoutId, session });
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(queue));
}

export async function flushPendingSessions(userId: string): Promise<void> {
  let queue: PendingSession[] = [];
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (raw) queue = JSON.parse(raw);
  } catch (e) {
    console.error('flushPendingSessions: corrupt queue, clearing', e);
    await AsyncStorage.removeItem(PENDING_KEY);
    return;
  }
  if (queue.length === 0) return;

  const remaining: PendingSession[] = [];
  for (const item of queue) {
    try {
      await saveSession(userId, item.workoutId, item.session);
    } catch (e) {
      console.error('flushPendingSessions: re-push failed, keeping for later', e);
      remaining.push(item);
    }
  }

  if (remaining.length === 0) {
    await AsyncStorage.removeItem(PENDING_KEY);
  } else {
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(remaining));
  }
}
