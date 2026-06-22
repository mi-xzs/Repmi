import { WorkoutSession } from '../screens/WorkoutScreen';
import { dayKey } from '../utils/analyticsHelpers';
import { getStreakMultiplier, rarityFromXP, Rarity } from './xpService';

// ─── Tuning constants ────────────────────────────────────────────────────────

export const SIGNUP_SEED_COINS        = 25;
export const PER_WORKOUT_BASE_COINS   = 3;
export const PR_BONUS_COINS           = 3;
export const WEEKLY_CONSISTENCY_BONUS = 15;
export const WEEKLY_GOAL_WORKOUTS     = 4;

const COINS_BY_RARITY: Record<Rarity, number> = {
  common:    15,
  uncommon:  30,
  rare:      75,
  epic:      175,
  legendary: 400,
};

const STREAK_MILESTONE_REWARDS = [
  { threshold: 7,   coins: 30  },
  { threshold: 30,  coins: 100 },
  { threshold: 100, coins: 250 },
] as const;

// ─── Achievement coins ───────────────────────────────────────────────────────

export function getCoinsForAchievement(achievementXP: number): number {
  return COINS_BY_RARITY[rarityFromXP(achievementXP)];
}

// ─── Level-up coins ──────────────────────────────────────────────────────────

export function getCoinsForLevelUp(levelReached: number): number {
  if (levelReached === 25) return 400;
  if (levelReached === 3 || levelReached === 6 || levelReached === 10 || levelReached === 20) {
    return 125;
  }
  if (levelReached === 5 || levelReached === 15) return 50;
  return 10;
}

export function totalLevelUpCoins(currentLevel: number): number {
  let total = 0;
  for (let lvl = 2; lvl <= currentLevel; lvl++) {
    total += getCoinsForLevelUp(lvl);
  }
  return total;
}

// ─── Streak milestone coins (one-time per crossed threshold) ─────────────────

export function getStreakMilestoneCoins(longestStreak: number): number {
  let total = 0;
  for (const { threshold, coins } of STREAK_MILESTONE_REWARDS) {
    if (longestStreak >= threshold) total += coins;
  }
  return total;
}

// ─── Per-workout coins ───────────────────────────────────────────────────────

export interface SessionCoinBreakdown {
  base: number;
  streakBonus: number;
  prBonus: number;
  total: number;
}

export function computeSessionCoins(
  streakMultiplier: number,
  hasPR: boolean,
  isFirstWorkoutOfDay: boolean,
): SessionCoinBreakdown {
  if (!isFirstWorkoutOfDay) {
    return { base: 0, streakBonus: 0, prBonus: 0, total: 0 };
  }
  const base = PER_WORKOUT_BASE_COINS;
  const withStreak = Math.round(base * streakMultiplier);
  const streakBonus = withStreak - base;
  const prBonus = hasPR ? PR_BONUS_COINS : 0;
  return { base, streakBonus, prBonus, total: withStreak + prBonus };
}

// ─── Session walk (workout coins + weekly bonus) ─────────────────────────────

function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

interface SessionWalkResult {
  workoutCoins: number;
  weeklyBonusCoins: number;
}

function walkSessionsForWorkoutCoins(sessions: readonly WorkoutSession[]): SessionWalkResult {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  let streak = 0;
  let lastDayKey: string | null = null;
  const maxKgByExercise: Record<string, number> = {};
  const weekDaysMap = new Map<string, Set<string>>();

  let workoutCoins = 0;

  for (const session of sorted) {
    const date = new Date(session.date);
    const currKey = dayKey(date);
    const isFirstOfDay = currKey !== lastDayKey;

    if (currKey === lastDayKey) {
    } else if (lastDayKey !== null) {
      const last = new Date(lastDayKey + 'T00:00:00');
      const curr = new Date(currKey + 'T00:00:00');
      const diffDays = Math.round((curr.getTime() - last.getTime()) / 86400000);
      streak = diffDays === 1 ? streak + 1 : 1;
    } else {
      streak = 1;
    }
    lastDayKey = currKey;

    let hasPR = false;
    let workingSetCount = 0;
    for (const exercise of session.exercises) {
      if (exercise.name === 'Warm-up' || exercise.name === 'Cooldown') continue;
      for (const set of exercise.sets) {
        if (set.label === 'W') continue;
        workingSetCount++;
        const kg = set.kg ?? 0;
        if (kg <= 0) continue;
        const prevMax = maxKgByExercise[exercise.name] ?? 0;
        if (kg > prevMax) {
          if (prevMax > 0) hasPR = true;
          maxKgByExercise[exercise.name] = kg;
        }
      }
    }

    if (workingSetCount > 0) {
      const { multiplier } = getStreakMultiplier(streak);
      workoutCoins += computeSessionCoins(multiplier, hasPR, isFirstOfDay).total;
    }

    const weekKey = isoWeekKey(date);
    let weekDays = weekDaysMap.get(weekKey);
    if (!weekDays) {
      weekDays = new Set();
      weekDaysMap.set(weekKey, weekDays);
    }
    weekDays.add(currKey);
  }

  let weeklyBonusCoins = 0;
  for (const days of weekDaysMap.values()) {
    if (days.size >= WEEKLY_GOAL_WORKOUTS) weeklyBonusCoins += WEEKLY_CONSISTENCY_BONUS;
  }

  return { workoutCoins, weeklyBonusCoins };
}

// ─── Top-level total derivation ──────────────────────────────────────────────

export interface CoinBreakdown {
  seed: number;
  workouts: number;
  achievements: number;
  levelUps: number;
  streakMilestones: number;
  weeklyBonuses: number;
}

export interface CoinTotals extends CoinBreakdown {
  total: number;
}

export function deriveCoinTotal(args: {
  sessions: readonly WorkoutSession[];
  currentLevel: number;
  earnedAchievementXPs: readonly number[];
  longestStreak: number;
}): CoinTotals {
  const { sessions, currentLevel, earnedAchievementXPs, longestStreak } = args;

  const seed = SIGNUP_SEED_COINS;
  const { workoutCoins, weeklyBonusCoins } = walkSessionsForWorkoutCoins(sessions);
  const achievements = earnedAchievementXPs.reduce(
    (sum, xp) => sum + getCoinsForAchievement(xp),
    0,
  );
  const levelUps = totalLevelUpCoins(currentLevel);
  const streakMilestones = getStreakMilestoneCoins(longestStreak);

  const total =
    seed + workoutCoins + achievements + levelUps + streakMilestones + weeklyBonusCoins;

  return {
    seed,
    workouts: workoutCoins,
    achievements,
    levelUps,
    streakMilestones,
    weeklyBonuses: weeklyBonusCoins,
    total,
  };
}
