import { supabase } from './supabase';
import { WorkoutData } from '../types/exercise';
import { WorkoutDataPayloadSchema } from './payloadSchemas';

const SHARE_BASE_URL = 'https://gymtracker.link/w';
const LINK_PATTERN = /gymtracker\.link\/w\/([0-9a-f-]{36})/i;

const DEFAULT_EXPIRY_DAYS = 30;

export async function shareWorkout(workout: WorkoutData): Promise<string> {
  const { data: userResp } = await supabase.auth.getUser();
  const userId = userResp?.user?.id ?? null;

  let resolvedUsername: string | null = null;
  if (userId) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .maybeSingle();
    resolvedUsername = (prof as { username?: string | null } | null)?.username ?? null;
  }

  const validated = WorkoutDataPayloadSchema.safeParse(workout);
  if (!validated.success) {
    throw new Error('This workout cannot be shared: it contains invalid or oversized data.');
  }

  const expiresAt = new Date(
    Date.now() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const payload: Record<string, unknown> = { workout_data: validated.data, expires_at: expiresAt };
  if (userId) payload.user_id = userId;
  if (resolvedUsername) payload.shared_by = resolvedUsername;

  let { data, error } = await supabase
    .from('shared_workouts')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    const legacyPayload: Record<string, unknown> = { workout_data: validated.data };
    if (resolvedUsername) legacyPayload.shared_by = resolvedUsername;
    ({ data, error } = await supabase
      .from('shared_workouts')
      .insert(legacyPayload)
      .select('id')
      .single());
  }

  if (error) throw error;
  if (!data) throw new Error('shareWorkout: insert returned no row');
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
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Share link is invalid, expired, or has been revoked');

  const validated = WorkoutDataPayloadSchema.safeParse(data.workout_data);
  if (!validated.success) {
    throw new Error('Share link is invalid, expired, or has been revoked');
  }
  return {
    workout: validated.data,
    sharedBy: data.shared_by ?? null,
  };
}

export async function revokeShareLink(shareId: string): Promise<void> {
  const { error } = await supabase
    .from('shared_workouts')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', shareId);
  if (error) throw error;
}
