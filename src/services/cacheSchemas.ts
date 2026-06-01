// src/services/cacheSchemas.ts
//
// M6 — Zod schemas for everything we read out of AsyncStorage /
// SecureStore via `JSON.parse(...)`.
//
// SECURITY: The local cache (AsyncStorage + SecureStore) is writeable
// by the device owner. Two practical consequences:
//
//   1. A rooted / jailbroken device can rewrite a cache blob with
//      arbitrary JSON. Without schema validation we'd blindly feed
//      whatever the attacker wrote into React state — potentially
//      crashing the app, leaking misformatted data into XP/coin
//      calculations, or letting a malformed payload reach Supabase
//      writes verbatim.
//   2. A corrupted cache (broken JSON, half-written blob from a
//      crashed write) shouldn't brick the app on next launch — we
//      should be able to drop the blob and start fresh.
//
// These schemas defend against BOTH (1) and (2). The cache is NOT a
// trust boundary — RLS on the Supabase side is the actual access
// control. The schemas are a robustness + sanity layer.
//
// API pattern at every call site:
//
//   const raw = await secureGet(KEY);
//   if (!raw) return DEFAULT;
//   const parsed = safeJsonParse(raw);
//   const result = WorkoutSchema.array().safeParse(parsed);
//   if (!result.success) {
//     logCacheCorruption(KEY);
//     await secureRemove(KEY);            // drop the bad blob
//     return DEFAULT;
//   }
//   return result.data;
//
// Schemas use `.passthrough()` where the upstream type may evolve so
// we don't reject older clients' cache blobs that include extra
// fields — only the REQUIRED shape is enforced.

import { z } from 'zod';

// ─── helpers ────────────────────────────────────────────────────────────

/**
 * Tolerant JSON.parse that returns `undefined` instead of throwing on
 * malformed input. Pair with `Schema.safeParse(...)` to get a uniform
 * `{ success: false }` result for both broken-JSON and shape-mismatch
 * cases.
 */
export function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

// ─── Workout / Workouts cache ───────────────────────────────────────────
//
// Cache key: `workouts` (SecureStore). Contains the full list of the
// user's workout templates, mirrored from the Supabase `workouts` table
// for offline reads.

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
//
// Cache key: `pending_sessions_v1` (SecureStore). Queue of workout
// sessions that failed to upload immediately and need to be retried.

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
//
// Cache key: `favoriteWorkouts` (legacy AsyncStorage; migrated to
// `user_settings.favorite_workout_ids` on first launch). A plain
// string-array.

export const FavoritesArraySchema = z.array(z.string());

// `deletedWorkoutIds` — legacy AsyncStorage key, drained on the
// one-shot session-migration path. Same shape as favorites.
export const DeletedWorkoutIdsSchema = z.array(z.string());

// ─── Settings extra blob ────────────────────────────────────────────────
//
// Cache key: row in Supabase `user_settings.extra` (jsonb). Not strictly
// a cache, but the same schema discipline applies — we don't want a
// malformed `extra` blob to break Settings rendering.

export const SettingsExtraSchema = z.object({
  // C1 — `publicProfile` previously lived here; it's now on
  // `profiles.is_public_profile` (the column RLS reads). Kept in
  // `.loose()` shape so older clients' cache blobs still parse.
  openFollows: z.boolean().optional(),
  waterTrackerEnabled: z.boolean().optional(),
  spentCoins: z.number().optional(),
  ownedThemes: z.array(z.string()).optional(),
  equippedThemeId: z.union([z.string(), z.null()]).optional(),
  crashReportingEnabled: z.boolean().optional(),
}).loose();

// ─── Water intake (per-day, per-user) ───────────────────────────────────
//
// Cache key: `water-ml:<userId>:<YYYY-MM-DD>` (SecureStore). A single
// integer literal. Worth schema-validating because a corrupted value
// (e.g. "NaN" written by a previous bug) would otherwise propagate into
// arithmetic.

export const WaterIntakeSchema = z.number().int().nonnegative();
