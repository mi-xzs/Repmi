import { supabase } from './supabase';
import { UserProfile } from '../types/user';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
import { logError } from './logger';

const SIGNED_URL_TTL_SECONDS = 60 * 60;

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function isImageMagic(buf: Uint8Array): 'jpeg' | 'png' | 'webp' | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'jpeg';
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return 'png';
  }
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return 'webp';
  }
  return null;
}

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, '');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (c === '=') break;
    const v = alphabet.indexOf(c);
    if (v < 0) continue;
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, age, weight_kg, height_cm, goal, weekly_target, avatar_url, cover_url, avatar_path, cover_path, username_changed_at, is_public_profile')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as UserProfile & {
    avatar_path?: string | null;
    cover_path?: string | null;
  };
  if (row.avatar_path) {
    const signed = await getSignedProfileImageUrl('avatars', row.avatar_path);
    if (signed) row.avatar_url = signed;
  }
  if (row.cover_path) {
    const signed = await getSignedProfileImageUrl('covers', row.cover_path);
    if (signed) row.cover_url = signed;
  }
  return row as UserProfile;
}

export async function uploadProfileImage(
  userId: string,
  bucket: 'avatars' | 'covers',
  uri: string,
): Promise<{ url: string; path: string } | null> {
  try {
    const info = await FileSystem.getInfoAsync(uri, { size: true } as any);
    const size = (info as { size?: number }).size;
    if (typeof size === 'number' && size > MAX_UPLOAD_BYTES) {
      throw new Error('Only JPEG, PNG, or WebP up to 5 MB');
    }

    const head = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64' as any,
      length: 12,
      position: 0,
    } as any);
    const bytes = base64ToBytes(head);
    const detected = isImageMagic(bytes);
    if (!detected) {
      throw new Error('Only JPEG, PNG, or WebP up to 5 MB');
    }
    const mime =
      detected === 'png'  ? 'image/png'  :
      detected === 'webp' ? 'image/webp' : 'image/jpeg';
    const ext =
      detected === 'png'  ? 'png'  :
      detected === 'webp' ? 'webp' : 'jpg';

    const id =
      typeof (Crypto as { randomUUID?: () => string }).randomUUID === 'function'
        ? (Crypto as { randomUUID: () => string }).randomUUID()
        : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    const path = `${userId}/${id}.${ext}`;

    const formData = new FormData();
    formData.append('file', { uri, name: `${id}.${ext}`, type: mime } as any);

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, formData, { contentType: mime, upsert: false });

    if (error) {
      logError('profile.upload.failed', { bucket, supabaseCode: (error as { code?: string }).code });
      return null;
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (signErr || !signed?.signedUrl) {
      logError('profile.upload.sign.failed', { bucket, supabaseCode: (signErr as { code?: string } | null)?.code });
      return null;
    }
    return { url: signed.signedUrl, path };
  } catch (e) {
    logError('profile.upload.exception', { bucket, name: (e as Error).name });
    return null;
  }
}

export async function getSignedProfileImageUrl(
  bucket: 'avatars' | 'covers',
  path: string,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    logError('profile.signedUrl.failed', { bucket, supabaseCode: (error as { code?: string } | null)?.code });
    return null;
  }
  return data.signedUrl;
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_username_available', { p_username: username });
  if (error) {
    logError('profile.usernameCheck.failed', { supabaseCode: (error as { code?: string }).code });
    return false;
  }
  return data as boolean;
}

const ALLOWED_PROFILE_KEYS = [
  'username',
  'age',
  'weight_kg',
  'height_cm',
  'goal',
  'weekly_target',
  'avatar_url',
  'cover_url',
  'avatar_path',
  'cover_path',
  'is_public_profile',
] as const;

type AllowedProfileKey = typeof ALLOWED_PROFILE_KEYS[number];

export async function upsertProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
  const safe: Partial<Record<AllowedProfileKey, unknown>> = {};
  for (const key of ALLOWED_PROFILE_KEYS) {
    if (key in profile) {
      const value = (profile as Record<string, unknown>)[key];
      if (value !== undefined) safe[key] = value;
    }
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...safe });

  if (error) throw error;
}

// ─── M11 — Username-change window helpers ──────────────────────────────────

export function daysUntilUsernameChangeAllowed(
  lastChangedAt: string | null | undefined,
): number {
  if (!lastChangedAt) return 0;
  const last = new Date(lastChangedAt).getTime();
  if (!Number.isFinite(last)) return 0;
  const elapsedMs = Date.now() - last;
  const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
  const remainingMs = WINDOW_MS - elapsedMs;
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
}

export function usernameChangeAvailableOn(
  lastChangedAt: string | null | undefined,
): Date | null {
  if (!lastChangedAt) return null;
  const last = new Date(lastChangedAt).getTime();
  if (!Number.isFinite(last)) return null;
  const next = new Date(last + 30 * 24 * 60 * 60 * 1000);
  if (next.getTime() <= Date.now()) return null;
  return next;
}

// ─── M8 — audit log ────────────────────────────────────────────────────────

export async function logAuditEvent(
  action: string,
  targetId: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await supabase.rpc('log_audit_event', {
    p_action: action,
    p_target_id: targetId,
    p_metadata: metadata,
  });
  if (error) {
    logError('audit.append.failed', { action, supabaseCode: (error as { code?: string }).code });
  }
}

export async function fetchFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
  const [followersRes, followingRes] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId).eq('status', 'accepted'),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id',  userId).eq('status', 'accepted'),
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

export interface FollowedProfile extends ProfileSearchResult {
  total_xp: number;
  weekly_xp: number;
}

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
    logError('profile.stats.update.failed', { supabaseCode: (error as { code?: string }).code });
  }
}

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

const USERNAME_QUERY_RE = /^[a-zA-Z0-9_]{2,20}$/;

export async function searchProfilesByUsername(
  query: string,
  excludeUserId?: string,
  limit = 20,
): Promise<ProfileSearchResult[]> {
  const q = query.trim();
  if (!USERNAME_QUERY_RE.test(q)) return [];

  const { data, error } = await supabase.rpc('search_profiles', {
    p_query: q,
  });
  if (error) {
    logError('profile.search.failed', { supabaseCode: (error as { code?: string }).code });
    return [];
  }
  const rows = (data ?? []) as ProfileSearchResult[];
  const filtered = excludeUserId
    ? rows.filter(r => r.id !== excludeUserId)
    : rows;
  return filtered.slice(0, limit);
}

export async function followUser(
  _legacyFollowerIdOrFollowingId: string,
  followingId?: string,
): Promise<FollowEdgeStatus> {
  const targetId = followingId ?? _legacyFollowerIdOrFollowingId;

  const { data: userResp, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userResp?.user?.id) {
    throw new Error('Not signed in');
  }
  const followerId = userResp.user.id;
  if (followerId === targetId) {
    return 'accepted';
  }

  const { data, error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: targetId })
    .select('status')
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      const { data: existing } = await supabase
        .from('follows')
        .select('status')
        .eq('follower_id', followerId)
        .eq('following_id', targetId)
        .maybeSingle();
      return ((existing?.status as FollowEdgeStatus) ?? 'accepted');
    }
    throw error;
  }
  return ((data?.status as FollowEdgeStatus) ?? 'pending');
}

export async function unfollowUser(
  _legacyFollowerIdOrFollowingId: string,
  followingId?: string,
): Promise<void> {
  const targetId = followingId ?? _legacyFollowerIdOrFollowingId;

  const { data: userResp, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userResp?.user?.id) {
    throw new Error('Not signed in');
  }
  const followerId = userResp.user.id;

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', targetId);
  if (error) throw error;
}

export async function fetchFollowers(
  userId: string,
): Promise<ProfileSearchResult[]> {
  const { data: rows, error: e1 } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', userId)
    .eq('status', 'accepted');
  if (e1) {
    logError('profile.followers.fetch.failed', { stage: 'follows', supabaseCode: (e1 as { code?: string }).code });
    return [];
  }
  const ids = (rows ?? []).map((r: { follower_id: string }) => r.follower_id);
  if (ids.length === 0) return [];
  const { data, error: e2 } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', ids);
  if (e2) {
    logError('profile.followers.fetch.failed', { stage: 'profiles', supabaseCode: (e2 as { code?: string }).code });
    return [];
  }
  return (data ?? []) as ProfileSearchResult[];
}

export async function fetchFollowing(
  userId: string,
): Promise<ProfileSearchResult[]> {
  const { data: rows, error: e1 } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .eq('status', 'accepted');
  if (e1) {
    logError('profile.following.fetch.failed', { stage: 'follows', supabaseCode: (e1 as { code?: string }).code });
    return [];
  }
  const ids = (rows ?? []).map((r: { following_id: string }) => r.following_id);
  if (ids.length === 0) return [];
  const { data, error: e2 } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', ids);
  if (e2) {
    logError('profile.following.fetch.failed', { stage: 'profiles', supabaseCode: (e2 as { code?: string }).code });
    return [];
  }
  return (data ?? []) as ProfileSearchResult[];
}

export async function fetchFollowingProfiles(
  followerId: string,
): Promise<FollowedProfile[]> {
  const { data: rows, error: e1 } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', followerId)
    .eq('status', 'accepted');
  if (e1) {
    logError('profile.followingProfiles.fetch.failed', { stage: 'follows', supabaseCode: (e1 as { code?: string }).code });
    return [];
  }
  const ids = (rows ?? []).map((r: { following_id: string }) => r.following_id);
  if (ids.length === 0) return [];
  const { data: profiles, error: e2 } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, total_xp, weekly_xp')
    .in('id', ids);
  if (e2) {
    logError('profile.followingProfiles.fetch.failed', { stage: 'profiles', supabaseCode: (e2 as { code?: string }).code });
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

export async function fetchFollowingSet(
  followerId: string,
  followingIds: string[],
): Promise<Set<string>> {
  if (followingIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', followerId)
    .eq('status', 'accepted')
    .in('following_id', followingIds);
  if (error) {
    logError('profile.followingSet.fetch.failed', { supabaseCode: (error as { code?: string }).code });
    return new Set();
  }
  return new Set((data ?? []).map((r: { following_id: string }) => r.following_id));
}

// ─── Follow requests (Instagram-style) ──────────────────────────────────────

export type FollowEdgeStatus = 'pending' | 'accepted';

export async function fetchFollowEdges(
  followerId: string,
  targetIds: string[],
): Promise<Map<string, FollowEdgeStatus>> {
  if (targetIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('follows')
    .select('following_id, status')
    .eq('follower_id', followerId)
    .in('following_id', targetIds);
  if (error) {
    logError('profile.followEdges.fetch.failed', { supabaseCode: (error as { code?: string }).code });
    return new Map();
  }
  return new Map(
    (data ?? []).map((r: { following_id: string; status: FollowEdgeStatus }) => [r.following_id, r.status]),
  );
}

export async function acceptFollowRequest(requesterId: string): Promise<void> {
  const { data: u, error: ue } = await supabase.auth.getUser();
  if (ue || !u?.user?.id) throw new Error('Not signed in');
  const me = u.user.id;
  const { error } = await supabase
    .from('follows')
    .update({ status: 'accepted' })
    .eq('follower_id', requesterId)
    .eq('following_id', me)
    .eq('status', 'pending');
  if (error) throw error;
}

export async function rejectFollowRequest(requesterId: string): Promise<void> {
  const { data: u, error: ue } = await supabase.auth.getUser();
  if (ue || !u?.user?.id) throw new Error('Not signed in');
  const me = u.user.id;
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', requesterId)
    .eq('following_id', me);
  if (error) throw error;
}

export async function fetchIncomingFollowRequests(): Promise<ProfileSearchResult[]> {
  const { data: u, error: ue } = await supabase.auth.getUser();
  if (ue || !u?.user?.id) return [];
  const me = u.user.id;
  const { data: rows, error: e1 } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('following_id', me)
    .eq('status', 'pending');
  if (e1) {
    logError('profile.followRequests.fetch.failed', { stage: 'follows', supabaseCode: (e1 as { code?: string }).code });
    return [];
  }
  const ids = (rows ?? []).map((r: { follower_id: string }) => r.follower_id);
  if (ids.length === 0) return [];
  const { data, error: e2 } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', ids);
  if (e2) {
    logError('profile.followRequests.fetch.failed', { stage: 'profiles', supabaseCode: (e2 as { code?: string }).code });
    return [];
  }
  return (data ?? []) as ProfileSearchResult[];
}

export async function fetchPendingRequestCount(): Promise<number> {
  const { data: u, error: ue } = await supabase.auth.getUser();
  if (ue || !u?.user?.id) return 0;
  const me = u.user.id;
  const { count, error } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', me)
    .eq('status', 'pending');
  if (error) {
    logError('profile.pendingCount.fetch.failed', { supabaseCode: (error as { code?: string }).code });
    return 0;
  }
  return count ?? 0;
}
