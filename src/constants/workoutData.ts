import { WarmUpRowData, CooldownRowData, ExerciseRowBase, PhaseRowMode } from '../types/exercise';

export type WorkoutItem =
  | { type: 'header'; label: string }
  | { type: 'item'; label: string };

export const ITEM_HEIGHT = 60;

export const DEFAULT_WARMUP_ROW: WarmUpRowData = { name: '', minutes: 2, seconds: 0, reps: 0, meters: 0, done: false, mode: 'timed' };
export const DEFAULT_COOLDOWN_ROW: CooldownRowData = { name: '', minutes: 2, seconds: 0, reps: 0, meters: 0, done: false, mode: 'timed' };

// per-category 
type CategoryDefault = {
  mode: PhaseRowMode;
  minutes: number;
  seconds: number;
  reps: number;
};

const CATEGORY_DEFAULTS: Record<string, CategoryDefault> = {
  Cardio:     { mode: 'timed', minutes: 2, seconds: 0,  reps: 0  },
  Dynamic:    { mode: 'reps',  minutes: 0, seconds: 0,  reps: 10 },
  Static:     { mode: 'timed', minutes: 0, seconds: 30, reps: 0  },
  Mobility:   { mode: 'timed', minutes: 0, seconds: 45, reps: 0  },
  'Foam Roll':{ mode: 'timed', minutes: 0, seconds: 45, reps: 0  },
  Activation: { mode: 'reps',  minutes: 0, seconds: 0,  reps: 12 },
  Movement:   { mode: 'reps',  minutes: 0, seconds: 0,  reps: 8  },
  Sports:     { mode: 'timed', minutes: 0, seconds: 30, reps: 0  },
  Stretching: { mode: 'timed', minutes: 1, seconds: 0,  reps: 0  },
  Cooldown:   { mode: 'timed', minutes: 1, seconds: 30, reps: 0  },
};

const FALLBACK_DEFAULT: CategoryDefault = { mode: 'timed', minutes: 1, seconds: 0, reps: 0 };

export function getDefaultRowForCategory(category?: string): ExerciseRowBase {
  const d = (category && CATEGORY_DEFAULTS[category]) || FALLBACK_DEFAULT;
  return {
    name: '',
    minutes: d.minutes,
    seconds: d.seconds,
    reps: d.reps,
    meters: 0,
    done: false,
    mode: d.mode,
    sectionCategory: category,
  };
}

const workoutSections = [
  {
    title: 'Muscle Groups',
    data: ['Full Body', 'Upper Body', 'Lower Body', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Glutes', 'Core', 'Quads', 'Hamstrings', 'Calves'],
  },
  {
    title: 'Training Styles',
    data: ['Push', 'Pull', 'Strength', 'Hypertrophy', 'Functional Training', 'Olympic Lifting', 'Calisthenics', 'Plyometrics'],
  },
  {
    title: 'Conditioning',
    data: ['HIIT', 'Conditioning', 'Cardio', 'Mobility', 'Stability', 'Rehab'],
  },
];

export const flattenedWorkoutItems: WorkoutItem[] = workoutSections.reduce<WorkoutItem[]>(
  (acc, section) => {
    acc.push({ type: 'header', label: section.title });
    section.data.forEach((item) => acc.push({ type: 'item', label: item }));
    return acc;
  },
  [],
);
