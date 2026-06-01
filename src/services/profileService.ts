import { supabase } from './supabase';
import { UserProfile } from '../types/user';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
import { logError } from './logger';

// SECURITY (H6) — Signed URL TTL. 1 hour is short enough that a copied
// URL won't long-outlive the user session that produced it, but long
// enough to cover image caches and slow network refreshes.
const SIGNED_URL_TTL_SECONDS = 60 * 60;

// SECURITY (H13) — magic-bytes whitelist for image uploads. Reading the
// first 12 bytes of the file is enough to disambiguate the three formats
// we accept (JPEG, PNG, WEBP).
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function isImageMagic(buf: Uint8Array): 'jpeg' | 'png' | 'webp' | null {
  // JPEG — FF D8 FF (start-of-image + APP marker)
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'jpeg';
  }
  // PNG — 89 50 4E 47 0D 0A 1A 0A
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return 'png';
  }
  // WEBP — RIFF....WEBP (52 49 46 46 .. .. .. .. 57 45 42 50)
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
  // RN doesn't have atob in all engines; do it by hand. Tolerant of
  // padding and whitespace.
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

  // H6 — When the profile has a stored object path, mint a FRESH signed
  // URL (1h TTL) and return THAT as `avatar_url` / `cover_url`. The
  // legacy `avatar_url` column may still hold an expired signed URL
  // from a previous fetch; the path is the source of truth.
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

/**
 * H6 + H13 — Upload an avatar or cover image, then return a SHORT-LIVED
 * SIGNED URL pointing at it.
 *
 * Hardening applied:
 *   - Storage bucket is private (RLS-protected in the migration); the
 *     legacy `getPublicUrl()` path is gone. Every read goes through a
 *     1-hour signed URL.
 *   - Path is randomised — `${userId}/${randomUUID}.${ext}` — so a
 *     scraper can't enumerate uploaded files by guessing user ids.
 *     The previous user-id-as-filename scheme made every avatar
 *     trivially fetchable.
 *   - Magic-bytes check: the file's first 12 bytes are read and
 *     matched against JPEG/PNG/WEBP signatures. Anything else is
 *     rejected (closes the "rename evil.exe to avatar.jpg" path).
 *   - Size cap: 5 MiB hard limit. Enforce server-side via the bucket's
 *     `max_file_size` setting (see SECURITY_MANUAL_STEPS.md → H13).
 *
 * Returns `{ url, path }` so the caller can stamp the (raw) path on the
 * profile row for later signed-URL refreshes, while the (signed) url is
 * what gets fed straight into <Image>.
 */
export async function uploadProfileImage(
  userId: string,
  bucket: 'avatars' | 'covers',
  uri: string,
): Promise<{ url: string; path: string } | null> {
  try {
    // 1. Size cap. expo-file-system reports the raw byte size on disk.
    const info = await FileSystem.getInfoAsync(uri, { size: true } as any);
    const size = (info as { size?: number }).size;
    if (typeof size === 'number' && size > MAX_UPLOAD_BYTES) {
      throw new Error('Only JPEG, PNG, or WebP up to 5 MB');
    }

    // 2. Magic-bytes check. Read first 12 bytes as base64 then decode.
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

    // 3. Random per-upload path under the user's prefix.
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

    // 4. Signed URL — short-lived (1h) read access.
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

/**
 * H6 — Issue a fresh signed URL for an existing object path. Use when
 * loading a profile whose stored `avatar_path` / `cover_path` is
 * already known. TTL is 1 hour.
 */
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
  // A5 / M1 — fail CLOSED. On RPC error, treat the username as unavailable
  // rather than available: a transient error must never let a client sail
  // past the availability gate and attempt to claim a taken/invalid name
  // (the DB unique constraint is the final authority, but failing open here
  // produced a confusing "available → then rejected on submit" UX and
  // masked outages). Returning false surfaces the problem at check time.
  if (error) {
    logError('profile.usernameCheck.failed', { supabaseCode: (error as { code?: string }).code });
    return false;
  }
  return data as boolean;
}

// SECURITY (H1) — allowlist of profile columns a client is permitted to
// write through this path. The `profiles` table also stores aggregate
// cache columns (`total_xp`, `weekly_xp`, `pr_count`, `current_streak`,
// `longest_streak`, `total_sessions`, `total_volume_kg`,
// `total_duration_sec`, `total_reps`, `total_sets`, `xp_updated_at`)
// that affect leaderboards / season standings. Those MUST NOT be
// settable via this generic upsert — a tampered client could otherwise
// inject arbitrary XP onto its own row (RLS only gates row ownership,
// not column identity).
//
// `updateProfileStats` below is the only sanctioned writer for the
// cache columns, and the long-term fix is a SECURITY DEFINER RPC that
// recomputes them server-side from `workout_sessions`.
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
  // Strip everything except the allowlisted columns. `username_changed_at`
  // is read-only client-side (server trigger maintains it), so it's
  // deliberately excluded from the allowlist.
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

/**
 * Days until the next allowed username change. Returns 0 when the
 * 30-day window has elapsed (or has never started). Caller is expected
 * to use this to render a friendly "available again on …" message
 * BEFORE the user submits — the server-side trigger still enforces
 * the rule authoritatively if the client check is bypassed.
 */
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

/**
 * Pretty-print the date when the next username change is allowed.
 * Returns null when the window has already elapsed.
 */
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

/**
 * Append a row to `public.audit_log` via the SECURITY DEFINER RPC.
 *
 * Use for security-relevant events: account_deleted, mfa_enrolled,
 * mfa_unenrolled, password_changed, user_blocked, user_reported. The
 * RPC stamps `actor_id = auth.uid()` server-side so the client cannot
 * spoof attribution.
 *
 * Failure is logged but non-fatal — a missed audit row is better than
 * blocking a user-visible flow on a moderation table write.
 */
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
  // Only ACCEPTED edges count — pending follow requests must not inflate
  // follower/following totals.
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
 *
 * SECURITY: This client-side update writes columns that affect
 * leaderboards/season standings (total_xp, weekly_xp, …) — i.e. a
 * malicious client could otherwise inject arbitrary XP. The server
 * now enforces ownership: the RLS policy on `profiles` (see
 * `enable_rls_and_policies` migration) restricts UPDATE to
 * `auth.uid() = id`, so the worst a client can do is lie about its
 * OWN cache. Moving the calculation server-side (e.g. into a
 * SECURITY DEFINER RPC that re-aggregates from workout_sessions) is
 * the proper long-term fix; out of scope for this audit round.
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
    logError('profile.stats.update.failed', { supabaseCode: (error as { code?: string }).code });
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
 * H11 — Username search.
 *
 * Client-side validation: enforces 2..20 chars and `[a-zA-Z0-9_]` only.
 * Anything else returns no rows without round-tripping. This shrinks
 * the abusable surface (no ilike-wildcard injection, no DOS via
 * `%`-only queries that scan the table) before the request even fires.
 *
 * Server-side: calls the `search_profiles` SECURITY DEFINER RPC, which
 * re-validates the same regex and applies a per-user rate limit
 * (rpc_call_log table — see migration). The RPC is the authoritative
 * boundary; the client check is purely a UX shortcut.
 */
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

/**
 * Insert a follow row. Idempotent — duplicate inserts (already
 * following) succeed silently, since the unique-violation code
 * 23505 is treated as "no-op, already done."
 *
 * SECURITY: `follower_id` is derived from the current Supabase session
 * inside this function (not taken from the caller) so a client can't
 * spoof a follow on behalf of another user. The previous signature
 * `(followerId, followingId)` allowed any signed-in user to create
 * follow rows for arbitrary accounts (IDOR). The legacy `followerId`
 * argument is still accepted (and ignored) so existing call sites that
 * pass `(viewerId, targetId)` keep working without edits this release;
 * RLS on the `follows` table also enforces `auth.uid() = follower_id`
 * server-side as the authoritative check.
 */
export async function followUser(
  _legacyFollowerIdOrFollowingId: string,
  followingId?: string,
): Promise<FollowEdgeStatus> {
  // Resolve the real arg: if a second arg was passed we assume the
  // legacy `(viewerId, targetId)` shape; otherwise the first arg IS
  // the target id (new shape).
  const targetId = followingId ?? _legacyFollowerIdOrFollowingId;

  const { data: userResp, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userResp?.user?.id) {
    throw new Error('Not signed in');
  }
  const followerId = userResp.user.id;
  if (followerId === targetId) {
    // Self-follow is nonsensical and would either fail at the DB or
    // pollute follower counts. Bail quietly.
    return 'accepted';
  }

  // The BEFORE INSERT trigger sets status from the target's privacy
  // (accepted for public, pending for private). `.select('status')`
  // reads back the server's decision so the UI can show
  // Following vs Requested.
  const { data, error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: targetId })
    .select('status')
    .single();

  if (error) {
    // 23505 = unique_violation — edge already exists. Return its current
    // status rather than erroring (idempotent re-tap).
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
  // Accepted-only: a pending request is NOT "following".
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

/**
 * For each target id, the caller's edge status toward it: 'accepted'
 * (following), 'pending' (requested), or absent (not following). Powers the
 * 3-state follow button in one round-trip.
 */
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

/**
 * Approve an incoming follow request (caller must be the target). Flips the
 * pending edge to accepted; RLS + the guard trigger ensure only the target
 * can do this and only in the pending -> accepted direction.
 */
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

/**
 * Reject (or remove) an incoming follow request/follower — caller is the
 * target. Just deletes the edge; the follower can re-request later.
 */
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

/**
 * The caller's incoming pending follow requests, as profile rows to render in
 * the requests inbox. Two-step lookup (follows -> profiles).
 */
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

/** Count of the caller's incoming pending requests — for the inbox badge. */
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
