// src/services/moderationService.ts
//
// H12 — UGC moderation: block / unblock / report.
//
// All four operations rely on RLS — `blocks` and `reports` policies in
// the high-severity migration ensure a caller can only ever act as
// themselves. The client functions trust the RLS layer; they don't
// re-check `auth.uid()` themselves.

import { supabase } from './supabase';
import { logAuditEvent } from './profileService';

export interface BlockedUser {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
}

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'impersonation'
  | 'inappropriate'
  | 'other';

export const REPORT_REASONS: { key: ReportReason; label: string }[] = [
  { key: 'spam',           label: 'Spam'                              },
  { key: 'harassment',     label: 'Harassment or bullying'            },
  { key: 'impersonation',  label: 'Impersonation'                     },
  { key: 'inappropriate',  label: 'Inappropriate or sexual content'   },
  { key: 'other',          label: 'Something else'                    },
];

export async function blockUser(targetUserId: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const me = u?.user?.id;
  if (!me) throw new Error('Not signed in');
  if (me === targetUserId) throw new Error('Cannot block yourself');

  const { error } = await supabase
    .from('blocks')
    .insert({ blocker_id: me, blocked_id: targetUserId });
  // 23505 = already-blocked. Treat as success.
  if (error && (error as { code?: string }).code !== '23505') {
    throw error;
  }

  // Severing the follow relationship in both directions stops a
  // newly-blocked party from appearing in follow lists. Two
  // single-direction deletes — clearer than `.or()` and avoids
  // PostgREST nested-filter escaping quirks.
  await supabase
    .from('follows')
    .delete()
    .eq('follower_id', me)
    .eq('following_id', targetUserId);
  await supabase
    .from('follows')
    .delete()
    .eq('follower_id', targetUserId)
    .eq('following_id', me);

  // M8 — record the block in the audit log.
  await logAuditEvent('user_blocked', targetUserId, {});
}

export async function unblockUser(targetUserId: string): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const me = u?.user?.id;
  if (!me) throw new Error('Not signed in');

  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', me)
    .eq('blocked_id', targetUserId);
  if (error) throw error;

  // M8 — record the unblock so the audit trail is symmetric.
  await logAuditEvent('user_unblocked', targetUserId, {});
}

export async function fetchBlockedUsers(): Promise<BlockedUser[]> {
  const { data: u } = await supabase.auth.getUser();
  const me = u?.user?.id;
  if (!me) return [];

  const { data: blocks, error } = await supabase
    .from('blocks')
    .select('blocked_id, created_at')
    .eq('blocker_id', me)
    .order('created_at', { ascending: false });
  if (error || !blocks || blocks.length === 0) return [];

  const ids = blocks.map(b => b.blocked_id);
  // Profile rows for blocked users are filtered by the new
  // profiles_select_public policy — but the OWN-block exception kicks
  // in here because RLS allows the row when the caller has blocked
  // (i.e. when we're explicitly looking up our own block list).
  // Fall back to RPC if needed; for now just try the direct fetch.
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', ids);
  const byId = new Map<string, { id: string; username: string | null; avatar_url: string | null }>(
    (profiles ?? []).map(p => [p.id, p as { id: string; username: string | null; avatar_url: string | null }]),
  );
  return blocks.map(b => ({
    id: b.blocked_id,
    username: byId.get(b.blocked_id)?.username ?? null,
    avatar_url: byId.get(b.blocked_id)?.avatar_url ?? null,
    created_at: b.created_at,
  }));
}

export async function reportUser(
  targetUserId: string,
  reason: ReportReason,
  details?: string,
): Promise<void> {
  const { data: u } = await supabase.auth.getUser();
  const me = u?.user?.id;
  if (!me) throw new Error('Not signed in');
  if (me === targetUserId) throw new Error('Cannot report yourself');

  const { error } = await supabase
    .from('reports')
    .insert({
      reporter_id: me,
      reported_user_id: targetUserId,
      reason,
      details: details && details.trim().length > 0 ? details.trim().slice(0, 500) : null,
    });
  if (error) throw error;

  // M8 — record the report submission. Reason is recorded but the
  // free-text `details` is NOT, because it can contain PII about the
  // reported user that we don't want duplicated in the audit log.
  await logAuditEvent('user_reported', targetUserId, { reason });
}
