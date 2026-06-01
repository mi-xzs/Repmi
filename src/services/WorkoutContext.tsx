// src/services/WorkoutContext.tsx
import React, { createContext, useState, ReactNode, useContext, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutData } from '../types/exercise';
import { useAuth } from './AuthContext';
import {
  fetchWorkouts,
  upsertWorkout,
  deleteWorkout as sbDeleteWorkout,
  migrateWorkoutsFromAsyncStorage,
} from './workoutsService';
import { secureGet, secureSet, secureRemove } from './secureUserCache';
import { logError, logCacheCorruption } from './logger';
import { WorkoutsCacheSchema, safeJsonParse } from './cacheSchemas';

// SECURITY (H3): Workouts cache contains exercise/training history —
// sensitive enough to live in SecureStore rather than AsyncStorage. We
// keep the legacy key + AsyncStorage as a one-time fallback so users
// upgrading from a previous build don't lose their cache on first run.
const CACHE_KEY = 'workouts';

// Simple ID generator — no external package needed
const generateId = (): string =>
  `w_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

type WorkoutContextType = {
  workouts: WorkoutData[];
  saveWorkout: (workout: WorkoutData) => void;
  updateWorkout: (index: number, workout: WorkoutData) => void;
  deleteWorkout: (index: number) => void;
  isLoading: boolean;
};

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export const WorkoutProvider = ({ children }: { children: ReactNode }) => {
  const { session: authSession, isLoading: authLoading } = useAuth();
  const userId = authSession?.user.id;

  const [workouts, setWorkouts] = useState<WorkoutData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Hydrate from cache immediately so the UI isn't blank during the
  //    Supabase round-trip. Authoritative data replaces this once it lands.
  //    Reads SecureStore first; falls back to the legacy AsyncStorage
  //    entry on first run of an upgraded build.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const secure = await secureGet(CACHE_KEY);
        const raw = secure ?? (await AsyncStorage.getItem(CACHE_KEY));
        if (cancelled || !raw) return;
        // M6 — Zod-validate. On miss, drop the corrupt blob and let
        // the Supabase sync re-populate.
        const parsedResult = WorkoutsCacheSchema.safeParse(safeJsonParse(raw));
        if (!parsedResult.success) {
          logCacheCorruption(CACHE_KEY);
          await secureRemove(CACHE_KEY).catch(() => {});
          await AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
          return;
        }
        const parsed = parsedResult.data as WorkoutData[];
        const migrated = parsed.map(w => (w.id ? w : { ...w, id: generateId() }));
        setWorkouts(migrated);
        // If we only had the legacy copy, promote it to the secure
        // cache and drop the plaintext one so future reads stay fast
        // AND don't expose the workout list on disk.
        if (!secure) {
          await secureSet(CACHE_KEY, raw);
          await AsyncStorage.removeItem(CACHE_KEY).catch(() => {});
        }
      } catch (e) {
        logError('workouts.cache.read.failed', { name: (e as Error)?.name });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Once auth settles, sync with Supabase (migrate-up + fetch-down).
  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      // Signed out — keep whatever's in cache, but mark loaded so screens render.
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const sync = async () => {
      try {
        // Push any local-only workouts to Supabase (one-time per device).
        await migrateWorkoutsFromAsyncStorage(userId);

        // Pull the authoritative list and overwrite local state + cache.
        const remote = await fetchWorkouts(userId);
        if (cancelled) return;

        setWorkouts(remote);
        await secureSet(CACHE_KEY, JSON.stringify(remote));
      } catch (e) {
        logError('workouts.sync.failed', { name: (e as Error)?.name });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    sync();
    return () => { cancelled = true; };
  }, [userId, authLoading]);

  // ── Write-through cache. Runs on every workouts change after first load.
  useEffect(() => {
    if (isLoading) return;
    secureSet(CACHE_KEY, JSON.stringify(workouts)).catch(e =>
      logError('workouts.cache.write.failed', { name: (e as Error)?.name }),
    );
  }, [workouts, isLoading]);

  // ── Mutations: optimistic local update, then push to Supabase. ────────────
  const saveWorkout = useCallback((workout: WorkoutData) => {
    const withId: WorkoutData = workout.id ? workout : { ...workout, id: generateId() };

    setWorkouts(prev => {
      const existingIdx = prev.findIndex(w => w.id === withId.id);
      if (existingIdx >= 0) return prev.map((w, i) => (i === existingIdx ? withId : w));
      return [...prev, withId];
    });

    if (userId) {
      upsertWorkout(userId, withId).catch(e =>
        logError('workouts.upsert.failed', { op: 'save', name: (e as Error)?.name }),
      );
    }
  }, [userId]);

  const updateWorkout = useCallback((index: number, workout: WorkoutData) => {
    let updated: WorkoutData | null = null;

    setWorkouts(prev =>
      prev.map((w, i) => {
        if (i !== index) return w;
        const next: WorkoutData = { ...workout, id: w.id ?? workout.id ?? generateId() };
        updated = next;
        return next;
      }),
    );

    if (userId && updated) {
      upsertWorkout(userId, updated).catch(e =>
        logError('workouts.upsert.failed', { op: 'update', name: (e as Error)?.name }),
      );
    }
  }, [userId]);

  const deleteWorkout = useCallback((index: number) => {
    let deletedId: string | undefined;

    setWorkouts(prev => {
      const target = prev[index];
      if (target) deletedId = target.id;
      return prev.filter((_, i) => i !== index);
    });

    if (userId && deletedId) {
      sbDeleteWorkout(userId, deletedId).catch(e =>
        logError('workouts.delete.failed', { name: (e as Error)?.name }),
      );
    }
  }, [userId]);

  return (
    <WorkoutContext.Provider
      value={{ workouts, saveWorkout, updateWorkout, deleteWorkout, isLoading }}
    >
      {children}
    </WorkoutContext.Provider>
  );
};

export const useWorkouts = () => {
  const context = useContext(WorkoutContext);
  if (!context) throw new Error('useWorkouts must be used within WorkoutProvider');
  return context;
};
