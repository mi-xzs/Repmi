import { supabase } from './supabase';
import { WorkoutData } from '../types/exercise';
import { WorkoutDataPayloadSchema } from './payloadSchemas';

const SHARE_BASE_URL = 'https://gymtracker.link/w';
const LINK_PATTERN = /gymtracker\.link\/w\/([0-9a-f-]{36})/i;

// SECURITY: shared workout links are public-by-design via knowledge of
// the share UUID. Two server-side mitigations apply (see
// `enable_rls_and_policies` migration):
//   1. Every newly-issued share auto-expires 30 days after creation
//      (default on the `expires_at` column).
//   2. Each share is bound to its creator via `user_id` (uuid FK),
//      replacing the legacy string `shared_by` column which could
//      orphan rows on username change and provided no auth surface.
//      The legacy column is kept for one release for back-compat with
//      already-published links; the migration backfills `user_id`
//      from the profiles table where possible.
// The RLS SELECT policy filters by `expires_at > now() AND
// revoked_at IS NULL`, so revoked / expired links automatically
// 404 on the client side without any extra check needed here.

const DEFAULT_EXPIRY_DAYS = 30;

export async function shareWorkout(workout: WorkoutData, username?: string): Promise<string> {
  // Resolve the authenticated user so we can stamp ownership without
  // trusting a client-supplied id.
  const { data: userResp } = await supabase.auth.getUser();
  const userId = userResp?.user?.id ?? null;

  // SECURITY (H2) — validate the payload before insert. Strict schema:
  // bounded string lengths, bounded array sizes, no unknown keys. A
  // tampered client can otherwise embed arbitrary HTML / oversized
  // strings / unbounded arrays in workout names, exercise names, and
  // set notes that the share-importer would render verbatim.
  const validated = WorkoutDataPayloadSchema.safeParse(workout);
  if (!validated.success) {
    throw new Error('This workout cannot be shared: it contains invalid or oversized data.');
  }

  const expiresAt = new Date(
    Date.now() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Preferred shape: stamp user_id + expires_at. Fall back to the
  // legacy `shared_by` column if the new columns aren't deployed yet
  // (older Supabase project — keeps the rollout decoupled).
  const payload: Record<string, unknown> = { workout_data: validated.data, expires_at: expiresAt };
  if (userId) payload.user_id = userId;
  if (username) payload.shared_by = username;

  let { data, error } = await supabase
    .from('shared_workouts')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    // Retry without the new columns in case the migration hasn't run
    // on this environment yet.
    const legacyPayload: Record<string, unknown> = { workout_data: validated.data };
    if (username) legacyPayload.shared_by = username;
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

  // The RLS policy filters expired / revoked rows server-side, so a
  // missing row here means the link is either invalid, expired, or
  // revoked. We don't distinguish — surface the same generic error in
  // every case to avoid leaking link state to scrapers.
  const { data, error } = await supabase
    .from('shared_workouts')
    .select('workout_data, shared_by')
    .eq('id', match[1])
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Share link is invalid, expired, or has been revoked');

  // SECURITY (H2) — re-validate the payload on the importer side too.
  // The sharer is untrusted from our perspective (different user, may
  // be using a tampered client). Reject anything that doesn't match
  // the strict schema with the same generic copy we use for missing
  // rows — don't leak schema details to a scraper.
  const validated = WorkoutDataPayloadSchema.safeParse(data.workout_data);
  if (!validated.success) {
    throw new Error('Share link is invalid, expired, or has been revoked');
  }
  return {
    workout: validated.data,
    sharedBy: data.shared_by ?? null,
  };
}

/**
 * Revoke a previously-issued share. Marks the row's `revoked_at`
 * column server-side; the RLS policy filters it out of future
 * SELECTs immediately. Only the original creator (auth.uid() =
 * user_id) is permitted to revoke — RLS enforces this regardless
 * of what the client claims.
 */
export async function revokeShareLink(shareId: string): Promise<void> {
  const { error } = await supabase
    .from('shared_workouts')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', shareId);
  if (error) throw error;
}
