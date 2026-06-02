// src/constants/exerciseCatalog.ts
//
// Canonical exercise catalog — 600+ entries spanning all major muscle groups,
// equipment types, and movement patterns.
//
// Used by ExercisePickerModal (mid-workout exercise selection / swap),
// and indirectly by anything that needs to look up an exercise's default
// `mode` or muscle assignment.

import { ExerciseMode } from '../types/exercise';

export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Biceps'
  | 'Triceps'
  | 'Forearms'
  | 'Quads'
  | 'Hamstrings'
  | 'Glutes'
  | 'Adductors'
  | 'Calves'
  | 'Core'
  | 'Obliques'
  | 'Lower Back'
  | 'Cardio'
  | 'Full Body';

export type Equipment =
  | 'Barbell'
  | 'Dumbbell'
  | 'EZ Bar'
  | 'Kettlebell'
  | 'Cable'
  | 'Machine'
  | 'Smith Machine'
  | 'Bodyweight'
  | 'Bands'
  | 'Cardio Machine'
  | 'Other';

export type ExerciseTag = 'compound' | 'isolation' | 'unilateral';

// Training style — separates *what* the exercise is from *what muscle* it
// trains. Undefined defaults to general strength (most lifting entries).
// Used by the picker to optionally filter by training style.
export type ExerciseStyle =
  | 'plyometric'
  | 'calisthenics'
  | 'olympic'
  | 'powerlifting'
  | 'cardio'
  | 'mobility';

export type Exercise = {
  name: string;
  muscle: MuscleGroup;
  equipment: Equipment;
  mode: ExerciseMode;
  tags?: ExerciseTag[];
  style?: ExerciseStyle;
};

// ─── Catalog ──────────────────────────────────────────────────────────────────
// Grouped by muscle for readability. Order within a muscle is rough movement /
// equipment progression — not alphabetical — so callers that render the catalog
// directly get a sensible default ordering.

export const EXERCISE_CATALOG: Exercise[] = [
  // ── Chest ───────────────────────────────────────────────────────────────────
  { name: 'Barbell Bench Press', muscle: 'Chest', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Incline Barbell Bench Press', muscle: 'Chest', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Decline Barbell Bench Press', muscle: 'Chest', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Close-Grip Bench Press', muscle: 'Triceps', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Wide-Grip Bench Press', muscle: 'Chest', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Reverse-Grip Barbell Bench Press', muscle: 'Chest', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Floor Press', muscle: 'Chest', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Paused Bench Press', muscle: 'Chest', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Spoto Press', muscle: 'Chest', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Board Press', muscle: 'Chest', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Larsen Press', muscle: 'Chest', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Dumbbell Bench Press', muscle: 'Chest', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Incline Dumbbell Press', muscle: 'Chest', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Decline Dumbbell Press', muscle: 'Chest', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Neutral-Grip Dumbbell Press', muscle: 'Chest', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Incline Neutral-Grip Dumbbell Press', muscle: 'Chest', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Single-Arm Dumbbell Bench Press', muscle: 'Chest', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Dumbbell Floor Press', muscle: 'Chest', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Dumbbell Squeeze Press', muscle: 'Chest', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Dumbbell Fly', muscle: 'Chest', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Incline Dumbbell Fly', muscle: 'Chest', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Decline Dumbbell Fly', muscle: 'Chest', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Svend Press', muscle: 'Chest', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Cable Crossover', muscle: 'Chest', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'High-to-Low Cable Fly', muscle: 'Chest', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Low-to-High Cable Fly', muscle: 'Chest', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Mid Cable Fly', muscle: 'Chest', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Single-Arm Cable Fly', muscle: 'Chest', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Incline Cable Fly', muscle: 'Chest', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Decline Cable Fly', muscle: 'Chest', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Cable Chest Press', muscle: 'Chest', equipment: 'Cable', mode: 'weight', tags: ['compound'] },
  { name: 'Standing Cable Chest Press', muscle: 'Chest', equipment: 'Cable', mode: 'weight', tags: ['compound'] },
  { name: 'Incline Cable Chest Press', muscle: 'Chest', equipment: 'Cable', mode: 'weight', tags: ['compound'] },
  { name: 'Machine Chest Press', muscle: 'Chest', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Incline Machine Chest Press', muscle: 'Chest', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Decline Machine Chest Press', muscle: 'Chest', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Hammer Strength Chest Press', muscle: 'Chest', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Single-Arm Machine Chest Press', muscle: 'Chest', equipment: 'Machine', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Pec Deck', muscle: 'Chest', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Machine Chest Fly', muscle: 'Chest', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Assisted Dip Machine', muscle: 'Chest', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Smith Machine Bench Press', muscle: 'Chest', equipment: 'Smith Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Smith Machine Incline Press', muscle: 'Chest', equipment: 'Smith Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Smith Machine Decline Press', muscle: 'Chest', equipment: 'Smith Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Smith Machine Close-Grip Bench Press', muscle: 'Triceps', equipment: 'Smith Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Kettlebell Floor Press', muscle: 'Chest', equipment: 'Kettlebell', mode: 'weight', tags: ['compound'] },
  { name: 'Single-Arm Kettlebell Floor Press', muscle: 'Chest', equipment: 'Kettlebell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Push-Up', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Incline Push-Up', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Decline Push-Up', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Wide Push-Up', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Archer Push-Up', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound', 'unilateral'] },
  { name: 'Deficit Push-Up', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Weighted Push-Up', muscle: 'Chest', equipment: 'Bodyweight', mode: 'weight', tags: ['compound'] },
  { name: 'Ring Push-Up', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Pseudo Planche Push-Up', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Plyometric Push-Up', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Chest Dip', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Weighted Chest Dip', muscle: 'Chest', equipment: 'Bodyweight', mode: 'weight', tags: ['compound'] },
  { name: 'Ring Dip', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Banded Push-Up', muscle: 'Chest', equipment: 'Bands', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Band Chest Press', muscle: 'Chest', equipment: 'Bands', mode: 'weight', tags: ['compound'] },
  { name: 'Band Chest Fly', muscle: 'Chest', equipment: 'Bands', mode: 'weight', tags: ['isolation'] },

  // ── Back ────────────────────────────────────────────────────────────────────
  { name: 'Pull-Up', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Chin-Up', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Neutral-Grip Pull-Up', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Wide-Grip Pull-Up', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Weighted Pull-Up', muscle: 'Back', equipment: 'Bodyweight', mode: 'weight', tags: ['compound'] },
  { name: 'Weighted Chin-Up', muscle: 'Back', equipment: 'Bodyweight', mode: 'weight', tags: ['compound'] },
  { name: 'Scapular Pull-Up', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Negative Pull-Up', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Assisted Pull-Up', muscle: 'Back', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Band-Assisted Pull-Up', muscle: 'Back', equipment: 'Bands', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Lat Pulldown', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['compound'] },
  { name: 'Wide-Grip Lat Pulldown', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['compound'] },
  { name: 'Close-Grip Lat Pulldown', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['compound'] },
  { name: 'Neutral-Grip Lat Pulldown', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['compound'] },
  { name: 'Reverse-Grip Lat Pulldown', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['compound'] },
  { name: 'Single-Arm Lat Pulldown', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Straight-Arm Pulldown', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Machine Lat Pulldown', muscle: 'Back', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Plate-Loaded Pulldown', muscle: 'Back', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Barbell Row', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Underhand Barbell Row', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Pendlay Row', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Yates Row', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'T-Bar Row', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Chest-Supported T-Bar Row', muscle: 'Back', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Landmine Row', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Landmine T-Bar Row', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Seal Row', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Meadows Row', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Dumbbell Row', muscle: 'Back', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Chest-Supported Dumbbell Row', muscle: 'Back', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Incline Dumbbell Row', muscle: 'Back', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Kroc Row', muscle: 'Back', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Renegade Row', muscle: 'Back', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Kettlebell Row', muscle: 'Back', equipment: 'Kettlebell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Gorilla Row', muscle: 'Back', equipment: 'Kettlebell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Seated Cable Row', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['compound'] },
  { name: 'Wide-Grip Seated Cable Row', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['compound'] },
  { name: 'Single-Arm Cable Row', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Standing Cable Row', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['compound'] },
  { name: 'Machine Row', muscle: 'Back', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Hammer Strength Row', muscle: 'Back', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'High Row Machine', muscle: 'Back', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Low Row Machine', muscle: 'Back', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Iso-Lateral Row', muscle: 'Back', equipment: 'Machine', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Inverted Row', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Smith Machine Row', muscle: 'Back', equipment: 'Smith Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Banded Row', muscle: 'Back', equipment: 'Bands', mode: 'weight', tags: ['compound'] },
  { name: 'Banded Lat Pulldown', muscle: 'Back', equipment: 'Bands', mode: 'weight', tags: ['compound'] },
  { name: 'Banded Straight-Arm Pulldown', muscle: 'Back', equipment: 'Bands', mode: 'weight', tags: ['isolation'] },
  { name: 'Conventional Deadlift', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Deficit Deadlift', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Snatch-Grip Deadlift', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Snatch-Grip High Pull', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Rack Pull', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Block Pull', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Paused Deadlift', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Trap Bar Deadlift', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Barbell Shrug', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Behind-the-Back Barbell Shrug', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Trap Bar Shrug', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Dumbbell Shrug', muscle: 'Back', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Smith Machine Shrug', muscle: 'Back', equipment: 'Smith Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Cable Shrug', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Machine Shrug', muscle: 'Back', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Dumbbell Pullover', muscle: 'Back', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Cable Pullover', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Machine Pullover', muscle: 'Back', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },

  // ── Shoulders ───────────────────────────────────────────────────────────────
  { name: 'Overhead Press', muscle: 'Shoulders', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Military Press', muscle: 'Shoulders', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Push Press', muscle: 'Shoulders', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Behind-the-Neck Press', muscle: 'Shoulders', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Seated Barbell Overhead Press', muscle: 'Shoulders', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Bradford Press', muscle: 'Shoulders', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Barbell Upright Row', muscle: 'Shoulders', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Barbell Front Raise', muscle: 'Shoulders', equipment: 'Barbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Landmine Press', muscle: 'Shoulders', equipment: 'Barbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Z Press', muscle: 'Shoulders', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Seated Dumbbell Shoulder Press', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Standing Dumbbell Shoulder Press', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Arnold Press', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Single-Arm Dumbbell Shoulder Press', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Dumbbell Cuban Press', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Dumbbell Lateral Raise', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Seated Dumbbell Lateral Raise', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Leaning Dumbbell Lateral Raise', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Dumbbell Scaption Raise', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Dumbbell Front Raise', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Bent-Over Dumbbell Reverse Fly', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Incline Dumbbell Rear Delt Fly', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Dumbbell Upright Row', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Lying Dumbbell Lateral Raise', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Dumbbell Y-Raise', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Dumbbell W-Raise', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Plate Front Raise', muscle: 'Shoulders', equipment: 'Other', mode: 'weight', tags: ['isolation'] },
  { name: 'Bus Driver', muscle: 'Shoulders', equipment: 'Other', mode: 'weight', tags: ['isolation'] },
  { name: 'Cable Lateral Raise', muscle: 'Shoulders', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Egyptian Lateral Raise', muscle: 'Shoulders', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Bayesian Cable Lateral Raise', muscle: 'Shoulders', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Lying Cable Lateral Raise', muscle: 'Shoulders', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Behind-the-Back Cable Lateral Raise', muscle: 'Shoulders', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Cable Front Raise', muscle: 'Shoulders', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Single-Arm Cable Front Raise', muscle: 'Shoulders', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Cable Rear Delt Fly', muscle: 'Shoulders', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Single-Arm Cable Rear Delt Fly', muscle: 'Shoulders', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Cable Upright Row', muscle: 'Shoulders', equipment: 'Cable', mode: 'weight', tags: ['compound'] },
  { name: 'Cable Y-Raise', muscle: 'Shoulders', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Face Pull', muscle: 'Shoulders', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Cable External Rotation', muscle: 'Shoulders', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Machine Shoulder Press', muscle: 'Shoulders', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Plate-Loaded Shoulder Press', muscle: 'Shoulders', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Machine Lateral Raise', muscle: 'Shoulders', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Single-Arm Machine Lateral Raise', muscle: 'Shoulders', equipment: 'Machine', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Reverse Pec Deck', muscle: 'Shoulders', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Machine Rear Delt Fly', muscle: 'Shoulders', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Smith Machine Overhead Press', muscle: 'Shoulders', equipment: 'Smith Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Smith Machine Behind-the-Neck Press', muscle: 'Shoulders', equipment: 'Smith Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Smith Machine Upright Row', muscle: 'Shoulders', equipment: 'Smith Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Kettlebell Overhead Press', muscle: 'Shoulders', equipment: 'Kettlebell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Kettlebell Push Press', muscle: 'Shoulders', equipment: 'Kettlebell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Kettlebell Bottoms-Up Press', muscle: 'Shoulders', equipment: 'Kettlebell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Pike Push-Up', muscle: 'Shoulders', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Handstand Push-Up', muscle: 'Shoulders', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Wall Walk', muscle: 'Shoulders', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Band Lateral Raise', muscle: 'Shoulders', equipment: 'Bands', mode: 'weight', tags: ['isolation'] },
  { name: 'Band Front Raise', muscle: 'Shoulders', equipment: 'Bands', mode: 'weight', tags: ['isolation'] },
  { name: 'Band Pull-Apart', muscle: 'Shoulders', equipment: 'Bands', mode: 'weight', tags: ['isolation'] },
  { name: 'Band Face Pull', muscle: 'Shoulders', equipment: 'Bands', mode: 'weight', tags: ['isolation'] },
  { name: 'Band Reverse Fly', muscle: 'Shoulders', equipment: 'Bands', mode: 'weight', tags: ['isolation'] },
  { name: 'Band Overhead Press', muscle: 'Shoulders', equipment: 'Bands', mode: 'weight', tags: ['compound'] },

  // ── Biceps ──────────────────────────────────────────────────────────────────
  { name: 'Barbell Curl', muscle: 'Biceps', equipment: 'Barbell', mode: 'weight', tags: ['isolation'] },
  { name: 'EZ Bar Curl', muscle: 'Biceps', equipment: 'EZ Bar', mode: 'weight', tags: ['isolation'] },
  { name: 'Reverse Barbell Curl', muscle: 'Biceps', equipment: 'Barbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Dumbbell Curl', muscle: 'Biceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Alternating Dumbbell Curl', muscle: 'Biceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Hammer Curl', muscle: 'Biceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Cross-Body Hammer Curl', muscle: 'Biceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Reverse Dumbbell Curl', muscle: 'Biceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Waiter Curl', muscle: 'Biceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Preacher Curl', muscle: 'Biceps', equipment: 'EZ Bar', mode: 'weight', tags: ['isolation'] },
  { name: 'Dumbbell Preacher Curl', muscle: 'Biceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Machine Preacher Curl', muscle: 'Biceps', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Cable Preacher Curl', muscle: 'Biceps', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Incline Dumbbell Curl', muscle: 'Biceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Concentration Curl', muscle: 'Biceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Spider Curl', muscle: 'Biceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Cable Curl', muscle: 'Biceps', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Cable Rope Hammer Curl', muscle: 'Biceps', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Single-Arm Cable Curl', muscle: 'Biceps', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Bayesian Cable Curl', muscle: 'Biceps', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Behind-the-Back Cable Curl', muscle: 'Biceps', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Reverse-Grip Cable Curl', muscle: 'Biceps', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'High Cable Curl', muscle: 'Biceps', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Machine Bicep Curl', muscle: 'Biceps', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Plate-Loaded Bicep Curl', muscle: 'Biceps', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Drag Curl', muscle: 'Biceps', equipment: 'Barbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Zottman Curl', muscle: 'Biceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: '21s', muscle: 'Biceps', equipment: 'Barbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Reverse Curl', muscle: 'Biceps', equipment: 'EZ Bar', mode: 'weight', tags: ['isolation'] },
  { name: 'Resistance Band Curl', muscle: 'Biceps', equipment: 'Bands', mode: 'weight', tags: ['isolation'] },

  // ── Triceps ─────────────────────────────────────────────────────────────────
  { name: 'Dips', muscle: 'Triceps', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Weighted Dips', muscle: 'Triceps', equipment: 'Bodyweight', mode: 'weight', tags: ['compound'] },
  { name: 'Bench Dips', muscle: 'Triceps', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Tricep Pushdown (Rope)', muscle: 'Triceps', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Tricep Pushdown (Bar)', muscle: 'Triceps', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Tricep Pushdown (V-Bar)', muscle: 'Triceps', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Reverse-Grip Tricep Pushdown', muscle: 'Triceps', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Single-Arm Cable Pushdown', muscle: 'Triceps', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Overhead Cable Tricep Extension', muscle: 'Triceps', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Single-Arm Overhead Cable Extension', muscle: 'Triceps', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Rope Overhead Tricep Extension', muscle: 'Triceps', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Lying Cable Tricep Extension', muscle: 'Triceps', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Cross-Body Cable Tricep Extension', muscle: 'Triceps', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Skull Crusher', muscle: 'Triceps', equipment: 'EZ Bar', mode: 'weight', tags: ['isolation'] },
  { name: 'Dumbbell Skull Crusher', muscle: 'Triceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Overhead Tricep Extension', muscle: 'Triceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Single-Arm Overhead Tricep Extension', muscle: 'Triceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Tricep Kickback', muscle: 'Triceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Cable Tricep Kickback', muscle: 'Triceps', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'JM Press', muscle: 'Triceps', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'California Press', muscle: 'Triceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Diamond Push-Up', muscle: 'Triceps', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Close-Grip Push-Up', muscle: 'Triceps', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'French Press', muscle: 'Triceps', equipment: 'EZ Bar', mode: 'weight', tags: ['isolation'] },
  { name: 'Tate Press', muscle: 'Triceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Tricep Dip Machine', muscle: 'Triceps', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Tricep Extension Machine', muscle: 'Triceps', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Resistance Band Pushdown', muscle: 'Triceps', equipment: 'Bands', mode: 'weight', tags: ['isolation'] },

  // ── Forearms ────────────────────────────────────────────────────────────────
  { name: 'Wrist Curl', muscle: 'Forearms', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Barbell Wrist Curl', muscle: 'Forearms', equipment: 'Barbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Reverse Wrist Curl', muscle: 'Forearms', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Barbell Reverse Wrist Curl', muscle: 'Forearms', equipment: 'Barbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Behind-the-Back Wrist Curl', muscle: 'Forearms', equipment: 'Barbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Cable Wrist Curl', muscle: 'Forearms', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Reverse Cable Wrist Curl', muscle: 'Forearms', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: "Farmer's Walk", muscle: 'Forearms', equipment: 'Dumbbell', mode: 'distance', tags: ['compound'] },
  { name: 'Suitcase Carry', muscle: 'Forearms', equipment: 'Dumbbell', mode: 'distance', tags: ['compound', 'unilateral'] },
  { name: 'Plate Pinch Hold', muscle: 'Forearms', equipment: 'Other', mode: 'timed', tags: ['isolation'] },
  { name: 'Hex Hold', muscle: 'Forearms', equipment: 'Dumbbell', mode: 'timed', tags: ['isolation'] },
  { name: 'Fat Grip Hold', muscle: 'Forearms', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'] },
  { name: 'Wrist Roller', muscle: 'Forearms', equipment: 'Other', mode: 'weight', tags: ['isolation'] },
  { name: 'Dead Hang', muscle: 'Forearms', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'] },
  { name: 'Towel Dead Hang', muscle: 'Forearms', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'] },
  { name: 'Towel Pull-Up', muscle: 'Forearms', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Grip Strengthener', muscle: 'Forearms', equipment: 'Other', mode: 'timed', tags: ['isolation'] },
  { name: 'Captains of Crush', muscle: 'Forearms', equipment: 'Other', mode: 'weight', tags: ['isolation'] },
  { name: 'Rice Bucket', muscle: 'Forearms', equipment: 'Other', mode: 'timed', tags: ['isolation'] },

  // ── Quads ───────────────────────────────────────────────────────────────────
  { name: 'Barbell Back Squat', muscle: 'Quads', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'High-Bar Back Squat', muscle: 'Quads', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Low-Bar Back Squat', muscle: 'Quads', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Front Squat', muscle: 'Quads', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Box Squat', muscle: 'Quads', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Pause Squat', muscle: 'Quads', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Zercher Squat', muscle: 'Quads', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Overhead Squat', muscle: 'Quads', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Cyclist Squat', muscle: 'Quads', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Kang Squat', muscle: 'Quads', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Smith Machine Squat', muscle: 'Quads', equipment: 'Smith Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Leg Press', muscle: 'Quads', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Hack Squat', muscle: 'Quads', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Pendulum Squat', muscle: 'Quads', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Belt Squat', muscle: 'Quads', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Leg Extension', muscle: 'Quads', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Single-Leg Leg Extension', muscle: 'Quads', equipment: 'Machine', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Adductor Machine', muscle: 'Adductors', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Goblet Squat', muscle: 'Quads', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Goblet Squat (Kettlebell)', muscle: 'Quads', equipment: 'Kettlebell', mode: 'weight', tags: ['compound'] },
  { name: 'Dumbbell Bulgarian Split Squat', muscle: 'Quads', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Barbell Bulgarian Split Squat', muscle: 'Quads', equipment: 'Barbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Smith Machine Bulgarian Split Squat', muscle: 'Quads', equipment: 'Smith Machine', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Dumbbell Walking Lunge', muscle: 'Quads', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Barbell Walking Lunge', muscle: 'Quads', equipment: 'Barbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Dumbbell Reverse Lunge', muscle: 'Quads', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Barbell Reverse Lunge', muscle: 'Quads', equipment: 'Barbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Deficit Reverse Lunge', muscle: 'Quads', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Dumbbell Stationary Lunge', muscle: 'Quads', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Smith Machine Lunge', muscle: 'Quads', equipment: 'Smith Machine', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Curtsy Lunge', muscle: 'Quads', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Dumbbell Step-Up', muscle: 'Quads', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Bodyweight Squat', muscle: 'Quads', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Bodyweight Lunge', muscle: 'Quads', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound', 'unilateral'] },
  { name: 'Cossack Squat', muscle: 'Quads', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound', 'unilateral'] },
  { name: 'ATG Split Squat', muscle: 'Quads', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound', 'unilateral'] },
  { name: 'Pistol Squat', muscle: 'Quads', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound', 'unilateral'] },
  { name: 'Shrimp Squat', muscle: 'Quads', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound', 'unilateral'] },
  { name: 'Skater Squat', muscle: 'Quads', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound', 'unilateral'] },
  { name: 'Sissy Squat', muscle: 'Quads', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Reverse Nordic Curl', muscle: 'Quads', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Wall Sit', muscle: 'Quads', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'] },
  { name: 'Banded Squat', muscle: 'Quads', equipment: 'Bands', mode: 'weight', tags: ['compound'] },
  // Bilateral squat-pattern jumps (loaded + unloaded) → Quads
  { name: 'Jump Squat', muscle: 'Quads', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Jumping Lunge', muscle: 'Quads', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Standing Vertical Jump', muscle: 'Quads', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Approach Vertical Jump', muscle: 'Quads', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Squat Jump (Static Start)', muscle: 'Quads', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Countermovement Jump', muscle: 'Quads', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Pause Jump Squat', muscle: 'Quads', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Scissor Jump', muscle: 'Quads', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Continuous Box Jump', muscle: 'Quads', equipment: 'Other', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Lateral Box Jump', muscle: 'Quads', equipment: 'Other', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Seated Box Jump', muscle: 'Quads', equipment: 'Other', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Bench Jump', muscle: 'Quads', equipment: 'Other', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Banded Jump Squat', muscle: 'Quads', equipment: 'Bands', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Trap Bar Jump', muscle: 'Quads', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Barbell Jump Squat', muscle: 'Quads', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Dumbbell Jump Squat', muscle: 'Quads', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },

  // ── Hamstrings ──────────────────────────────────────────────────────────────
  { name: 'Romanian Deadlift', muscle: 'Hamstrings', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Deficit Romanian Deadlift', muscle: 'Hamstrings', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Stiff-Leg Deadlift', muscle: 'Hamstrings', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Good Morning', muscle: 'Hamstrings', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Seated Good Morning', muscle: 'Hamstrings', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Zercher Good Morning', muscle: 'Hamstrings', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Dumbbell Romanian Deadlift', muscle: 'Hamstrings', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Dumbbell Stiff-Leg Deadlift', muscle: 'Hamstrings', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Single-Leg Romanian Deadlift', muscle: 'Hamstrings', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Kettlebell Romanian Deadlift', muscle: 'Hamstrings', equipment: 'Kettlebell', mode: 'weight', tags: ['compound'] },
  { name: 'Single-Leg Kettlebell RDL', muscle: 'Hamstrings', equipment: 'Kettlebell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Smith Machine Romanian Deadlift', muscle: 'Hamstrings', equipment: 'Smith Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Cable Pull-Through', muscle: 'Hamstrings', equipment: 'Cable', mode: 'weight', tags: ['compound'] },
  { name: 'Lying Leg Curl', muscle: 'Hamstrings', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Seated Leg Curl', muscle: 'Hamstrings', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Standing Leg Curl', muscle: 'Hamstrings', equipment: 'Machine', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Single-Leg Lying Leg Curl', muscle: 'Hamstrings', equipment: 'Machine', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Nordic Curl', muscle: 'Hamstrings', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Banded Nordic Curl', muscle: 'Hamstrings', equipment: 'Bands', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Glute-Ham Raise', muscle: 'Hamstrings', equipment: 'Machine', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Slider Leg Curl', muscle: 'Hamstrings', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Stability Ball Leg Curl', muscle: 'Hamstrings', equipment: 'Other', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Banded Leg Curl', muscle: 'Hamstrings', equipment: 'Bands', mode: 'weight', tags: ['isolation'] },

  // ── Glutes ──────────────────────────────────────────────────────────────────
  { name: 'Barbell Hip Thrust', muscle: 'Glutes', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'B-Stance Hip Thrust', muscle: 'Glutes', equipment: 'Barbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Dumbbell Hip Thrust', muscle: 'Glutes', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Single-Leg Hip Thrust', muscle: 'Glutes', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound', 'unilateral'] },
  { name: 'Machine Hip Thrust', muscle: 'Glutes', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Smith Machine Hip Thrust', muscle: 'Glutes', equipment: 'Smith Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Barbell Glute Bridge', muscle: 'Glutes', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Bodyweight Glute Bridge', muscle: 'Glutes', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Frog Pump', muscle: 'Glutes', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Weighted Frog Pump', muscle: 'Glutes', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'B-Stance Romanian Deadlift', muscle: 'Glutes', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Sumo Deadlift', muscle: 'Glutes', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Cable Glute Kickback', muscle: 'Glutes', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Machine Glute Kickback', muscle: 'Glutes', equipment: 'Machine', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Bodyweight Glute Kickback', muscle: 'Glutes', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation', 'unilateral'] },
  { name: 'Hip Abduction Machine', muscle: 'Glutes', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Cable Hip Abduction', muscle: 'Glutes', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Cable Hip Adduction', muscle: 'Adductors', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Copenhagen Plank', muscle: 'Adductors', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation', 'unilateral'] },
  { name: 'Banded Clamshell', muscle: 'Glutes', equipment: 'Bands', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Fire Hydrant', muscle: 'Glutes', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation', 'unilateral'] },
  { name: 'Banded Lateral Walk', muscle: 'Glutes', equipment: 'Bands', mode: 'weight', tags: ['isolation'] },
  { name: 'Banded Hip Thrust', muscle: 'Glutes', equipment: 'Bands', mode: 'weight', tags: ['compound'] },
  // Unilateral plyometrics → Glutes (frontal/lateral plane glute-med dominant)
  { name: 'Skater Jumps', muscle: 'Glutes', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound', 'unilateral'] },
  { name: 'Lateral Bound', muscle: 'Glutes', equipment: 'Bodyweight', mode: 'distance', tags: ['compound', 'unilateral'] },
  { name: 'Single-Leg Bound', muscle: 'Glutes', equipment: 'Bodyweight', mode: 'distance', tags: ['compound', 'unilateral'] },
  { name: 'Single-Leg Box Jump', muscle: 'Glutes', equipment: 'Other', mode: 'bodyweight', tags: ['compound', 'unilateral'] },
  { name: 'Single-Leg Broad Jump', muscle: 'Glutes', equipment: 'Bodyweight', mode: 'distance', tags: ['compound', 'unilateral'] },
  { name: 'Split Squat Jump', muscle: 'Glutes', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound', 'unilateral'] },
  { name: 'Kettlebell Swing to Jump', muscle: 'Glutes', equipment: 'Kettlebell', mode: 'weight', tags: ['compound'] },

  // ── Calves ──────────────────────────────────────────────────────────────────
  { name: 'Standing Calf Raise (Machine)', muscle: 'Calves', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Barbell Standing Calf Raise', muscle: 'Calves', equipment: 'Barbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Dumbbell Standing Calf Raise', muscle: 'Calves', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Smith Machine Calf Raise', muscle: 'Calves', equipment: 'Smith Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Seated Calf Raise', muscle: 'Calves', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Seated Dumbbell Calf Raise', muscle: 'Calves', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Donkey Calf Raise', muscle: 'Calves', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Calf Raise (Bodyweight)', muscle: 'Calves', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Single-Leg Calf Raise', muscle: 'Calves', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation', 'unilateral'] },
  { name: 'Single-Leg Dumbbell Calf Raise', muscle: 'Calves', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Leg Press Calf Raise', muscle: 'Calves', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Single-Leg Leg Press Calf Raise', muscle: 'Calves', equipment: 'Machine', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Hack Squat Calf Raise', muscle: 'Calves', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Tibialis Raise', muscle: 'Calves', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Weighted Tibialis Raise', muscle: 'Calves', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Tibialis Raise (Machine)', muscle: 'Calves', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Farmer Walk on Toes', muscle: 'Calves', equipment: 'Dumbbell', mode: 'distance', tags: ['isolation'] },
  { name: 'Banded Calf Raise', muscle: 'Calves', equipment: 'Bands', mode: 'weight', tags: ['isolation'] },
  // Reactive low-amplitude hops (ankle-stiffness dominant) → Calves
  { name: 'Pogo Hops', muscle: 'Calves', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Single-Leg Pogo Hops', muscle: 'Calves', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation', 'unilateral'] },
  { name: 'Ankle Hops', muscle: 'Calves', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Hurdle Hops', muscle: 'Calves', equipment: 'Other', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Lateral Hurdle Hops', muscle: 'Calves', equipment: 'Other', mode: 'bodyweight', tags: ['compound'] },

  // ── Core ────────────────────────────────────────────────────────────────────
  { name: 'Plank', muscle: 'Core', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'] },
  { name: 'Weighted Plank', muscle: 'Core', equipment: 'Other', mode: 'timed', tags: ['isolation'] },
  { name: 'Plank Shoulder Tap', muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Plank Up-Down', muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Hollow Hold', muscle: 'Core', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'] },
  { name: 'Dead Bug', muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Bear Crawl', muscle: 'Core', equipment: 'Bodyweight', mode: 'timed', tags: ['compound'] },
  { name: 'Crunch', muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Reverse Crunch', muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Sit-Up', muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Decline Sit-Up', muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Weighted Decline Sit-Up', muscle: 'Core', equipment: 'Other', mode: 'weight', tags: ['isolation'] },
  { name: 'GHD Sit-Up', muscle: 'Core', equipment: 'Machine', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Toe Reach', muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Cable Crunch', muscle: 'Core', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Standing Cable Crunch', muscle: 'Core', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Machine Crunch', muscle: 'Core', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Hanging Leg Raise', muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Hanging Knee Raise', muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: "Captain's Chair Leg Raise", muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Lying Leg Raise', muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Flutter Kicks', muscle: 'Core', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'] },
  { name: 'Scissor Kicks', muscle: 'Core', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'] },
  { name: 'V-Up', muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Ab Wheel Rollout', muscle: 'Core', equipment: 'Other', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Stir the Pot', muscle: 'Core', equipment: 'Other', mode: 'timed', tags: ['isolation'] },
  { name: 'Pallof Press', muscle: 'Core', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Banded Pallof Press', muscle: 'Core', equipment: 'Bands', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Mountain Climbers', muscle: 'Core', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'] },
  { name: 'Toes-to-Bar', muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Dragon Flag', muscle: 'Core', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'] },
  { name: 'Dragon Flag Negative', muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'L-Sit', muscle: 'Core', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'] },
  { name: 'Overhead Carry', muscle: 'Core', equipment: 'Dumbbell', mode: 'distance', tags: ['compound'] },
  { name: 'Front-Rack Carry', muscle: 'Core', equipment: 'Kettlebell', mode: 'distance', tags: ['compound'] },

  // ── Obliques ────────────────────────────────────────────────────────────────
  { name: 'Side Plank', muscle: 'Obliques', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation', 'unilateral'] },
  { name: 'Side Plank with Hip Dip', muscle: 'Obliques', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation', 'unilateral'] },
  { name: 'Side Plank with Reach Through', muscle: 'Obliques', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation', 'unilateral'] },
  { name: 'Russian Twist', muscle: 'Obliques', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Weighted Russian Twist', muscle: 'Obliques', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Heel Touches', muscle: 'Obliques', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Cable Woodchopper (High to Low)', muscle: 'Obliques', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Cable Woodchopper (Low to High)', muscle: 'Obliques', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Cable Horizontal Chop', muscle: 'Obliques', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Cable Side Bend', muscle: 'Obliques', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Dumbbell Side Bend', muscle: 'Obliques', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Landmine Twist', muscle: 'Obliques', equipment: 'Barbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Oblique Crunch', muscle: 'Obliques', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Bicycle Crunch', muscle: 'Obliques', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Hanging Windshield Wiper', muscle: 'Obliques', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Lying Windshield Wiper', muscle: 'Obliques', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Windmill', muscle: 'Obliques', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation', 'unilateral'] },

  // ── Lower Back ──────────────────────────────────────────────────────────────
  { name: '45-Degree Hyperextension', muscle: 'Lower Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Horizontal Hyperextension', muscle: 'Lower Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Weighted Hyperextension', muscle: 'Lower Back', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Back Extension', muscle: 'Lower Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Reverse Hyperextension', muscle: 'Lower Back', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Banded Good Morning', muscle: 'Lower Back', equipment: 'Bands', mode: 'weight', tags: ['compound'] },
  { name: 'Superman', muscle: 'Lower Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Bird Dog', muscle: 'Lower Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation', 'unilateral'] },
  { name: 'Cat-Cow', muscle: 'Lower Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Jefferson Curl', muscle: 'Lower Back', equipment: 'Barbell', mode: 'weight', tags: ['isolation'] },

  // ── Cardio ──────────────────────────────────────────────────────────────────
  { name: 'Treadmill Walk', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance' },
  { name: 'Treadmill Incline Walk', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance' },
  { name: 'Treadmill Run', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance' },
  { name: 'Treadmill Sprint', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance' },
  { name: 'Curved Treadmill Sprint', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance' },
  { name: 'Air Runner', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance' },
  { name: 'Stationary Bike', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance' },
  { name: 'Upright Bike', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance' },
  { name: 'Recumbent Bike', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance' },
  { name: 'Spin Bike', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance' },
  { name: 'Assault Bike', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance', tags: ['compound'] },
  { name: 'Bike Erg', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance', tags: ['compound'] },
  { name: 'Rowing Machine', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance', tags: ['compound'] },
  { name: 'Ski Erg', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance', tags: ['compound'] },
  { name: 'Stair Climber', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance' },
  { name: 'Step Mill', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance' },
  { name: 'Elliptical', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance' },
  { name: 'Arc Trainer', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance' },
  { name: 'VersaClimber', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'timed', tags: ['compound'] },
  { name: 'Jacobs Ladder', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'timed', tags: ['compound'] },
  { name: 'Wingate Test', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'timed' },
  { name: 'Jump Rope', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'timed' },
  { name: 'Double Unders', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'timed' },
  { name: 'Jump Rope Crossovers', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'timed' },
  { name: 'Jumping Jacks', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'timed' },
  { name: 'High Knees', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'timed' },
  { name: 'Butt Kicks', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'timed' },
  { name: 'A-Skip', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance' },
  { name: 'B-Skip', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance' },
  { name: 'Power Skip', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance', tags: ['compound'] },
  { name: 'Burpees', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'timed', tags: ['compound'] },
  { name: 'Shadow Boxing', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'timed' },
  { name: 'Heavy Bag Work', muscle: 'Cardio', equipment: 'Other', mode: 'timed', tags: ['compound'] },
  { name: 'Speed Bag', muscle: 'Cardio', equipment: 'Other', mode: 'timed' },
  { name: 'Double-End Bag', muscle: 'Cardio', equipment: 'Other', mode: 'timed' },
  { name: 'Pad Work', muscle: 'Cardio', equipment: 'Other', mode: 'timed', tags: ['compound'] },
  { name: 'Sprints', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance' },
  { name: '10-Yard Sprint', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance' },
  { name: '40-Yard Dash', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance' },
  { name: 'Flying 30m Sprint', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance' },
  { name: 'Shuttle Runs', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance' },
  { name: 'Pro Agility Shuttle (5-10-5)', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance' },
  { name: 'T-Test Agility', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance' },
  { name: 'Hill Sprints', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance' },
  { name: 'Resisted Sprint (Sled)', muscle: 'Cardio', equipment: 'Other', mode: 'distance', tags: ['compound'] },
  { name: 'Stadium Stairs', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance', tags: ['compound'] },
  { name: 'Box Step-Ups (Timed)', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'timed' },
  { name: 'Agility Ladder Drills', muscle: 'Cardio', equipment: 'Other', mode: 'timed' },
  { name: 'Cone Drills', muscle: 'Cardio', equipment: 'Other', mode: 'timed' },
  { name: 'Beep Test', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'timed', tags: ['compound'] },
  { name: 'Yo-Yo IR1 Test', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'timed', tags: ['compound'] },
  { name: 'Tabata Sprints', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'timed', tags: ['compound'] },
  { name: 'EMOM Conditioning', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'timed', tags: ['compound'] },
  { name: 'Outdoor Run', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance' },
  { name: 'Trail Running', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance' },
  { name: 'Hiking', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance', tags: ['compound'] },
  { name: 'Rucking', muscle: 'Cardio', equipment: 'Other', mode: 'distance', tags: ['compound'] },
  { name: 'Outdoor Cycling', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance' },
  { name: 'Road Cycling', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance' },
  { name: 'Mountain Biking', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance' },
  { name: 'Swimming', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance', tags: ['compound'] },
  { name: 'Freestyle Swim', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance', tags: ['compound'] },
  { name: 'Backstroke Swim', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance', tags: ['compound'] },
  { name: 'Breaststroke Swim', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance', tags: ['compound'] },
  { name: 'Butterfly Swim', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance', tags: ['compound'] },
  { name: 'Kickboard Swim', muscle: 'Cardio', equipment: 'Other', mode: 'distance' },
  { name: 'Battle Ropes', muscle: 'Cardio', equipment: 'Other', mode: 'timed', tags: ['compound'] },
  { name: 'Sled Push', muscle: 'Cardio', equipment: 'Other', mode: 'distance', tags: ['compound'] },
  { name: 'Sled Pull', muscle: 'Cardio', equipment: 'Other', mode: 'distance', tags: ['compound'] },
  { name: 'Sled Drag', muscle: 'Cardio', equipment: 'Other', mode: 'distance', tags: ['compound'] },
  { name: 'Prowler Push', muscle: 'Cardio', equipment: 'Other', mode: 'distance', tags: ['compound'] },
  { name: 'Sandbag Carry', muscle: 'Cardio', equipment: 'Other', mode: 'distance', tags: ['compound'] },
  { name: 'Tire Flip', muscle: 'Cardio', equipment: 'Other', mode: 'weight', tags: ['compound'] },

  // ── Full Body (Olympic, KB, plyo, explosive, strongman) ─────────────────────
  // Olympic & variants
  { name: 'Snatch', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Power Snatch', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Hang Snatch', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Hang Power Snatch', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Muscle Snatch', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Tall Snatch', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Drop Snatch', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Snatch Balance', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Snatch Pull', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Sotts Press', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Clean', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Power Clean', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Hang Clean', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Hang Power Clean', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Muscle Clean', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Tall Clean', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Clean Pull', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Clean and Jerk', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Split Jerk', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Push Jerk', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Power Jerk', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Jerk Recovery', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Halting Deadlift', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Barbell Thruster', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  // Dynamic-effort / speed work
  { name: 'Speed Squat', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Speed Bench', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Speed Pull (Deadlift)', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Banded Box Squat', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  // Kettlebell flow
  { name: 'Kettlebell Swing (Russian)', muscle: 'Full Body', equipment: 'Kettlebell', mode: 'weight', tags: ['compound'] },
  { name: 'Kettlebell Swing (American)', muscle: 'Full Body', equipment: 'Kettlebell', mode: 'weight', tags: ['compound'] },
  { name: 'Single-Arm Kettlebell Swing', muscle: 'Full Body', equipment: 'Kettlebell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Kettlebell Snatch', muscle: 'Full Body', equipment: 'Kettlebell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Kettlebell Clean', muscle: 'Full Body', equipment: 'Kettlebell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Kettlebell Clean and Press', muscle: 'Full Body', equipment: 'Kettlebell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Turkish Get-Up', muscle: 'Full Body', equipment: 'Kettlebell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Kettlebell Windmill', muscle: 'Full Body', equipment: 'Kettlebell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Kettlebell Halo', muscle: 'Full Body', equipment: 'Kettlebell', mode: 'weight', tags: ['compound'] },
  { name: 'Kettlebell Figure 8', muscle: 'Full Body', equipment: 'Kettlebell', mode: 'weight', tags: ['compound'] },
  { name: 'Goblet Clean', muscle: 'Full Body', equipment: 'Kettlebell', mode: 'weight', tags: ['compound'] },
  { name: 'Double Kettlebell Clean', muscle: 'Full Body', equipment: 'Kettlebell', mode: 'weight', tags: ['compound'] },
  { name: 'Double Kettlebell Front Squat', muscle: 'Full Body', equipment: 'Kettlebell', mode: 'weight', tags: ['compound'] },
  // Dumbbell complexes
  { name: 'Dumbbell Snatch', muscle: 'Full Body', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Dumbbell Clean', muscle: 'Full Body', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Dumbbell Thruster', muscle: 'Full Body', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Man-Maker', muscle: 'Full Body', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  // Jump tests + multi-joint plyos (whole-body coordination, arm swing) → Full Body
  { name: 'Vertical Jump Test', muscle: 'Full Body', equipment: 'Bodyweight', mode: 'distance', tags: ['compound'] },
  { name: 'Standing Long Jump Test', muscle: 'Full Body', equipment: 'Bodyweight', mode: 'distance', tags: ['compound'] },
  { name: 'Broad Jump', muscle: 'Full Body', equipment: 'Bodyweight', mode: 'distance', tags: ['compound'] },
  { name: 'Triple Broad Jump', muscle: 'Full Body', equipment: 'Bodyweight', mode: 'distance', tags: ['compound'] },
  { name: 'Bounding', muscle: 'Full Body', equipment: 'Bodyweight', mode: 'distance', tags: ['compound'] },
  { name: 'Box Jump', muscle: 'Full Body', equipment: 'Other', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Box Jump Over', muscle: 'Full Body', equipment: 'Other', mode: 'bodyweight', tags: ['compound'] },
  { name: '180 Box Jump', muscle: 'Full Body', equipment: 'Other', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Weighted Vest Box Jump', muscle: 'Full Body', equipment: 'Other', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Depth Jump', muscle: 'Full Body', equipment: 'Other', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Drop Jump', muscle: 'Full Body', equipment: 'Other', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Altitude Drop', muscle: 'Full Body', equipment: 'Other', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Tuck Jump', muscle: 'Full Body', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Cyclical Tuck Jump', muscle: 'Full Body', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Knee-to-Feet Jump', muscle: 'Full Body', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Approach Jump Drill', muscle: 'Full Body', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Plyo Push-Up', muscle: 'Full Body', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Clap Push-Up', muscle: 'Full Body', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  // Med ball throws → Full Body
  { name: 'Medicine Ball Slam', muscle: 'Full Body', equipment: 'Other', mode: 'weight', tags: ['compound'] },
  { name: 'Medicine Ball Chest Pass', muscle: 'Full Body', equipment: 'Other', mode: 'weight', tags: ['compound'] },
  { name: 'Medicine Ball Rotational Throw', muscle: 'Full Body', equipment: 'Other', mode: 'weight', tags: ['compound'] },
  { name: 'Kneeling Medicine Ball Throw', muscle: 'Full Body', equipment: 'Other', mode: 'weight', tags: ['compound'] },
  { name: 'Medicine Ball Scoop Throw', muscle: 'Full Body', equipment: 'Other', mode: 'weight', tags: ['compound'] },
  { name: 'Medicine Ball Overhead Throw (Backward)', muscle: 'Full Body', equipment: 'Other', mode: 'weight', tags: ['compound'] },
  { name: 'Vertical Medicine Ball Toss', muscle: 'Full Body', equipment: 'Other', mode: 'weight', tags: ['compound'] },
  { name: 'Medicine Ball Squat-to-Press Throw', muscle: 'Full Body', equipment: 'Other', mode: 'weight', tags: ['compound'] },
  { name: 'Single-Arm Medicine Ball Push Press', muscle: 'Full Body', equipment: 'Other', mode: 'weight', tags: ['compound', 'unilateral'] },
  // Strongman
  { name: 'Atlas Stone Lift', muscle: 'Full Body', equipment: 'Other', mode: 'weight', tags: ['compound'] },
  { name: 'Log Press', muscle: 'Full Body', equipment: 'Other', mode: 'weight', tags: ['compound'] },
  { name: 'Axle Clean and Press', muscle: 'Full Body', equipment: 'Other', mode: 'weight', tags: ['compound'] },
  { name: 'Yoke Walk', muscle: 'Full Body', equipment: 'Other', mode: 'distance', tags: ['compound'] },
  { name: 'Keg Carry', muscle: 'Full Body', equipment: 'Other', mode: 'distance', tags: ['compound'] },
  { name: 'Sandbag Clean', muscle: 'Full Body', equipment: 'Other', mode: 'weight', tags: ['compound'] },
  { name: 'Sandbag-Over-Bar', muscle: 'Full Body', equipment: 'Other', mode: 'weight', tags: ['compound'] },

  // ── Plyometrics — additional upper-body & loaded variants ─────────────────
  { name: 'Depth Push-Up', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'], style: 'plyometric' },
  { name: 'Hand-Release Plyo Push-Up', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'], style: 'plyometric' },
  { name: 'Single-Arm Plyo Push-Up', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound', 'unilateral'], style: 'plyometric' },
  { name: 'Plyo Pull-Up', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'], style: 'plyometric' },
  { name: 'Clap Pull-Up', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'], style: 'plyometric' },
  { name: 'Hex Bar Jump Shrug', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'], style: 'plyometric' },
  { name: 'Hardstyle Kettlebell Swing', muscle: 'Glutes', equipment: 'Kettlebell', mode: 'weight', tags: ['compound'], style: 'plyometric' },
  { name: 'Double Kettlebell Swing', muscle: 'Glutes', equipment: 'Kettlebell', mode: 'weight', tags: ['compound'], style: 'plyometric' },
  { name: 'Kettlebell Snatch', muscle: 'Full Body', equipment: 'Kettlebell', mode: 'weight', tags: ['compound', 'unilateral'], style: 'plyometric' },
  { name: 'Medicine Ball Chest Pass', muscle: 'Chest', equipment: 'Other', mode: 'weight', tags: ['compound'], style: 'plyometric' },
  { name: 'Medicine Ball Shotput Throw', muscle: 'Full Body', equipment: 'Other', mode: 'weight', tags: ['compound', 'unilateral'], style: 'plyometric' },
  { name: 'Medicine Ball Lateral Throw', muscle: 'Obliques', equipment: 'Other', mode: 'weight', tags: ['compound'], style: 'plyometric' },
  { name: 'Continuous Broad Jump', muscle: 'Full Body', equipment: 'Bodyweight', mode: 'distance', tags: ['compound'], style: 'plyometric' },
  { name: 'Reactive Broad Jump', muscle: 'Full Body', equipment: 'Bodyweight', mode: 'distance', tags: ['compound'], style: 'plyometric' },
  { name: 'Altitude Drop', muscle: 'Full Body', equipment: 'Other', mode: 'bodyweight', tags: ['compound'], style: 'plyometric' },

  // ── Calisthenics — skill progressions ─────────────────────────────────────
  // Front Lever family
  { name: 'Tuck Front Lever Hold', muscle: 'Back', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'], style: 'calisthenics' },
  { name: 'Advanced Tuck Front Lever Hold', muscle: 'Back', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'], style: 'calisthenics' },
  { name: 'Straddle Front Lever Hold', muscle: 'Back', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'], style: 'calisthenics' },
  { name: 'Full Front Lever Hold', muscle: 'Back', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'], style: 'calisthenics' },
  { name: 'Front Lever Raise', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'], style: 'calisthenics' },
  { name: 'Front Lever Pull-Up', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'], style: 'calisthenics' },
  // Back Lever family
  { name: 'Tuck Back Lever Hold', muscle: 'Back', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'], style: 'calisthenics' },
  { name: 'Straddle Back Lever Hold', muscle: 'Back', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'], style: 'calisthenics' },
  { name: 'Full Back Lever Hold', muscle: 'Back', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'], style: 'calisthenics' },
  { name: 'Skin the Cat', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'], style: 'calisthenics' },
  // Pull variants
  { name: 'Archer Pull-Up', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound', 'unilateral'], style: 'calisthenics' },
  { name: 'Typewriter Pull-Up', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound', 'unilateral'], style: 'calisthenics' },
  { name: 'Commando Pull-Up', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'], style: 'calisthenics' },
  { name: 'One-Arm Pull-Up Negative', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound', 'unilateral'], style: 'calisthenics' },
  { name: 'One-Arm Pull-Up', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound', 'unilateral'], style: 'calisthenics' },
  { name: 'L-Sit Pull-Up', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'], style: 'calisthenics' },
  // Muscle-Up family
  { name: 'Bar Muscle-Up', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'], style: 'calisthenics' },
  { name: 'Strict Bar Muscle-Up', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'], style: 'calisthenics' },
  { name: 'Kipping Muscle-Up', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'], style: 'calisthenics' },
  { name: 'Ring Muscle-Up', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'], style: 'calisthenics' },
  { name: 'Muscle-Up Negative', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'], style: 'calisthenics' },
  // Planche family
  { name: 'Planche Lean', muscle: 'Chest', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'], style: 'calisthenics' },
  { name: 'Tuck Planche Hold', muscle: 'Chest', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'], style: 'calisthenics' },
  { name: 'Advanced Tuck Planche Hold', muscle: 'Chest', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'], style: 'calisthenics' },
  { name: 'Straddle Planche Hold', muscle: 'Chest', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'], style: 'calisthenics' },
  { name: 'Full Planche Hold', muscle: 'Chest', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'], style: 'calisthenics' },
  // Push variants
  { name: 'One-Arm Push-Up', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound', 'unilateral'], style: 'calisthenics' },
  { name: 'Aztec Push-Up', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'], style: 'calisthenics' },
  { name: 'Superman Push-Up', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'], style: 'calisthenics' },
  { name: 'Hindu Push-Up', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'], style: 'calisthenics' },
  // Handstand work
  { name: 'Wall Handstand Hold', muscle: 'Shoulders', equipment: 'Bodyweight', mode: 'timed', tags: ['compound'], style: 'calisthenics' },
  { name: 'Free Handstand Hold', muscle: 'Shoulders', equipment: 'Bodyweight', mode: 'timed', tags: ['compound'], style: 'calisthenics' },
  { name: 'Press to Handstand', muscle: 'Shoulders', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'], style: 'calisthenics' },
  { name: 'Handstand Walk', muscle: 'Shoulders', equipment: 'Bodyweight', mode: 'distance', tags: ['compound'], style: 'calisthenics' },
  { name: 'Deficit Handstand Push-Up', muscle: 'Shoulders', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'], style: 'calisthenics' },
  { name: 'Freestanding Handstand Push-Up', muscle: 'Shoulders', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'], style: 'calisthenics' },
  // Human Flag + Side Lever
  { name: 'Tuck Human Flag Hold', muscle: 'Obliques', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'], style: 'calisthenics' },
  { name: 'Straddle Human Flag Hold', muscle: 'Obliques', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'], style: 'calisthenics' },
  { name: 'Full Human Flag Hold', muscle: 'Obliques', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'], style: 'calisthenics' },
  { name: 'Side Lever Hold', muscle: 'Obliques', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'], style: 'calisthenics' },
  // Core skills (V-Sit, Manna)
  { name: 'V-Sit Hold', muscle: 'Core', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'], style: 'calisthenics' },
  { name: 'Manna Hold', muscle: 'Core', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'], style: 'calisthenics' },
];

// Display order for the muscle filter pills. Roughly mirrors the catalog
// section order so the picker feels predictable.
export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Adductors',
  'Calves',
  'Core',
  'Obliques',
  'Lower Back',
  'Cardio',
  'Full Body',
];

export const EQUIPMENT_TYPES: Equipment[] = [
  'Barbell',
  'Dumbbell',
  'EZ Bar',
  'Kettlebell',
  'Cable',
  'Machine',
  'Smith Machine',
  'Bodyweight',
  'Bands',
  'Cardio Machine',
  'Other',
];

// Fast O(1) lookup keyed by case-insensitive name. Used to retrieve an
// exercise's default mode/muscle when the user picks it from the catalog.
const EXERCISE_BY_NAME = new Map<string, Exercise>();
for (const ex of EXERCISE_CATALOG) {
  EXERCISE_BY_NAME.set(ex.name.toLowerCase(), ex);
}

export function findExercise(name: string): Exercise | undefined {
  return EXERCISE_BY_NAME.get(name.toLowerCase());
}

// Quick mode lookup for callers that only need the exercise mode (e.g. PR
// detection needs to know whether a set's "best metric" is kg, seconds, or
// meters). Returns undefined for unknown / custom exercises so callers can
// fall back to heuristics.
export function getExerciseMode(name: string): ExerciseMode | undefined {
  return EXERCISE_BY_NAME.get(name.toLowerCase())?.mode;
}

// Given a workout name (e.g. "Leg Day", "Push", "Lower Body"), return the
// muscle groups that should be prioritised in the exercise picker so the
// relevant exercises appear at the top. Empty set = no prioritisation.
export function getPriorityMuscles(workoutName: string | undefined): Set<MuscleGroup> {
  const m = new Set<MuscleGroup>();
  if (!workoutName) return m;
  const n = workoutName.toLowerCase();

  // Splits (compound names first so they don't collide with single-word checks)
  if (/lower\s*body|leg\s*day|\blegs?\b/.test(n)) {
    m.add('Quads');
    m.add('Hamstrings');
    m.add('Glutes');
    m.add('Calves');
    m.add('Adductors');
  }
  if (/upper\s*body|upper\s*day/.test(n)) {
    m.add('Chest');
    m.add('Back');
    m.add('Shoulders');
    m.add('Biceps');
    m.add('Triceps');
    m.add('Forearms');
  }
  if (/\bpush\b/.test(n)) {
    m.add('Chest');
    m.add('Shoulders');
    m.add('Triceps');
  }
  if (/\bpull\b/.test(n)) {
    m.add('Back');
    m.add('Biceps');
    m.add('Forearms');
  }
  if (/\barms?\b/.test(n)) {
    m.add('Biceps');
    m.add('Triceps');
    m.add('Forearms');
  }

  // Direct muscle calls
  if (/\bchest\b|pec/.test(n)) m.add('Chest');
  if (/\bback\b|lats?/.test(n)) m.add('Back');
  if (/shoulders?|delts?/.test(n)) m.add('Shoulders');
  if (/biceps?|\bbis\b/.test(n)) m.add('Biceps');
  if (/triceps?|\btris\b/.test(n)) m.add('Triceps');
  if (/forearms?/.test(n)) m.add('Forearms');
  if (/glutes?|booty/.test(n)) {
    m.add('Glutes');
    m.add('Hamstrings');
    m.add('Adductors');
  }
  if (/quads?|quadriceps/.test(n)) m.add('Quads');
  if (/hamstrings?|hams?/.test(n)) m.add('Hamstrings');
  if (/calves?|\bcalf\b/.test(n)) m.add('Calves');
  if (/\bcore\b|\babs?\b/.test(n)) {
    m.add('Core');
    m.add('Obliques');
  }
  if (/obliques?/.test(n)) m.add('Obliques');
  if (/cardio|conditioning|hiit/.test(n)) m.add('Cardio');

  return m;
}

// Determine a brief sub-region label (e.g. "Glute Max", "Upper", "Lats") for
// the primary muscle based on the exercise's name. Used to give the top
// muscle pill a precise hint without burdening the secondary pills.
// Returns undefined if the exercise doesn't clearly target one sub-region.
function getPrimaryDetail(primary: MuscleGroup, name: string): string | undefined {
  switch (primary) {
    case 'Chest':
      if (/incline/.test(name)) return 'Upper';
      if (/decline/.test(name)) return 'Lower';
      return undefined; // flat / generic chest
    case 'Back':
      if (/pull-?up|chin-?up|pulldown|pullover/.test(name)) return 'Lats';
      if (/shrug|upright row/.test(name)) return 'Traps';
      if (/face pull/.test(name)) return 'Rear Delts';
      // Hyperextension / back extension isolate the erectors; deadlift family
      // is whole-posterior-chain, so don't claim a sub-region for those.
      if (/hyperextension|back extension/.test(name)) return 'Erectors';
      if (/row/.test(name)) return 'Lats';
      return undefined;
    case 'Shoulders':
      if (/rear|reverse fly|face pull/.test(name)) return 'Rear Delts';
      if (/lateral raise|side raise|upright/.test(name)) return 'Side Delts';
      if (
        /front raise|overhead press|military|shoulder press|arnold|push press|z press|bradford|behind-the-neck|landmine press|pike|handstand/.test(
          name,
        )
      )
        return 'Front Delts';
      return undefined;
    case 'Glutes':
      if (/abductor|lateral|clamshell|fire hydrant|side step|monster walk|band walk/.test(name))
        return 'Glute Med';
      if (/hip thrust|bridge|kickback|frog pump|extension|donkey/.test(name))
        return 'Glute Max';
      return undefined;
    case 'Calves':
      if (/seated/.test(name)) return 'Soleus';
      // Default standing-position calf raises to gastroc.
      if (/calf|donkey|leg press/.test(name)) return 'Gastroc';
      return undefined;
    case 'Triceps':
      if (/overhead|skull|french press/.test(name)) return 'Long Head';
      if (/pushdown|kickback/.test(name)) return 'Lateral Head';
      if (/close-?grip|diamond|push-?up/.test(name)) return 'Medial Head';
      return undefined;
    case 'Biceps':
      if (/hammer/.test(name)) return 'Brachialis';
      if (/preacher|spider|concentration/.test(name)) return 'Short Head';
      if (/incline/.test(name)) return 'Long Head';
      return undefined;
    case 'Core':
      if (/leg raise|reverse crunch|hanging knee|toes[- ]to[- ]bar/.test(name)) return 'Lower Abs';
      if (/crunch|sit-?up|ab rollout|cable crunch/.test(name)) return 'Upper Abs';
      return undefined;
    default:
      return undefined;
  }
}

// Returns the primary muscle (from the catalog), an optional sub-region hint
// for the primary (e.g. "Glute Max", "Upper", "Lats"), and up to 2 likely
// secondary muscles. Used by the exercise picker's long-press info popup.
export function getExerciseMuscles(
  exercise: Exercise,
): { primary: MuscleGroup; primaryDetail?: string; secondary: MuscleGroup[] } {
  const name = exercise.name.toLowerCase();
  const primary = exercise.muscle;
  const primaryDetail = getPrimaryDetail(primary, name);
  const isCompound = exercise.tags?.includes('compound') ?? false;
  if (!isCompound) return { primary, primaryDetail, secondary: [] };

  const sec: MuscleGroup[] = [];
  switch (primary) {
    case 'Chest':
      sec.push('Triceps', 'Shoulders');
      break;
    case 'Back':
      if (/deadlift|rdl|romanian|good morning/.test(name)) {
        sec.push('Hamstrings', 'Glutes');
      } else if (/pull-?up|chin-?up|pulldown|row|pullover/.test(name)) {
        sec.push('Biceps');
      }
      break;
    case 'Shoulders':
      // Pressing variants recruit triceps — covers OHP, push press, pike & handstand push-ups, wall walks.
      if (/press|push-?up|handstand|wall walk/.test(name)) sec.push('Triceps');
      break;
    case 'Triceps':
      // Includes diamond/close-grip push-ups (bodyweight compounds).
      if (/dip|bench|press|push-?up/.test(name)) sec.push('Chest', 'Shoulders');
      break;
    case 'Quads':
      sec.push('Glutes', 'Hamstrings');
      break;
    case 'Hamstrings':
      sec.push('Glutes', 'Lower Back');
      break;
    case 'Glutes':
      // Hip-hinge variants (RDL/B-Stance RDL): glutes + hamstrings + lower back.
      if (/rdl|romanian|deadlift|good morning/.test(name)) sec.push('Hamstrings', 'Lower Back');
      else if (/hip thrust|bridge|kickback/.test(name)) sec.push('Hamstrings');
      else sec.push('Hamstrings', 'Quads');
      break;
    case 'Biceps':
      sec.push('Forearms');
      break;
  }
  return { primary, primaryDetail, secondary: sec.slice(0, 2) };
}
