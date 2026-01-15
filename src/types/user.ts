export type TrainingGoal = 'strength' | 'hypertrophy' | 'endurance' | 'weight_loss' | 'general';

export interface UserProfile {
  username: string;
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  goal: TrainingGoal | null;
  weekly_target: number;
  avatar_url: string | null;
  cover_url: string | null;
}
