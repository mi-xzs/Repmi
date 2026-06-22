import { WorkoutData } from "./exercise";

//session set

export interface SessionSet {
  label: string;
  kg?: number;
  reps?: number;
  minutes?: number;
  seconds?: number;
  meters?: number;
}



export interface SessionExercise {
  name: string;
  sets: SessionSet[];
}



export type AnalyticsMode = 'weight' | 'bodyweight' | 'timed' | 'distance';

export interface HeatmapEntry {
  date: string;
  allSets: SessionSet[];
  topKg: number;
  topReps?: number;
  topBwReps?: number;
  topSeconds?: number;
  topMeters?: number;
  mode?: AnalyticsMode;
}



export interface RadarPoint {
  label: string;
  value: number;
}



export interface OverallData {
  totalSessions: number;
  totalDuration: number;
  totalVolume: number;
  totalReps: number;
  totalSets: number;
  topExercisesByVolume: { name: string; volume: number }[];
  topExercisesByFreq: RadarPoint[];
  weeklyFrequency: number;
}



export interface WorkoutPickerProps {
  visible: boolean;
  workouts: WorkoutData[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}



export interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  compact?: boolean;
}