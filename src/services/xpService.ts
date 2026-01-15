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
  progress: number; // 0..1
}

export interface LevelTitle {
  title: string;
  color: string;
}

// ─── XP Calculation ───────────────────────────────────────────────────────────

/**
 * Compute XP earned for a completed workout session.
 *
 * Working sets: sets whose label is NOT 'W' (warm-up marker).
 * Warm-up and Cooldown exercises are excluded from volume/set counts
 * by their exercise position — here we detect them by checking that
 * ALL sets on the exercise carry a 'W' or 'C' prefix label.
 * Per spec, label !== 'W' is the working-set criterion, which covers
 * numbered sets ("1", "2" …) and excludes warm-up sets.
 */
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
        // Weighted: classic volume
        totalVolume += kg * reps;
      } else if (secs > 0) {
        // Timed: each second = 2 volume units (1 min ≈ 1.2 XP)
        totalVolume += secs * 2;
      } else if (reps > 0) {
        // Bodyweight: 10 virtual kg per rep (10 reps ≈ 1 XP)
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

/**
 * XP required to advance from level N to level N+1.
 *
 * Level 1 → 2 requires 100 XP (base case, N=1 treated as N<2).
 * Level N → N+1 requires 100 + (N-1)*50 XP for N >= 2.
 *
 * Per spec: "XP for level N = 100 + (N-2)*50 (for N >= 2)"
 * This means the threshold stored AT level N is what you need to leave it.
 * We iterate cumulatively until the running total exceeds totalXP.
 */
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
      // Player is somewhere inside this level
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
//
// Single source of truth for which rarity tier an achievement falls into.
// Used by AchievementsScreen for visual tokens and by coinService for payout.

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
  // NOTE: non-component module — can't react to the equipped cosmetic theme.
  // Inlined accent colors fall back to the mint-green default.
  if (level >= 15) return { title: 'Champion', color: '#00FA9A' };
  if (level >= 10) return { title: 'Warrior', color: '#00C97A' };
  if (level >= 6)  return { title: 'Athlete', color: colors.highlight };
  if (level >= 3)  return { title: 'Regular', color: colors.titleText };
  return { title: 'Rookie', color: colors.button1 };
}
