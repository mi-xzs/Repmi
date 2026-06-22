import { z } from 'zod';

// ─── shared numeric / string primitives ─────────────────────────────────

const finiteNumber = z.number().refine(Number.isFinite, 'must be finite');

const boundedString = (maxLen: number) =>
  z.string().max(maxLen);

// ─── WorkoutData payload (shared-workout link contents) ─────────────────

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
  date:      boundedString(40),
  duration:  finiteNumber.min(0).max(21_600),
  exercises: z.array(SessionExercisePayloadSchema).max(100),
}).strict();
