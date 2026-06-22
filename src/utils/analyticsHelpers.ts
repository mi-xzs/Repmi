import { WorkoutData } from "../types/exercise";
import { OverallData, RadarPoint, SessionSet } from "../types/analytics";
import { WorkoutSession } from "../screens/WorkoutScreen";

// ─── streak helpers ───────────────────────────────────────────────────────────

export function getCurrentStreak(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0;
  const trained = new Set(sessions.map((s) => dayKey(new Date(s.date))));
  let count = 0;
  const check = new Date();
  check.setHours(0, 0, 0, 0);
  while (trained.has(dayKey(check))) {
    count++;
    check.setDate(check.getDate() - 1);
  }
  return count;
}

export function getLongestStreak(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0;
  const uniqueDays = Array.from(
    new Set(sessions.map((s) => dayKey(new Date(s.date)))),
  ).sort();
  if (uniqueDays.length === 0) return 0;
  let longest = 1;
  let current = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const diffDays =
      (new Date(uniqueDays[i]).getTime() - new Date(uniqueDays[i - 1]).getTime()) /
      (1000 * 60 * 60 * 24);
    if (Math.abs(diffDays - 1) < 0.01) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

// formatting

export const formatWeight = (val: number): string =>
  `${val.toLocaleString("en-US")} kg`;

export const fmtVolume = (kg: number): string =>
  `${kg.toLocaleString()} kg`;

export const fmtDuration = (secs: number): string => {
  if (secs <= 0) return "—";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

// math helpers

export const avg = (arr: number[]): number =>
  arr.length
    ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
    : 0;

export const best = (arr: number[]): number =>
  arr.length ? Math.max(...arr) : 0;


export const dayKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};


// ─── muscle-group classification ──────────────────────────────────────────────

const MUSCLE_KEYWORDS: [string, string][] = [
  ["bench press",       "Chest"],
  ["chest press",       "Chest"],
  ["chest fly",         "Chest"],
  ["pec deck",          "Chest"],
  ["cable crossover",   "Chest"],
  ["push-up",           "Chest"],
  ["push up",           "Chest"],
  ["flye",              "Chest"],
  ["lat pulldown",      "Back"],
  ["lat pull",          "Back"],
  ["pull-up",           "Back"],
  ["pullup",            "Back"],
  ["pull up",           "Back"],
  ["chin-up",           "Back"],
  ["chin up",           "Back"],
  ["cable row",         "Back"],
  ["barbell row",       "Back"],
  ["dumbbell row",      "Back"],
  ["t-bar row",         "Back"],
  ["seated row",        "Back"],
  ["pullover",          "Back"],
  ["shoulder press",    "Shoulders"],
  ["overhead press",    "Shoulders"],
  ["military press",    "Shoulders"],
  ["lateral raise",     "Shoulders"],
  ["front raise",       "Shoulders"],
  ["rear delt",         "Shoulders"],
  ["arnold press",      "Shoulders"],
  ["leg curl",          "Hamstrings"],
  ["nordic curl",       "Hamstrings"],
  ["hamstring",         "Hamstrings"],
  ["romanian deadlift", "Hamstrings"],
  ["stiff leg",         "Hamstrings"],
  ["rdl",               "Hamstrings"],
  ["close grip bench",  "Triceps"],
  ["skull crusher",     "Triceps"],
  ["pushdown",          "Triceps"],
  ["tricep",            "Triceps"],
  ["curl",              "Biceps"],
  ["bicep",             "Biceps"],
  ["deadlift",          "Back"],
  ["hip thrust",        "Glutes"],
  ["glute bridge",      "Glutes"],
  ["glute",             "Glutes"],
  ["kickback",          "Glutes"],
  ["sumo squat",        "Glutes"],
  ["leg press",         "Quads"],
  ["leg extension",     "Quads"],
  ["hack squat",        "Quads"],
  ["front squat",       "Quads"],
  ["bulgarian split",   "Quads"],
  ["lunge",             "Quads"],
  ["squat",             "Quads"],
  ["calf raise",        "Calves"],
  ["calf",              "Calves"],
  ["plank",             "Core"],
  ["crunch",            "Core"],
  ["sit-up",            "Core"],
  ["sit up",            "Core"],
  ["ab rollout",        "Core"],
  ["russian twist",     "Core"],
  ["leg raise",         "Core"],
  ["hollow hold",       "Core"],
  ["cable crunch",      "Core"],
];

export function muscleForExercise(name: string): string | null {
  const lower = name.toLowerCase();
  for (const [keyword, muscle] of MUSCLE_KEYWORDS) {
    if (lower.includes(keyword)) return muscle;
  }
  return null;
}

export function muscleSetsFromTemplate(workout: WorkoutData | null): Record<string, number> {
  if (!workout) return {};
  const result: Record<string, number> = {};
  for (const sec of workout.sections) {
    if (!sec.exerciseName) continue;
    const muscle = muscleForExercise(sec.exerciseName);
    if (!muscle) continue;
    const workingSets = sec.rows.filter(r => r.sets > 0).length;
    if (workingSets > 0) result[muscle] = (result[muscle] ?? 0) + workingSets;
  }
  return result;
}

export const topExercises = (
  workout: WorkoutData
): { name: string; count: number }[] => {
  const freq: Record<string, number> = {};

  workout.sections.forEach((sec) => {
    const name = sec.exerciseName?.trim();
    if (name) freq[name] = (freq[name] ?? 0) + sec.rows.length;
  });

  return Object.entries(freq)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
};


export const fmtSetTooltip = (set: SessionSet): string => {
  const parts: string[] = [];

  if (set.kg   && set.kg   > 0) parts.push(`${set.kg} kg`);
  if (set.reps && set.reps > 0) parts.push(`${set.reps} reps`);

  if (set.minutes != null || set.seconds != null) {
    const mm = (set.minutes ?? 0).toString().padStart(2, "0");
    const ss = (set.seconds ?? 0).toString().padStart(2, "0");
    parts.push(`${mm}:${ss}`);
  }

  return parts.length > 0 ? parts.join(" · ") : "Done";
};


export const computeOverall = (
  workouts: WorkoutData[],
  allSessions: WorkoutSession[]
): OverallData => {
  let totalDuration = 0;
  let totalVolume   = 0;
  let totalReps     = 0;
  let totalSets     = 0;

  const volumeByExercise: Record<string, number> = {};
  const exerciseFreq:     Record<string, number> = {};

  allSessions.forEach((s) => {
    totalDuration += s.duration;

    const seenInSession = new Set<string>();
    s.exercises.forEach((ex) => {
      if (ex.name === "Warm-up" || ex.name === "Cooldown") return;

      ex.sets.forEach((set) => {
        if (set.label === "W") return;
        totalSets++;
        const reps = set.reps ?? 0;
        const kg   = set.kg   ?? 0;
        totalReps   += reps;
        totalVolume += kg * reps;
        volumeByExercise[ex.name] = (volumeByExercise[ex.name] ?? 0) + kg * reps;
      });

      if (!seenInSession.has(ex.name)) {
        seenInSession.add(ex.name);
        exerciseFreq[ex.name] = (exerciseFreq[ex.name] ?? 0) + 1;
      }
    });
  });

  const topExercisesByVolume = Object.entries(volumeByExercise)
    .map(([name, volume]) => ({ name, volume }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5);

  const topExercisesByFreq: RadarPoint[] = Object.entries(exerciseFreq)
    .map(([name, count]) => ({ label: name, value: count }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const cutoff       = Date.now() - 28 * 24 * 60 * 60 * 1000;
  const recentCount  = allSessions.filter((s) => new Date(s.date).getTime() > cutoff).length;
  const weeklyFrequency = Math.round((recentCount / 4) * 10) / 10;

  return {
    totalSessions:     allSessions.length,
    totalDuration,
    totalVolume:       Math.round(totalVolume),
    totalReps,
    totalSets,
    topExercisesByVolume,
    topExercisesByFreq,
    weeklyFrequency,
  };
};

