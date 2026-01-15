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

const CACHE_KEY = 'workouts';  // legacy AsyncStorage key, reused as a write-through cache

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
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(CACHE_KEY)
      .then(raw => {
        if (cancelled || !raw) return;
        try {
          const parsed: WorkoutData[] = JSON.parse(raw);
          const migrated = parsed.map(w => (w.id ? w : { ...w, id: generateId() }));
          setWorkouts(migrated);
        } catch (e) {
          console.error('WorkoutContext: corrupt workout cache', e);
        }
      })
      .catch(e => console.error('WorkoutContext: cache read failed', e));
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
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(remote));
      } catch (e) {
        console.error('WorkoutContext: Supabase sync failed', e);
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
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify(workouts)).catch(e =>
      console.error('WorkoutContext: cache write failed', e),
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
        console.error('WorkoutContext: upsert failed (saveWorkout)', e),
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
        console.error('WorkoutContext: upsert failed (updateWorkout)', e),
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
        console.error('WorkoutContext: delete failed', e),
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
