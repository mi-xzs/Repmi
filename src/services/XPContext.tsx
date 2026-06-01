// src/services/XPContext.tsx
//
// XP is fully derived from `workout_sessions` in Supabase, so it transfers
// across devices automatically. We replay sessions chronologically to
// reconstruct the streak multiplier that would have applied at each session's
// time, then sum.
//
// Note: `hasRPE` is not preserved on the session record, so the +5 RPE bonus
// is not applied when deriving. The discrepancy vs. the original entry is
// at most 5 XP per session.
//
// Equipped season title moved to SettingsContext.

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { WorkoutSession } from '../screens/WorkoutScreen';
import { loadAllSessions as sbLoadAllSessions, migrateFromAsyncStorage, flushPendingSessions } from './sessionService';
import { updateProfileStats } from './profileService';
import { useWorkouts } from './WorkoutContext';
import {
  XPLogEntry,
  LevelInfo,
  LevelTitle,
  getLevelFromXP,
  getLevelTitle,
  getStreakMultiplier,
  computeSessionXP,
} from './xpService';
import { dayKey, getCurrentStreak, getLongestStreak } from '../utils/analyticsHelpers';
import { logError } from './logger';

// ─── Achievement Types ───────────────────────────────────────────────────────

export interface AchievementDef {
  id: string;
  xp: number;
  label: string;
  check: (ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  totalSessions: number;
  currentStreak: number;
  longestStreak: number;
  totalVolume: number;
  uniqueDays: number;
  earlyLateCount: number;
  uniqueExercises: number;
  prCount: number;
  longestSessionDuration: number;
}

// ─── Achievement Definitions ─────────────────────────────────────────────────

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'first',          xp: 25,  label: 'First Session',       check: (c) => c.totalSessions >= 1 },
  { id: '10sessions',     xp: 50,  label: '10 Sessions',         check: (c) => c.totalSessions >= 10 },
  { id: '50sessions',     xp: 150, label: '50 Sessions',         check: (c) => c.totalSessions >= 50 },
  { id: '100sessions',    xp: 300, label: '100 Sessions',        check: (c) => c.totalSessions >= 100 },
  { id: 'streak3',        xp: 30,  label: '3-Day Streak',        check: (c) => c.currentStreak >= 3 },
  { id: 'streak7',        xp: 75,  label: '7-Day Streak',        check: (c) => c.longestStreak >= 7 },
  { id: 'streak30',       xp: 200, label: '30-Day Streak',       check: (c) => c.longestStreak >= 30 },
  { id: 'volume10k',      xp: 50,  label: '10K Volume',          check: (c) => c.totalVolume >= 10000 },
  { id: 'volume100k',     xp: 150, label: '100K Volume',         check: (c) => c.totalVolume >= 100000 },
  { id: 'volume500k',     xp: 300, label: '500K Volume',         check: (c) => c.totalVolume >= 500000 },
  { id: 'consistency30',  xp: 75,  label: '30 Unique Days',      check: (c) => c.uniqueDays >= 30 },
  { id: 'early_late',     xp: 40,  label: 'Early Bird / Night Owl', check: (c) => c.earlyLateCount >= 10 },
  { id: 'variety',        xp: 50,  label: 'Exercise Variety',    check: (c) => c.uniqueExercises >= 10 },
  { id: 'pr5',            xp: 75,  label: '5 Personal Records',  check: (c) => c.prCount >= 5 },
  { id: 'marathon',       xp: 40,  label: 'Marathon Session',    check: (c) => c.longestSessionDuration > 5400 },
] as const;

// Re-export streak helpers so existing callers of XPContext keep working.
export { getCurrentStreak, getLongestStreak };

/**
 * Walk sessions chronologically, reconstructing the streak that would have
 * applied at each session's date.
 */
export function deriveXPLog(sessions: WorkoutSession[]): XPLogEntry[] {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const entries: XPLogEntry[] = [];
  let streak = 0;
  let lastKey: string | null = null;

  for (const session of sorted) {
    const date = new Date(session.date);
    const currKey = dayKey(date);

    if (currKey === lastKey) {
      // Same calendar day — streak unchanged.
    } else if (lastKey !== null) {
      const last = new Date(lastKey + 'T00:00:00');
      const curr = new Date(currKey + 'T00:00:00');
      const diffDays = Math.round((curr.getTime() - last.getTime()) / (24 * 60 * 60 * 1000));
      streak = diffDays === 1 ? streak + 1 : 1;
    } else {
      streak = 1;
    }
    lastKey = currKey;

    const { baseXP, breakdown } = computeSessionXP(session, false);
    const { multiplier } = getStreakMultiplier(streak);

    entries.push({
      date: session.date,
      workoutId: '',
      baseXP,
      streakMultiplier: multiplier,
      totalXP: Math.round(baseXP * multiplier),
      breakdown,
    });
  }

  return entries;
}

/**
 * Build an AchievementContext from all sessions across all workouts.
 */
function buildAchievementContext(
  allSessions: WorkoutSession[],
): AchievementContext {
  let totalVolume = 0;
  const uniqueDaysSet = new Set<string>();
  const exerciseNames = new Set<string>();
  let earlyLateCount = 0;
  let longestSessionDuration = 0;

  const maxKgByExercise: Record<string, number> = {};
  let prCount = 0;

  const sorted = [...allSessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  for (const session of sorted) {
    const sessionDate = new Date(session.date);
    uniqueDaysSet.add(dayKey(sessionDate));

    const hour = sessionDate.getHours();
    if (hour < 8 || hour >= 20) earlyLateCount++;

    if (session.duration > longestSessionDuration) {
      longestSessionDuration = session.duration;
    }

    for (const exercise of session.exercises) {
      if (exercise.name === 'Warm-up' || exercise.name === 'Cooldown') continue;
      exerciseNames.add(exercise.name);

      for (const set of exercise.sets) {
        if (set.label === 'W') continue;
        const vol = (set.kg ?? 0) * (set.reps ?? 0);
        totalVolume += vol;

        const kg = set.kg ?? 0;
        if (kg > 0) {
          const prevMax = maxKgByExercise[exercise.name] ?? 0;
          if (kg > prevMax) {
            if (prevMax > 0) prCount++;
            maxKgByExercise[exercise.name] = kg;
          }
        }
      }
    }
  }

  return {
    totalSessions: allSessions.length,
    currentStreak: getCurrentStreak(allSessions),
    longestStreak: getLongestStreak(allSessions),
    totalVolume,
    uniqueDays: uniqueDaysSet.size,
    earlyLateCount,
    uniqueExercises: exerciseNames.size,
    prCount,
    longestSessionDuration,
  };
}

/**
 * Compute total achievement XP from all sessions.
 */
export function computeAchievementXP(
  allSessions: WorkoutSession[],
): { total: number; earned: readonly AchievementDef[] } {
  const ctx = buildAchievementContext(allSessions);
  const earned = ACHIEVEMENTS.filter((a) => a.check(ctx));
  const total = earned.reduce((sum, a) => sum + a.xp, 0);
  return { total, earned };
}

// ─── Context Types ───────────────────────────────────────────────────────────

interface XPContextValue {
  xpLog: readonly XPLogEntry[];
  sessionXP: number;
  achievementXP: number;
  totalXP: number;
  levelInfo: LevelInfo;
  levelTitle: LevelTitle;
  isLoaded: boolean;
  addXPEntry: (entry: XPLogEntry) => Promise<void>;
  refreshAchievementXP: () => Promise<void>;
}

const XPContext = createContext<XPContextValue | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export function XPProvider({ children }: { children: ReactNode }) {
  const { workouts, isLoading: workoutsLoading } = useWorkouts();
  const { session: authSession, isLoading: authLoading } = useAuth();
  const userId = authSession?.user.id;

  const [xpLog, setXpLog] = useState<readonly XPLogEntry[]>([]);
  const [achievementXP, setAchievementXP] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  // ── Refresh everything from Supabase sessions ──────────────────────────────
  const refresh = useCallback(async () => {
    if (!userId) {
      setXpLog([]);
      setAchievementXP(0);
      return;
    }
    try {
      const sessions = await sbLoadAllSessions(userId);
      const log = deriveXPLog(sessions);
      setXpLog(log);
      const { total: achXP } = computeAchievementXP(sessions);
      setAchievementXP(achXP);

      // Write the full aggregate cache to profiles. The leaderboard
      // + view-profile screen read this so they never need access to
      // raw workout_sessions. Fire-and-forget — failure is logged
      // and doesn't affect the local user's view.
      // Staleness caveat: weekly_xp + streak are "as of last refresh."
      // For users who don't open the app, weekly_xp will overstate
      // until they refresh. Acceptable for v1.
      const sessionXP = log.reduce((s, e) => s + e.totalXP, 0);
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const weeklyXP = log.reduce((s, e) => {
        const t = new Date(e.date).getTime();
        return Number.isFinite(t) && t >= cutoff ? s + e.totalXP : s;
      }, 0);
      let totalVolumeKg = 0;
      let totalDurationSec = 0;
      let totalReps = 0;
      let totalSets = 0;
      // PR detection walks sessions chronologically so the same lift
      // counted once when a new heaviest weight lands on it. First
      // lift on an exercise doesn't count (no prior baseline).
      const sortedForPR = [...sessions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      const maxKgByExercise: Record<string, number> = {};
      let prCount = 0;
      for (const s of sortedForPR) {
        totalDurationSec += s.duration ?? 0;
        for (const exercise of s.exercises) {
          if (exercise.name === 'Warm-up' || exercise.name === 'Cooldown') continue;
          for (const set of exercise.sets) {
            if (set.label === 'W') continue;
            const kg = set.kg ?? 0;
            const reps = set.reps ?? 0;
            totalSets += 1;
            totalReps += reps;
            if (kg > 0 && reps > 0) totalVolumeKg += kg * reps;
            if (kg > 0) {
              const prev = maxKgByExercise[exercise.name] ?? 0;
              if (kg > prev) {
                if (prev > 0) prCount += 1;
                maxKgByExercise[exercise.name] = kg;
              }
            }
          }
        }
      }
      updateProfileStats(userId, {
        totalXP: sessionXP + achXP,
        weeklyXP,
        totalSessions: sessions.length,
        totalVolumeKg,
        totalDurationSec,
        currentStreak: getCurrentStreak(sessions),
        longestStreak: getLongestStreak(sessions),
        totalReps,
        totalSets,
        prCount,
      }).catch(e =>
        logError('xp.statsCache.write.failed', { name: (e as Error)?.name }),
      );
    } catch (e) {
      logError('xp.refresh.failed', { name: (e as Error)?.name });
    }
  }, [userId]);

  // ── Load on auth change ────────────────────────────────────────────────────
  //
  // Re-runs whenever the signed-in user changes (including sign-in after
  // mount, and sign-out → sign-in as a different user). A ref tracks which
  // user we've already initialized for so unrelated re-renders (e.g. workouts
  // list changes) don't trigger an extra Supabase round-trip.
  const initializedForRef = useRef<string | 'no-user' | null>(null);

  useEffect(() => {
    if (authLoading || workoutsLoading) return;

    const target = userId ?? 'no-user';
    if (initializedForRef.current === target) return;
    initializedForRef.current = target;

    let cancelled = false;

    (async () => {
      try {
        if (userId) {
          await migrateFromAsyncStorage(userId, workouts).catch(e =>
            logError('xp.sessionMigrate.failed', { name: (e as Error)?.name }),
          );
          await flushPendingSessions(userId).catch(e =>
            logError('xp.pendingFlush.failed', { name: (e as Error)?.name }),
          );
          if (cancelled) return;
          await refresh();
        } else {
          setXpLog([]);
          setAchievementXP(0);
        }
      } catch (e) {
        logError('xp.init.failed', { name: (e as Error)?.name });
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();

    return () => { cancelled = true; };
  }, [authLoading, workoutsLoading, userId, workouts, refresh]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const sessionXP = xpLog.reduce((sum, entry) => sum + entry.totalXP, 0);
  const totalXP = sessionXP + achievementXP;
  const levelInfo = getLevelFromXP(totalXP);
  const levelTitle = getLevelTitle(levelInfo.level);

  // ── Actions ────────────────────────────────────────────────────────────────
  //
  // `addXPEntry` now just triggers a refresh from Supabase. The session itself
  // is saved separately by the caller via `sessionService.saveSession`. The
  // `entry` argument is ignored (kept for call-site compatibility) — the
  // authoritative log is derived from sessions on every refresh.
  const addXPEntry = useCallback(async (_entry: XPLogEntry): Promise<void> => {
    await refresh();
  }, [refresh]);

  const refreshAchievementXP = useCallback(async (): Promise<void> => {
    await refresh();
  }, [refresh]);

  const value: XPContextValue = {
    xpLog,
    sessionXP,
    achievementXP,
    totalXP,
    levelInfo,
    levelTitle,
    isLoaded,
    addXPEntry,
    refreshAchievementXP,
  };

  return <XPContext.Provider value={value}>{children}</XPContext.Provider>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useXP(): XPContextValue {
  const context = useContext(XPContext);
  if (!context) {
    throw new Error('useXP must be used within an XPProvider');
  }
  return context;
}
