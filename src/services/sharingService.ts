import { supabase } from './supabase';
import { WorkoutData } from '../types/exercise';

const SHARE_BASE_URL = 'https://gymtracker.link/w';
const LINK_PATTERN = /gymtracker\.link\/w\/([0-9a-f-]{36})/i;

export async function shareWorkout(workout: WorkoutData, username?: string): Promise<string> {
  // Try with shared_by column first, fall back without it
  const payload = username
    ? { workout_data: workout, shared_by: username }
    : { workout_data: workout };

  let { data, error } = await supabase
    .from('shared_workouts')
    .insert(payload)
    .select('id')
    .single();

  if (error && username) {
    // Column might not exist yet — retry without shared_by
    ({ data, error } = await supabase
      .from('shared_workouts')
      .insert({ workout_data: workout })
      .select('id')
      .single());
  }

  if (error) throw error;
  return `${SHARE_BASE_URL}/${data.id}`;
}

export type ImportedWorkout = {
  workout: WorkoutData;
  sharedBy: string | null;
};

export async function importWorkoutFromLink(link: string): Promise<ImportedWorkout> {
  const match = link.trim().match(LINK_PATTERN);
  if (!match) throw new Error('Invalid share link');

  const { data, error } = await supabase
    .from('shared_workouts')
    .select('workout_data, shared_by')
    .eq('id', match[1])
    .single();

  if (error) throw error;
  return {
    workout: data.workout_data as WorkoutData,
    sharedBy: data.shared_by ?? null,
  };
}
