import { WorkoutSession, SessionSet } from '../screens/WorkoutScreen';
import { getExerciseMode } from '../constants/exerciseCatalog';
import { ExerciseMode } from '../types/exercise';

export const MIN_PACE_DISTANCE_M = 200;

export function setScore(s: SessionSet): number {
  const kg = s.kg ?? 0;
  const reps = s.reps ?? 0;
  if (kg > 0) return kg * reps;
  const secs = (s.minutes ?? 0) * 60 + (s.seconds ?? 0);
  if (secs > 0) return secs * 2;
  return reps * 10;
}

export function setMetric(s: SessionSet, mode?: ExerciseMode): number {
  if (mode === 'distance') {
    const m = s.meters ?? 0;
    if (m > 0) return m;
  }
  const kg = s.kg ?? 0;
  if (kg > 0) return kg;
  const secs = (s.minutes ?? 0) * 60 + (s.seconds ?? 0);
  if (secs > 0) return secs;
  return s.reps ?? 0;
}

function bestWorkingMetric(sets: SessionSet[], mode?: ExerciseMode): number {
  let max = 0;
  for (const s of sets) {
    if (s.label === 'W') continue;
    const v = setMetric(s, mode);
    if (v > max) max = v;
  }
  return max;
}

function bestWorkingSet(sets: SessionSet[], mode?: ExerciseMode): SessionSet | null {
  let best: SessionSet | null = null;
  let bestVal = 0;
  for (const s of sets) {
    if (s.label === 'W') continue;
    const v = setMetric(s, mode);
    if (v > bestVal) {
      bestVal = v;
      best = s;
    }
  }
  return best;
}

function sumWorkingMeters(sets: SessionSet[]): number {
  let total = 0;
  for (const s of sets) {
    if (s.label === 'W') continue;
    total += s.meters ?? 0;
  }
  return total;
}

function bestWorkingPace(sets: SessionSet[]): { paceMs: number; set: SessionSet | null } {
  let bestMs = 0;
  let bestSet: SessionSet | null = null;
  for (const s of sets) {
    if (s.label === 'W') continue;
    const m = s.meters ?? 0;
    const secs = (s.minutes ?? 0) * 60 + (s.seconds ?? 0);
    if (m < MIN_PACE_DISTANCE_M || secs <= 0) continue;
    const ms = m / secs;
    if (ms > bestMs) {
      bestMs = ms;
      bestSet = s;
    }
  }
  return { paceMs: bestMs, set: bestSet };
}

export type PRUnit = 'kg' | 'sec' | 'reps' | 'm' | 'pace';

export type PRScope = 'set' | 'session';

export interface PRDelta {
  delta: number;
  unit: PRUnit;
  prevBest: number;
  newBest: number;
  scope?: PRScope;
}

function unitOf(s: SessionSet, mode?: ExerciseMode): PRUnit {
  if (mode === 'distance' && (s.meters ?? 0) > 0) return 'm';
  if ((s.kg ?? 0) > 0) return 'kg';
  if (((s.minutes ?? 0) * 60 + (s.seconds ?? 0)) > 0) return 'sec';
  return 'reps';
}

function paceMsToSecPer500(paceMs: number): number {
  if (paceMs <= 0) return 0;
  return 500 / paceMs;
}

function formatSecPer500(sec: number): string {
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}/500m`;
}

function formatMeters(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)}km`;
  return `${Math.round(m)}m`;
}

export function formatPRDelta(d: PRDelta): string {
  if (d.unit === 'kg') return `+${+d.delta.toFixed(1)}kg`;
  if (d.unit === 'sec') {
    if (d.delta >= 60) {
      const m = Math.floor(d.delta / 60);
      const s = (d.delta % 60).toString().padStart(2, '0');
      return `+${m}:${s}`;
    }
    return `+${Math.round(d.delta)}s`;
  }
  if (d.unit === 'm') return `+${formatMeters(d.delta)}`;
  if (d.unit === 'pace') {
    const prevSec = paceMsToSecPer500(d.prevBest);
    const newSec = paceMsToSecPer500(d.newBest);
    const saved = prevSec - newSec;
    const total = Math.max(0, Math.round(saved));
    if (total >= 60) {
      const m = Math.floor(total / 60);
      const s = (total % 60).toString().padStart(2, '0');
      return `-${m}:${s}/500m`;
    }
    return `-${total}s/500m`;
  }
  return `+${Math.round(d.delta)} ${d.delta === 1 ? 'rep' : 'reps'}`;
}

export function formatPRValue(d: PRDelta): string {
  if (d.unit === 'kg') return `${+d.newBest.toFixed(1)}kg`;
  if (d.unit === 'sec') {
    if (d.newBest >= 60) {
      const m = Math.floor(d.newBest / 60);
      const s = (d.newBest % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    }
    return `${Math.round(d.newBest)}s`;
  }
  if (d.unit === 'm') return formatMeters(d.newBest);
  if (d.unit === 'pace') return formatSecPer500(paceMsToSecPer500(d.newBest));
  return `${d.newBest} ${d.newBest === 1 ? 'rep' : 'reps'}`;
}

const PR_UNIT_RANK: Record<PRUnit, number> = {
  kg: 0,
  pace: 1,
  m: 2,
  sec: 3,
  reps: 4,
};

export function pickHeadlinePR(
  prDeltas: ReadonlyMap<string, PRDelta>,
): { name: string; delta: PRDelta } | null {
  let best: { name: string; delta: PRDelta } | null = null;
  for (const [name, delta] of prDeltas) {
    if (!best) { best = { name, delta }; continue; }
    const curRank = PR_UNIT_RANK[delta.unit];
    const bestRank = PR_UNIT_RANK[best.delta.unit];
    if (curRank < bestRank) best = { name, delta };
    else if (curRank === bestRank && delta.newBest > best.delta.newBest) {
      best = { name, delta };
    }
  }
  return best;
}

type PriorAggregates = {
  bestSet: Record<string, number>;
  bestSetMeters: Record<string, number>;
  bestPaceMs: Record<string, number>;
  bestSessionMeters: Record<string, number>;
};

function buildPriorAggregates(priorSessions: WorkoutSession[]): PriorAggregates {
  const bestSet: Record<string, number> = {};
  const bestSetMeters: Record<string, number> = {};
  const bestPaceMs: Record<string, number> = {};
  const bestSessionMeters: Record<string, number> = {};
  for (const session of priorSessions) {
    for (const ex of session.exercises) {
      if (ex.name === 'Warm-up' || ex.name === 'Cooldown') continue;
      const mode = getExerciseMode(ex.name);
      const best = bestWorkingMetric(ex.sets, mode);
      if (best > (bestSet[ex.name] ?? 0)) bestSet[ex.name] = best;
      if (mode === 'distance') {
        let maxMeters = 0;
        for (const s of ex.sets) {
          if (s.label === 'W') continue;
          if ((s.meters ?? 0) > maxMeters) maxMeters = s.meters ?? 0;
        }
        if (maxMeters > (bestSetMeters[ex.name] ?? 0)) bestSetMeters[ex.name] = maxMeters;

        const { paceMs } = bestWorkingPace(ex.sets);
        if (paceMs > (bestPaceMs[ex.name] ?? 0)) bestPaceMs[ex.name] = paceMs;

        const total = sumWorkingMeters(ex.sets);
        if (total > (bestSessionMeters[ex.name] ?? 0)) bestSessionMeters[ex.name] = total;
      }
    }
  }
  return { bestSet, bestSetMeters, bestPaceMs, bestSessionMeters };
}

export function findPRDeltas(
  currentSession: WorkoutSession,
  priorSessions: WorkoutSession[],
): Map<string, PRDelta> {
  const prior = buildPriorAggregates(priorSessions);

  const result = new Map<string, PRDelta>();
  for (const ex of currentSession.exercises) {
    if (ex.name === 'Warm-up' || ex.name === 'Cooldown') continue;
    const mode = getExerciseMode(ex.name);

    // ── 1. Canonical "best set" PR (mode-aware: kg, sec, reps, or m). ──
    const prev = prior.bestSet[ex.name] ?? 0;
    const bestSet = bestWorkingSet(ex.sets, mode);
    let candidate: PRDelta | null = null;
    if (prev > 0 && bestSet) {
      const newBest = setMetric(bestSet, mode);
      if (newBest > prev) {
        candidate = {
          delta: newBest - prev,
          unit: unitOf(bestSet, mode),
          prevBest: prev,
          newBest,
          scope: 'set',
        };
      }
    }

    if (mode === 'distance') {
      // ── 2. Fastest Pace PR ──
      const prevPaceMs = prior.bestPaceMs[ex.name] ?? 0;
      const { paceMs } = bestWorkingPace(ex.sets);
      if (prevPaceMs > 0 && paceMs > prevPaceMs) {
        const pacePR: PRDelta = {
          delta: paceMs - prevPaceMs,
          unit: 'pace',
          prevBest: prevPaceMs,
          newBest: paceMs,
          scope: 'set',
        };
        if (!candidate || PR_UNIT_RANK['pace'] < PR_UNIT_RANK[candidate.unit]) {
          candidate = pacePR;
        }
      }

      // ── 3. Session Distance PR (sum of meters across working sets). ──
      const prevSessionMeters = prior.bestSessionMeters[ex.name] ?? 0;
      const currentSessionMeters = sumWorkingMeters(ex.sets);
      if (prevSessionMeters > 0 && currentSessionMeters > prevSessionMeters) {
        const sessionPR: PRDelta = {
          delta: currentSessionMeters - prevSessionMeters,
          unit: 'm',
          prevBest: prevSessionMeters,
          newBest: currentSessionMeters,
          scope: 'session',
        };
        if (!candidate) {
          candidate = sessionPR;
        }
      }
    }

    if (candidate) result.set(ex.name, candidate);
  }
  return result;
}
