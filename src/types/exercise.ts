// src/types/exercise.ts

// --- Phase row mode (for warmup/cooldown rows) ---
export type PhaseRowMode = 'timed' | 'reps' | 'distance';

// --- Shared Base ---
export type ExerciseRowBase = {
  name: string;
  minutes: number;
  seconds: number;
  reps: number;
  done: boolean;
  mode?: PhaseRowMode;
  meters?: number;
  sectionCategory?: string;
};

// --- Warm-Up Types ---
export type WarmUpRowData = ExerciseRowBase;
export type WarmUpData = WarmUpRowData[];

// --- Cooldown Types ---
export type CooldownRowData = ExerciseRowBase;
export type CooldownData = CooldownRowData[];

// --- Workout Section Types ---
export type ExerciseMode = 'weight' | 'bodyweight' | 'timed' | 'distance';

export type WorkoutRowData = {
  sets: number;
  kg: number;
  reps: number;
  done: boolean;
  minutes?: number;
  seconds?: number;
  meters?: number;
};

export type WorkoutSectionData = {
  id: string;
  exerciseName: string;
  rows: WorkoutRowData[];
  restTimer?: number;
  exerciseMode?: ExerciseMode;
  linkedToNext?: boolean;
};

// --- Full Workout Type ---
export type WorkoutData = {
  id: string;            // stable unique ID — used as AsyncStorage key prefix
  workoutName: string;
  showWarmUp: boolean;
  showCooldown: boolean;
  sections: WorkoutSectionData[];
  warmUp?: WarmUpData;
  cooldown?: CooldownData;
  imported?: boolean;
  // ISO timestamp set whenever the user explicitly saves an edit. Compared
  // against the last session date so template edits override "previous set"
  // seeding when the user has just changed the plan.
  editedAt?: string;
};