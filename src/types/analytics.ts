// src/types/analytics.ts

import { WorkoutData } from "./exercise";

//session set

export interface SessionSet {
  label: string;       // "W" for warm-up set, "1", "2", "3"… for working sets
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
  topBwReps?: number;   // bodyweight: max reps in a working set
  topSeconds?: number;  // timed: max duration in seconds in a working set
  topMeters?: number;   // distance: max meters in a working set
  mode?: AnalyticsMode;
}



export interface RadarPoint {
  label: string;
  value: number;
}



export interface OverallData {
  totalSessions: number;
  totalDuration: number;          // secs
  totalVolume: number;            // sum of kg × reps across all working sets
  totalReps: number;
  totalSets: number;
  topExercisesByVolume: { name: string; volume: number }[];
  topExercisesByFreq: RadarPoint[];
  weeklyFrequency: number;        // avg sessions per week over last 4 weeks
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