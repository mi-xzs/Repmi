// src/constants/exerciseCatalog.ts
//
// Canonical exercise catalog — 350+ entries spanning all major muscle groups,
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

export type Exercise = {
  name: string;
  muscle: MuscleGroup;
  equipment: Equipment;
  mode: ExerciseMode;
  tags?: ExerciseTag[];
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
  { name: 'Dumbbell Bench Press', muscle: 'Chest', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Incline Dumbbell Press', muscle: 'Chest', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Decline Dumbbell Press', muscle: 'Chest', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Neutral-Grip Dumbbell Press', muscle: 'Chest', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Incline Neutral-Grip Dumbbell Press', muscle: 'Chest', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Single-Arm Dumbbell Bench Press', muscle: 'Chest', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
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
  { name: 'Cable Chest Press', muscle: 'Chest', equipment: 'Cable', mode: 'weight', tags: ['compound'] },
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
  { name: 'Smith Machine Close-Grip Bench Press', muscle: 'Chest', equipment: 'Smith Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Push-Up', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Incline Push-Up', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Decline Push-Up', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Wide Push-Up', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Archer Push-Up', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound', 'unilateral'] },
  { name: 'Deficit Push-Up', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Chest Dip', muscle: 'Chest', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Weighted Chest Dip', muscle: 'Chest', equipment: 'Bodyweight', mode: 'weight', tags: ['compound'] },
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
  { name: 'Assisted Pull-Up', muscle: 'Back', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Lat Pulldown', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['compound'] },
  { name: 'Wide-Grip Lat Pulldown', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['compound'] },
  { name: 'Close-Grip Lat Pulldown', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['compound'] },
  { name: 'Neutral-Grip Lat Pulldown', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['compound'] },
  { name: 'Reverse-Grip Lat Pulldown', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['compound'] },
  { name: 'Single-Arm Lat Pulldown', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Straight-Arm Pulldown', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Machine Lat Pulldown', muscle: 'Back', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Barbell Row', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Pendlay Row', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Yates Row', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'T-Bar Row', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Chest-Supported T-Bar Row', muscle: 'Back', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Seal Row', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Meadows Row', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Dumbbell Row', muscle: 'Back', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Chest-Supported Dumbbell Row', muscle: 'Back', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Incline Dumbbell Row', muscle: 'Back', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Kroc Row', muscle: 'Back', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Seated Cable Row', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['compound'] },
  { name: 'Wide-Grip Seated Cable Row', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['compound'] },
  { name: 'Single-Arm Cable Row', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Standing Cable Row', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['compound'] },
  { name: 'Machine Row', muscle: 'Back', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Hammer Strength Row', muscle: 'Back', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Inverted Row', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Smith Machine Row', muscle: 'Back', equipment: 'Smith Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Banded Row', muscle: 'Back', equipment: 'Bands', mode: 'weight', tags: ['compound'] },
  { name: 'Banded Lat Pulldown', muscle: 'Back', equipment: 'Bands', mode: 'weight', tags: ['compound'] },
  { name: 'Conventional Deadlift', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Deficit Deadlift', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Snatch-Grip Deadlift', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Snatch-Grip High Pull', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Rack Pull', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Trap Bar Deadlift', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Barbell Shrug', muscle: 'Back', equipment: 'Barbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Dumbbell Shrug', muscle: 'Back', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Smith Machine Shrug', muscle: 'Back', equipment: 'Smith Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Cable Shrug', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Machine Shrug', muscle: 'Back', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Face Pull', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Dumbbell Pullover', muscle: 'Back', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Cable Pullover', muscle: 'Back', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Back Extension', muscle: 'Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },

  // ── Shoulders ───────────────────────────────────────────────────────────────
  { name: 'Overhead Press', muscle: 'Shoulders', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Military Press', muscle: 'Shoulders', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Push Press', muscle: 'Shoulders', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Behind-the-Neck Press', muscle: 'Shoulders', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Seated Barbell Overhead Press', muscle: 'Shoulders', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Barbell Upright Row', muscle: 'Shoulders', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Barbell Front Raise', muscle: 'Shoulders', equipment: 'Barbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Landmine Press', muscle: 'Shoulders', equipment: 'Barbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Z Press', muscle: 'Shoulders', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Seated Dumbbell Shoulder Press', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Standing Dumbbell Shoulder Press', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Arnold Press', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Single-Arm Dumbbell Shoulder Press', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Dumbbell Lateral Raise', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Dumbbell Front Raise', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Bent-Over Dumbbell Reverse Fly', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Incline Dumbbell Rear Delt Fly', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Dumbbell Upright Row', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Lying Dumbbell Lateral Raise', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Dumbbell Y-Raise', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Dumbbell W-Raise', muscle: 'Shoulders', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Cable Lateral Raise', muscle: 'Shoulders', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Cable Front Raise', muscle: 'Shoulders', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Cable Rear Delt Fly', muscle: 'Shoulders', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Cable Upright Row', muscle: 'Shoulders', equipment: 'Cable', mode: 'weight', tags: ['compound'] },
  { name: 'Cable Y-Raise', muscle: 'Shoulders', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Machine Shoulder Press', muscle: 'Shoulders', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Machine Lateral Raise', muscle: 'Shoulders', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Reverse Pec Deck', muscle: 'Shoulders', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Smith Machine Overhead Press', muscle: 'Shoulders', equipment: 'Smith Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Smith Machine Behind-the-Neck Press', muscle: 'Shoulders', equipment: 'Smith Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Smith Machine Upright Row', muscle: 'Shoulders', equipment: 'Smith Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Pike Push-Up', muscle: 'Shoulders', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Handstand Push-Up', muscle: 'Shoulders', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Wall Walk', muscle: 'Shoulders', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Band Lateral Raise', muscle: 'Shoulders', equipment: 'Bands', mode: 'weight', tags: ['isolation'] },
  { name: 'Band Front Raise', muscle: 'Shoulders', equipment: 'Bands', mode: 'weight', tags: ['isolation'] },
  { name: 'Band Pull-Apart', muscle: 'Shoulders', equipment: 'Bands', mode: 'weight', tags: ['isolation'] },
  { name: 'Band Overhead Press', muscle: 'Shoulders', equipment: 'Bands', mode: 'weight', tags: ['compound'] },

  // ── Biceps ──────────────────────────────────────────────────────────────────
  { name: 'Barbell Curl', muscle: 'Biceps', equipment: 'Barbell', mode: 'weight', tags: ['isolation'] },
  { name: 'EZ Bar Curl', muscle: 'Biceps', equipment: 'EZ Bar', mode: 'weight', tags: ['isolation'] },
  { name: 'Dumbbell Curl', muscle: 'Biceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Alternating Dumbbell Curl', muscle: 'Biceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Hammer Curl', muscle: 'Biceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Cross-Body Hammer Curl', muscle: 'Biceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Preacher Curl', muscle: 'Biceps', equipment: 'EZ Bar', mode: 'weight', tags: ['isolation'] },
  { name: 'Dumbbell Preacher Curl', muscle: 'Biceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Machine Preacher Curl', muscle: 'Biceps', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Incline Dumbbell Curl', muscle: 'Biceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Concentration Curl', muscle: 'Biceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Spider Curl', muscle: 'Biceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Cable Curl', muscle: 'Biceps', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Cable Rope Hammer Curl', muscle: 'Biceps', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Single-Arm Cable Curl', muscle: 'Biceps', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
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
  { name: 'Overhead Cable Tricep Extension', muscle: 'Triceps', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Skull Crusher', muscle: 'Triceps', equipment: 'EZ Bar', mode: 'weight', tags: ['isolation'] },
  { name: 'Dumbbell Skull Crusher', muscle: 'Triceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Overhead Tricep Extension', muscle: 'Triceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Single-Arm Overhead Tricep Extension', muscle: 'Triceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Tricep Kickback', muscle: 'Triceps', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Cable Tricep Kickback', muscle: 'Triceps', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'JM Press', muscle: 'Triceps', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Diamond Push-Up', muscle: 'Triceps', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
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
  { name: "Farmer's Walk", muscle: 'Forearms', equipment: 'Dumbbell', mode: 'distance', tags: ['compound'] },
  { name: 'Plate Pinch Hold', muscle: 'Forearms', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'] },
  { name: 'Wrist Roller', muscle: 'Forearms', equipment: 'Bodyweight', mode: 'weight', tags: ['isolation'] },
  { name: 'Dead Hang', muscle: 'Forearms', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'] },

  // ── Quads ───────────────────────────────────────────────────────────────────
  { name: 'Barbell Back Squat', muscle: 'Quads', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'High-Bar Back Squat', muscle: 'Quads', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Low-Bar Back Squat', muscle: 'Quads', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Front Squat', muscle: 'Quads', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Box Squat', muscle: 'Quads', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Pause Squat', muscle: 'Quads', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Zercher Squat', muscle: 'Quads', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Overhead Squat', muscle: 'Quads', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Smith Machine Squat', muscle: 'Quads', equipment: 'Smith Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Leg Press', muscle: 'Quads', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Hack Squat', muscle: 'Quads', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Pendulum Squat', muscle: 'Quads', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Belt Squat', muscle: 'Quads', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Leg Extension', muscle: 'Quads', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Single-Leg Leg Extension', muscle: 'Quads', equipment: 'Machine', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Goblet Squat', muscle: 'Quads', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Goblet Squat (Kettlebell)', muscle: 'Quads', equipment: 'Kettlebell', mode: 'weight', tags: ['compound'] },
  { name: 'Dumbbell Bulgarian Split Squat', muscle: 'Quads', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Dumbbell Walking Lunge', muscle: 'Quads', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Dumbbell Reverse Lunge', muscle: 'Quads', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Dumbbell Stationary Lunge', muscle: 'Quads', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Dumbbell Step-Up', muscle: 'Quads', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Bodyweight Squat', muscle: 'Quads', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Bodyweight Lunge', muscle: 'Quads', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound', 'unilateral'] },
  { name: 'Sissy Squat', muscle: 'Quads', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Banded Squat', muscle: 'Quads', equipment: 'Bands', mode: 'weight', tags: ['compound'] },
  { name: 'Jump Squat', muscle: 'Quads', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Jumping Lunge', muscle: 'Quads', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },

  // ── Hamstrings ──────────────────────────────────────────────────────────────
  { name: 'Romanian Deadlift', muscle: 'Hamstrings', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Stiff-Leg Deadlift', muscle: 'Hamstrings', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Good Morning', muscle: 'Hamstrings', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Dumbbell Romanian Deadlift', muscle: 'Hamstrings', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
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
  { name: 'Glute-Ham Raise', muscle: 'Hamstrings', equipment: 'Machine', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Reverse Hyperextension', muscle: 'Hamstrings', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Banded Leg Curl', muscle: 'Hamstrings', equipment: 'Bands', mode: 'weight', tags: ['isolation'] },

  // ── Glutes ──────────────────────────────────────────────────────────────────
  { name: 'Barbell Hip Thrust', muscle: 'Glutes', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Single-Leg Hip Thrust', muscle: 'Glutes', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound', 'unilateral'] },
  { name: 'Machine Hip Thrust', muscle: 'Glutes', equipment: 'Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Smith Machine Hip Thrust', muscle: 'Glutes', equipment: 'Smith Machine', mode: 'weight', tags: ['compound'] },
  { name: 'Barbell Glute Bridge', muscle: 'Glutes', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Bodyweight Glute Bridge', muscle: 'Glutes', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Frog Pump', muscle: 'Glutes', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Sumo Deadlift', muscle: 'Glutes', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Cable Glute Kickback', muscle: 'Glutes', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Machine Glute Kickback', muscle: 'Glutes', equipment: 'Machine', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Bodyweight Glute Kickback', muscle: 'Glutes', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation', 'unilateral'] },
  { name: 'Hip Abduction Machine', muscle: 'Glutes', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Cable Hip Abduction', muscle: 'Glutes', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Banded Clamshell', muscle: 'Glutes', equipment: 'Bands', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Fire Hydrant', muscle: 'Glutes', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation', 'unilateral'] },
  { name: 'Banded Lateral Walk', muscle: 'Glutes', equipment: 'Bands', mode: 'weight', tags: ['isolation'] },
  { name: 'Banded Hip Thrust', muscle: 'Glutes', equipment: 'Bands', mode: 'weight', tags: ['compound'] },

  // ── Calves ──────────────────────────────────────────────────────────────────
  { name: 'Standing Calf Raise (Machine)', muscle: 'Calves', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Barbell Standing Calf Raise', muscle: 'Calves', equipment: 'Barbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Dumbbell Standing Calf Raise', muscle: 'Calves', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Smith Machine Calf Raise', muscle: 'Calves', equipment: 'Smith Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Seated Calf Raise', muscle: 'Calves', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Donkey Calf Raise', muscle: 'Calves', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Single-Leg Calf Raise', muscle: 'Calves', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation', 'unilateral'] },
  { name: 'Single-Leg Dumbbell Calf Raise', muscle: 'Calves', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Leg Press Calf Raise', muscle: 'Calves', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Hack Squat Calf Raise', muscle: 'Calves', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Tibialis Raise', muscle: 'Calves', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Banded Calf Raise', muscle: 'Calves', equipment: 'Bands', mode: 'weight', tags: ['isolation'] },

  // ── Core ────────────────────────────────────────────────────────────────────
  { name: 'Plank', muscle: 'Core', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'] },
  { name: 'Hollow Hold', muscle: 'Core', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'] },
  { name: 'Dead Bug', muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Crunch', muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Sit-Up', muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Decline Sit-Up', muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Weighted Decline Sit-Up', muscle: 'Core', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Cable Crunch', muscle: 'Core', equipment: 'Cable', mode: 'weight', tags: ['isolation'] },
  { name: 'Machine Crunch', muscle: 'Core', equipment: 'Machine', mode: 'weight', tags: ['isolation'] },
  { name: 'Hanging Leg Raise', muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Hanging Knee Raise', muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: "Captain's Chair Leg Raise", muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Lying Leg Raise', muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'V-Up', muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Ab Wheel Rollout', muscle: 'Core', equipment: 'Other', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Pallof Press', muscle: 'Core', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Banded Pallof Press', muscle: 'Core', equipment: 'Bands', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Mountain Climbers', muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Toes-to-Bar', muscle: 'Core', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Dragon Flag', muscle: 'Core', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'] },
  { name: 'L-Sit', muscle: 'Core', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation'] },

  // ── Obliques ────────────────────────────────────────────────────────────────
  { name: 'Side Plank', muscle: 'Obliques', equipment: 'Bodyweight', mode: 'timed', tags: ['isolation', 'unilateral'] },
  { name: 'Side Plank with Hip Dip', muscle: 'Obliques', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation', 'unilateral'] },
  { name: 'Russian Twist', muscle: 'Obliques', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Weighted Russian Twist', muscle: 'Obliques', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Cable Woodchopper (High to Low)', muscle: 'Obliques', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Cable Woodchopper (Low to High)', muscle: 'Obliques', equipment: 'Cable', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Dumbbell Side Bend', muscle: 'Obliques', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation', 'unilateral'] },
  { name: 'Oblique Crunch', muscle: 'Obliques', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Bicycle Crunch', muscle: 'Obliques', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Windmill', muscle: 'Obliques', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation', 'unilateral'] },

  // ── Lower Back ──────────────────────────────────────────────────────────────
  { name: '45-Degree Hyperextension', muscle: 'Lower Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Horizontal Hyperextension', muscle: 'Lower Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Weighted Hyperextension', muscle: 'Lower Back', equipment: 'Dumbbell', mode: 'weight', tags: ['isolation'] },
  { name: 'Superman', muscle: 'Lower Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation'] },
  { name: 'Bird Dog', muscle: 'Lower Back', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['isolation', 'unilateral'] },
  { name: 'Jefferson Curl', muscle: 'Lower Back', equipment: 'Barbell', mode: 'weight', tags: ['isolation'] },

  // ── Cardio ──────────────────────────────────────────────────────────────────
  { name: 'Treadmill Walk', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance' },
  { name: 'Treadmill Incline Walk', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance' },
  { name: 'Treadmill Run', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance' },
  { name: 'Treadmill Sprint', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance' },
  { name: 'Stationary Bike', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance' },
  { name: 'Spin Bike', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance' },
  { name: 'Assault Bike', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance', tags: ['compound'] },
  { name: 'Rowing Machine', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance', tags: ['compound'] },
  { name: 'Ski Erg', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance', tags: ['compound'] },
  { name: 'Stair Climber', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance' },
  { name: 'Elliptical', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance' },
  { name: 'Arc Trainer', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'distance' },
  { name: 'Jacobs Ladder', muscle: 'Cardio', equipment: 'Cardio Machine', mode: 'timed', tags: ['compound'] },
  { name: 'Jump Rope', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'timed' },
  { name: 'Double Unders', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'timed' },
  { name: 'Jumping Jacks', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'timed' },
  { name: 'High Knees', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'timed' },
  { name: 'Butt Kicks', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'timed' },
  { name: 'Burpees', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Shadow Boxing', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'timed' },
  { name: 'Sprints', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance' },
  { name: 'Shuttle Runs', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance' },
  { name: 'Hill Sprints', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance' },
  { name: 'Outdoor Run', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance' },
  { name: 'Outdoor Cycling', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance' },
  { name: 'Swimming', muscle: 'Cardio', equipment: 'Bodyweight', mode: 'distance', tags: ['compound'] },
  { name: 'Battle Ropes', muscle: 'Cardio', equipment: 'Other', mode: 'timed', tags: ['compound'] },
  { name: 'Sled Push', muscle: 'Cardio', equipment: 'Other', mode: 'distance', tags: ['compound'] },
  { name: 'Sled Pull', muscle: 'Cardio', equipment: 'Other', mode: 'distance', tags: ['compound'] },
  { name: 'Prowler Push', muscle: 'Cardio', equipment: 'Other', mode: 'distance', tags: ['compound'] },
  { name: 'Sandbag Carry', muscle: 'Cardio', equipment: 'Other', mode: 'distance', tags: ['compound'] },
  { name: 'Tire Flip', muscle: 'Cardio', equipment: 'Other', mode: 'bodyweight', tags: ['compound'] },

  // ── Full Body (Olympic, KB, plyo, explosive) ────────────────────────────────
  { name: 'Snatch', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Power Snatch', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Hang Snatch', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Muscle Snatch', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Clean', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Power Clean', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Hang Clean', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Muscle Clean', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Clean and Jerk', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Split Jerk', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Push Jerk', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Power Jerk', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Clean Pull', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Snatch Pull', muscle: 'Full Body', equipment: 'Barbell', mode: 'weight', tags: ['compound'] },
  { name: 'Kettlebell Swing (Russian)', muscle: 'Full Body', equipment: 'Kettlebell', mode: 'weight', tags: ['compound'] },
  { name: 'Kettlebell Swing (American)', muscle: 'Full Body', equipment: 'Kettlebell', mode: 'weight', tags: ['compound'] },
  { name: 'Kettlebell Snatch', muscle: 'Full Body', equipment: 'Kettlebell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Kettlebell Clean', muscle: 'Full Body', equipment: 'Kettlebell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Turkish Get-Up', muscle: 'Full Body', equipment: 'Kettlebell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Kettlebell Windmill', muscle: 'Full Body', equipment: 'Kettlebell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Kettlebell Halo', muscle: 'Full Body', equipment: 'Kettlebell', mode: 'weight', tags: ['compound'] },
  { name: 'Goblet Clean', muscle: 'Full Body', equipment: 'Kettlebell', mode: 'weight', tags: ['compound'] },
  { name: 'Box Jump', muscle: 'Full Body', equipment: 'Other', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Broad Jump', muscle: 'Full Body', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Depth Jump', muscle: 'Full Body', equipment: 'Other', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Tuck Jump', muscle: 'Full Body', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Plyo Push-Up', muscle: 'Full Body', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Clap Push-Up', muscle: 'Full Body', equipment: 'Bodyweight', mode: 'bodyweight', tags: ['compound'] },
  { name: 'Medicine Ball Slam', muscle: 'Full Body', equipment: 'Other', mode: 'weight', tags: ['compound'] },
  { name: 'Medicine Ball Chest Pass', muscle: 'Full Body', equipment: 'Other', mode: 'weight', tags: ['compound'] },
  { name: 'Medicine Ball Rotational Throw', muscle: 'Full Body', equipment: 'Other', mode: 'weight', tags: ['compound'] },
  { name: 'Kneeling Medicine Ball Throw', muscle: 'Full Body', equipment: 'Other', mode: 'weight', tags: ['compound'] },
  { name: 'Dumbbell Snatch', muscle: 'Full Body', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Dumbbell Clean', muscle: 'Full Body', equipment: 'Dumbbell', mode: 'weight', tags: ['compound', 'unilateral'] },
  { name: 'Dumbbell Thruster', muscle: 'Full Body', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
  { name: 'Man-Maker', muscle: 'Full Body', equipment: 'Dumbbell', mode: 'weight', tags: ['compound'] },
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
