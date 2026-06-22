import { supabase } from './supabase';
import { logError } from './logger';

export type ConsentKind = 'body_metrics' | 'training_data';

export interface ConsentRow {
  kind: ConsentKind;
  granted_at: string;
  revoked_at: string | null;
}

export async function fetchConsents(userId: string): Promise<ConsentRow[]> {
  const { data, error } = await supabase
    .from('user_consents')
    .select('kind, granted_at, revoked_at')
    .eq('user_id', userId);
  if (error) {
    logError('consent.fetch.failed', { supabaseCode: (error as { code?: string }).code });
    return [];
  }
  return (data ?? []) as ConsentRow[];
}

export async function hasConsent(
  userId: string,
  kind: ConsentKind,
): Promise<boolean> {
  const rows = await fetchConsents(userId);
  const row = rows.find(r => r.kind === kind);
  return !!row && !row.revoked_at;
}

export async function grantConsent(
  userId: string,
  kind: ConsentKind,
): Promise<void> {
  const { error } = await supabase
    .from('user_consents')
    .upsert(
      { user_id: userId, kind, granted_at: new Date().toISOString(), revoked_at: null },
      { onConflict: 'user_id,kind' },
    );
  if (error) throw error;
}

export async function revokeConsent(
  userId: string,
  kind: ConsentKind,
): Promise<void> {
  const { error } = await supabase
    .from('user_consents')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('kind', kind);
  if (error) throw error;
}
