import { supabase } from './supabase';
import { UserProfile } from '../types/user';

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, age, weight_kg, height_cm, goal, weekly_target, avatar_url, cover_url')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as UserProfile;
}

export async function uploadProfileImage(
  userId: string,
  bucket: 'avatars' | 'covers',
  uri: string,
): Promise<string | null> {
  const ext = (uri.split('.').pop()?.split('?')[0] ?? 'jpg').toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const path = `${userId}.${ext}`;

  const formData = new FormData();
  formData.append('file', { uri, name: path, type: mime } as any);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, formData, { contentType: mime, upsert: true });

  if (error) {
    console.error(`[uploadProfileImage] ${bucket}:`, error.message);
    return null;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_username_available', { p_username: username });
  if (error) return true;
  return data as boolean;
}

export async function upsertProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...profile });

  if (error) throw error;
}

export async function fetchFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  const [followersRes, followingRes] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id',  userId),
  ]);
  return {
    followers: followersRes.count ?? 0,
    following: followingRes.count ?? 0,
  };
}

// ─── User search + follow ──────────────────────────────────────────

export interface ProfileSearchResult {
  id: string;
  username: string;
  avatar_url: string | null;
}

/**
 * Followed-user shape — extends the search result with the cached
 * aggregate XP stored on the profile row. Leaderboard standings read
 * these directly so they never need to touch raw workout_sessions.
 */
export interface FollowedProfile extends ProfileSearchResult {
  total_xp: number;
  weekly_xp: number;
}

/**
 * The full per-user cache the leaderboard and view-profile screen
 * read instead of touching raw workout_sessions.
 */
export interface ProfileStats {
  totalXP: number;
  weeklyXP: number;
  totalSessions: number;
  totalVolumeKg: number;
  totalDurationSec: number;
  currentStreak: number;
  longestStreak: number;
  totalReps: number;
  totalSets: number;
  prCount: number;
}

/**
 * Persist the current user's aggregate stats to the profiles cache.
 * Called from XPContext after each refresh; failure is logged but
 * non-fatal — the cache may go stale but the user's own view is
 * still derived live in their app, so they're unaffected.
 */
export async function updateProfileStats(
  userId: string,
  stats: ProfileStats,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      total_xp: stats.totalXP,
      weekly_xp: stats.weeklyXP,
      total_sessions: stats.totalSessions,
      total_volume_kg: stats.totalVolumeKg,
      total_duration_sec: stats.totalDurationSec,
      current_streak: stats.currentStreak,
      longest_streak: stats.longestStreak,
      total_reps: stats.totalReps,
      total_sets: stats.totalSets,
      pr_count: stats.prCount,
      xp_updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) {
    console.error('[updateProfileStats]', error.message);
  }
}

/**
 * Read the cached stats for any user. Used by the view-profile
 * screen so it never needs to touch raw workout_sessions.
 */
export async function fetchProfileStats(
  userId: string,
): Promise<ProfileStats | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('total_xp, weekly_xp, total_sessions, total_volume_kg, total_duration_sec, current_streak, longest_streak, total_reps, total_sets, pr_count')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    totalXP: data.total_xp ?? 0,
    weeklyXP: data.weekly_xp ?? 0,
    totalSessions: data.total_sessions ?? 0,
    totalVolumeKg: Number(data.total_volume_kg ?? 0),
    totalDurationSec: data.total_duration_sec ?? 0,
    currentStreak: data.current_streak ?? 0,
    longestStreak: data.longest_streak ?? 0,
    totalReps: data.total_reps ?? 0,
    totalSets: data.total_sets ?? 0,
    prCount: data.pr_count ?? 0,
  };
}

/**
 * Case-insensitive partial username match. Returns up to `limit`
 * results, optionally excluding the caller's own id so users don't
 * see themselves in their own search results.
 */
export async function searchProfilesByUsername(
  query: string,
  excludeUserId?: string,
  limit = 20,
): Promise<ProfileSearchResult[]> {
  const q = query.trim();
  if (!q) return [];
  let req = supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .ilike('username', `%${q}%`)
    .not('username', 'is', null)
    .order('username', { ascending: true })
    .limit(limit);
  if (excludeUserId) req = req.neq('id', excludeUserId);
  const { data, error } = await req;
  if (error) {
    console.error('[searchProfilesByUsername]', error.message);
    return [];
  }
  return (data ?? []) as ProfileSearchResult[];
}

/**
 * Insert a follow row. Idempotent — duplicate inserts (already
 * following) succeed silently, since the unique-violation code
 * 23505 is treated as "no-op, already done."
 */
export async function followUser(
  followerId: string,
  followingId: string,
): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId });
  // 23505 = unique_violation — already following. Treat as success.
  if (error && (error as { code?: string }).code !== '23505') {
    throw error;
  }
}

export async function unfollowUser(
  followerId: string,
  followingId: string,
): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
  if (error) throw error;
}

/**
 * Returns the profile rows for every user who follows `userId`.
 * Two-step lookup (follows → profiles). Minimal fields — matches
 * what the follow-list modal needs.
 */
export async function fetchFollowers(
  userId: string,
): Promise<ProfileSearchResult[]> {
  const { data: rows, error: e1 } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId);
  if (e1) {
    console.error('[fetchFollowers] follows:', e1.message);
    return [];
  }
  const ids = (rows ?? []).map((r: { follower_id: string }) => r.follower_id);
  if (ids.length === 0) return [];
  const { data, error: e2 } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', ids);
  if (e2) {
    console.error('[fetchFollowers] profiles:', e2.message);
    return [];
  }
  return (data ?? []) as ProfileSearchResult[];
}

/**
 * Lightweight "users that `userId` follows" lookup. Same data shape
 * as fetchFollowers — used by the follow-list modal. The richer
 * fetchFollowingProfiles (which also reads cached XP) is reserved
 * for the leaderboard.
 */
export async function fetchFollowing(
  userId: string,
): Promise<ProfileSearchResult[]> {
  const { data: rows, error: e1 } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);
  if (e1) {
    console.error('[fetchFollowing] follows:', e1.message);
    return [];
  }
  const ids = (rows ?? []).map((r: { following_id: string }) => r.following_id);
  if (ids.length === 0) return [];
  const { data, error: e2 } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', ids);
  if (e2) {
    console.error('[fetchFollowing] profiles:', e2.message);
    return [];
  }
  return (data ?? []) as ProfileSearchResult[];
}

/**
 * Returns the full profile rows for every user `followerId` follows,
 * including the cached aggregate XP needed to populate standings.
 * Two-step lookup (follows → profiles) so it doesn't depend on a
 * specific FK alias being exposed by PostgREST.
 */
export async function fetchFollowingProfiles(
  followerId: string,
): Promise<FollowedProfile[]> {
  const { data: rows, error: e1 } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', followerId);
  if (e1) {
    console.error('[fetchFollowingProfiles] follows:', e1.message);
    return [];
  }
  const ids = (rows ?? []).map((r: { following_id: string }) => r.following_id);
  if (ids.length === 0) return [];
  const { data: profiles, error: e2 } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, total_xp, weekly_xp')
    .in('id', ids);
  if (e2) {
    console.error('[fetchFollowingProfiles] profiles:', e2.message);
    return [];
  }
  return (profiles ?? []).map((p: { id: string; username: string; avatar_url: string | null; total_xp: number | null; weekly_xp: number | null }) => ({
    id: p.id,
    username: p.username,
    avatar_url: p.avatar_url,
    total_xp: p.total_xp ?? 0,
    weekly_xp: p.weekly_xp ?? 0,
  }));
}

/**
 * Returns the set of `followingId`s the caller already follows from
 * a given list. Single round-trip — much cheaper than per-row
 * isFollowing checks when rendering search results.
 */
export async function fetchFollowingSet(
  followerId: string,
  followingIds: string[],
): Promise<Set<string>> {
  if (followingIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', followerId)
    .in('following_id', followingIds);
  if (error) {
    console.error('[fetchFollowingSet]', error.message);
    return new Set();
  }
  return new Set((data ?? []).map((r: { following_id: string }) => r.following_id));
}
