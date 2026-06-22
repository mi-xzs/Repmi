import { WorkoutSession } from '../screens/WorkoutScreen';
import { colors } from '../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface XPBreakdown {
  showUp: number;
  volume: number;
  sets: number;
  duration: number;
  rpe: number;
}

export interface XPLogEntry {
  date: string;
  workoutId: string;
  baseXP: number;
  streakMultiplier: number;
  totalXP: number;
  breakdown: XPBreakdown;
}

export interface LevelInfo {
  level: number;
  currentLevelXP: number;
  xpForNextLevel: number;
  progress: number;
}

export interface LevelTitle {
  title: string;
  color: string;
}

// ─── XP Calculation ───────────────────────────────────────────────────────────

export function computeSessionXP(
  session: WorkoutSession,
  hasRPE: boolean,
): { baseXP: number; breakdown: XPBreakdown } {
  let totalVolume = 0;
  let workingSetCount = 0;

  for (const exercise of session.exercises) {
    if (exercise.name === 'Warm-up' || exercise.name === 'Cooldown') continue;

    for (const set of exercise.sets) {
      if (set.label === 'W') continue;

      workingSetCount++;
      const kg   = set.kg ?? 0;
      const reps = set.reps ?? 0;
      const secs = (set.minutes ?? 0) * 60 + (set.seconds ?? 0);

      if (kg > 0) {
        totalVolume += kg * reps;
      } else if (secs > 0) {
        totalVolume += secs * 2;
      } else if (reps > 0) {
        totalVolume += reps * 10;
      }
    }
  }

  if (workingSetCount === 0) {
    return {
      baseXP: 0,
      breakdown: { showUp: 0, volume: 0, sets: 0, duration: 0, rpe: 0 },
    };
  }

  const breakdown: XPBreakdown = {
    showUp: 25,
    volume: Math.floor(totalVolume / 100),
    sets: workingSetCount * 3,
    duration: Math.min(Math.floor(session.duration / 300), 12),
    rpe: hasRPE ? 5 : 0,
  };

  const baseXP =
    breakdown.showUp +
    breakdown.volume +
    breakdown.sets +
    breakdown.duration +
    breakdown.rpe;

  return { baseXP, breakdown };
}

// ─── Streak Multiplier ────────────────────────────────────────────────────────

export function getStreakMultiplier(
  currentStreak: number,
): { multiplier: number; label: string | null } {
  if (currentStreak >= 7) return { multiplier: 2.0, label: 'Beast mode' };
  if (currentStreak >= 5) return { multiplier: 1.5, label: 'Unstoppable' };
  if (currentStreak >= 3) return { multiplier: 1.25, label: 'Hat trick' };
  if (currentStreak === 2) return { multiplier: 1.1, label: 'On a roll' };
  return { multiplier: 1.0, label: null };
}

// ─── Leveling ─────────────────────────────────────────────────────────────────

function xpRequiredForLevel(level: number): number {
  if (level < 2) return 100;
  return 100 + (level - 2) * 50;
}

export function getLevelFromXP(totalXP: number): LevelInfo {
  let level = 1;
  let cumulative = 0;

  while (true) {
    const xpForThisLevel = xpRequiredForLevel(level);
    if (cumulative + xpForThisLevel > totalXP) {
      const currentLevelXP = totalXP - cumulative;
      const progress = currentLevelXP / xpForThisLevel;
      return {
        level,
        currentLevelXP,
        xpForNextLevel: xpForThisLevel,
        progress: Math.min(Math.max(progress, 0), 1),
      };
    }
    cumulative += xpForThisLevel;
    level++;
  }
}

// ─── Rarity (derived from achievement XP) ─────────────────────────────────────

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export function rarityFromXP(xp: number): Rarity {
  if (xp >= 201) return 'legendary';
  if (xp >= 101) return 'epic';
  if (xp >= 51)  return 'rare';
  if (xp >= 30)  return 'uncommon';
  return 'common';
}

// ─── Level Titles ─────────────────────────────────────────────────────────────

export function getLevelTitle(level: number): LevelTitle {
  if (level >= 25) return { title: 'Mythic', color: colors.fav };
  if (level >= 20) return { title: 'Legend', color: colors.warning };
  if (level >= 15) return { title: 'Champion', color: '#00FA9A' };
  if (level >= 10) return { title: 'Warrior', color: '#00C97A' };
  if (level >= 6)  return { title: 'Athlete', color: colors.highlight };
  if (level >= 3)  return { title: 'Regular', color: colors.titleText };
  return { title: 'Rookie', color: colors.button1 };
}
