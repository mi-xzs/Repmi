import { z } from 'zod';

// ─── helpers ────────────────────────────────────────────────────────────

export function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

// ─── Workout / Workouts cache ───────────────────────────────────────────

const WorkoutRowSchema = z.object({
  sets: z.number(),
  kg: z.number(),
  reps: z.number(),
  done: z.boolean(),
  minutes: z.number().optional(),
  seconds: z.number().optional(),
  meters: z.number().optional(),
}).loose();

const WorkoutSectionSchema = z.object({
  id: z.string(),
  exerciseName: z.string(),
  rows: z.array(WorkoutRowSchema),
  restTimer: z.number().optional(),
  exerciseMode: z.string().optional(),
  linkedToNext: z.boolean().optional(),
}).loose();

const PhaseRowSchema = z.object({
  name: z.string(),
  minutes: z.number(),
  seconds: z.number(),
  reps: z.number(),
  done: z.boolean(),
  mode: z.string().optional(),
  meters: z.number().optional(),
  sectionCategory: z.string().optional(),
}).loose();

export const WorkoutSchema = z.object({
  id: z.string(),
  workoutName: z.string(),
  showWarmUp: z.boolean(),
  showCooldown: z.boolean(),
  sections: z.array(WorkoutSectionSchema),
  warmUp: z.array(PhaseRowSchema).optional(),
  cooldown: z.array(PhaseRowSchema).optional(),
  imported: z.boolean().optional(),
  editedAt: z.string().optional(),
}).loose();

export const WorkoutsCacheSchema = z.array(WorkoutSchema);

// ─── Workout session / pending-session cache ────────────────────────────

const SessionSetSchema = z.object({
  label: z.string(),
  kg: z.number().optional(),
  reps: z.number().optional(),
  minutes: z.number().optional(),
  seconds: z.number().optional(),
  meters: z.number().optional(),
}).loose();

const SessionExerciseSchema = z.object({
  name: z.string(),
  sets: z.array(SessionSetSchema),
}).loose();

export const WorkoutSessionSchema = z.object({
  date: z.string(),
  duration: z.number(),
  exercises: z.array(SessionExerciseSchema),
}).loose();

export const PendingSessionSchema = z.object({
  workoutId: z.string(),
  session: WorkoutSessionSchema,
}).loose();

export const PendingSessionsCacheSchema = z.array(PendingSessionSchema);

// ─── Settings / favorites migration ─────────────────────────────────────

export const FavoritesArraySchema = z.array(z.string());

export const DeletedWorkoutIdsSchema = z.array(z.string());

// ─── Settings extra blob ────────────────────────────────────────────────

export const SettingsExtraSchema = z.object({
  openFollows: z.boolean().optional(),
  waterTrackerEnabled: z.boolean().optional(),
  spentCoins: z.number().optional(),
  ownedThemes: z.array(z.string()).optional(),
  equippedThemeId: z.union([z.string(), z.null()]).optional(),
  crashReportingEnabled: z.boolean().optional(),
}).loose();

// ─── Water intake (per-day, per-user) ───────────────────────────────────

export const WaterIntakeSchema = z.number().int().nonnegative();
