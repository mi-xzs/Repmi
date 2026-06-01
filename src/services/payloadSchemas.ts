// src/services/payloadSchemas.ts
//
// SECURITY (H2 + H3) — strict Zod schemas for the JSONB blobs the client
// writes to (or reads from) Supabase across a trust boundary:
//
//   • `shared_workouts.workout_data` — written by a sharer, read by a
//     potentially-different importer. The sharer is untrusted from the
//     importer's perspective.
//   • `workout_sessions.exercises` + `duration` — written by the user's
//     own client, but a tampered client could otherwise inject arbitrary
//     values that flow into PR/volume/leaderboard derivations.
//
// Unlike the schemas in `cacheSchemas.ts` (which are intentionally
// `.loose()` so old local caches keep parsing), these are tight:
//   - bounded string lengths,
//   - bounded array sizes,
//   - bounded numeric ranges,
//   - finite-number guards (rejects NaN / Infinity that JSON allows in
//     some JS engines via JSON.stringify special cases).
//
// They are NOT a replacement for server-side validation (a SECURITY
// DEFINER RPC + pg_jsonschema constraint is the proper fix on the
// Supabase side) — they are the first line of defence and a tight
// contract for what the client is allowed to send.

import { z } from 'zod';

// ─── shared numeric / string primitives ─────────────────────────────────

const finiteNumber = z.number().refine(Number.isFinite, 'must be finite');

const boundedString = (maxLen: number) =>
  z.string().max(maxLen);

// ─── WorkoutData payload (shared-workout link contents) ─────────────────
//
// The bounds are deliberately generous for legitimate use but reject
// pathological payloads (100 KB names, 10k-set exercises, etc.).
// `.strict()` (= no unknown keys) means a tampered client cannot smuggle
// extra fields through this code path.

const WorkoutRowPayloadSchema = z.object({
  sets:    finiteNumber.min(0).max(1000),
  kg:      finiteNumber.min(0).max(2000),
  reps:    finiteNumber.min(0).max(10_000),
  done:    z.boolean(),
  minutes: finiteNumber.min(0).max(600).optional(),
  seconds: finiteNumber.min(0).max(3600).optional(),
  meters:  finiteNumber.min(0).max(1_000_000).optional(),
}).strict();

const WorkoutSectionPayloadSchema = z.object({
  id:           boundedString(100),
  exerciseName: boundedString(80),
  rows:         z.array(WorkoutRowPayloadSchema).max(100),
  restTimer:    finiteNumber.min(0).max(7200).optional(),
  exerciseMode: z.enum(['weight', 'bodyweight', 'timed', 'distance']).optional(),
  linkedToNext: z.boolean().optional(),
}).strict();

const PhaseRowPayloadSchema = z.object({
  name:            boundedString(80),
  minutes:         finiteNumber.min(0).max(600),
  seconds:         finiteNumber.min(0).max(3600),
  reps:            finiteNumber.min(0).max(10_000),
  done:            z.boolean(),
  mode:            z.enum(['timed', 'reps', 'distance']).optional(),
  meters:          finiteNumber.min(0).max(1_000_000).optional(),
  sectionCategory: boundedString(40).optional(),
}).strict();

export const WorkoutDataPayloadSchema = z.object({
  id:           boundedString(100),
  workoutName:  boundedString(80),
  showWarmUp:   z.boolean(),
  showCooldown: z.boolean(),
  sections:     z.array(WorkoutSectionPayloadSchema).max(50),
  warmUp:       z.array(PhaseRowPayloadSchema).max(30).optional(),
  cooldown:     z.array(PhaseRowPayloadSchema).max(30).optional(),
  imported:     z.boolean().optional(),
  editedAt:     boundedString(40).optional(),
}).strict();

// ─── WorkoutSession payload (workout_sessions row) ──────────────────────
//
// The session schema is what a *recorded* (completed) workout looks like —
// usually denser than the template (more sets, more exercises) but still
// bounded.

const SessionSetPayloadSchema = z.object({
  label:   boundedString(32),
  kg:      finiteNumber.min(0).max(2000).optional(),
  reps:    finiteNumber.min(0).max(10_000).optional(),
  minutes: finiteNumber.min(0).max(600).optional(),
  seconds: finiteNumber.min(0).max(3600).optional(),
  meters:  finiteNumber.min(0).max(1_000_000).optional(),
}).strict();

const SessionExercisePayloadSchema = z.object({
  name: boundedString(80),
  sets: z.array(SessionSetPayloadSchema).max(200),
}).strict();

export const WorkoutSessionPayloadSchema = z.object({
  // ISO 8601 timestamp; cap length to fit `2026-05-28T12:34:56.789Z` shape.
  date:      boundedString(40),
  // 6h ceiling (21,600 s) — way past any real session. Zero allowed (some
  // legacy rows were stamped with 0 duration before the timer-fix shipped).
  duration:  finiteNumber.min(0).max(21_600),
  exercises: z.array(SessionExercisePayloadSchema).max(100),
}).strict();
