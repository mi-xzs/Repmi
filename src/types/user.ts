export type TrainingGoal = 'strength' | 'hypertrophy' | 'endurance' | 'weight_loss' | 'general';

export interface UserProfile {
  username: string;
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  goal: TrainingGoal | null;
  weekly_target: number;
  // H6 — `avatar_url`/`cover_url` are now SHORT-LIVED SIGNED URLs (1h TTL)
  // minted on read from `avatar_path`/`cover_path`. The path is the
  // authoritative reference to the stored object; the URL is a derived
  // view that may be re-issued at any time.
  avatar_url: string | null;
  cover_url: string | null;
  avatar_path?: string | null;
  cover_path?: string | null;
  // M11 — last time the username was changed. Server-side trigger
  // enforces a 30-day cooldown between successful changes; the client
  // reads this so the UI can show a friendly "available again on …"
  // message rather than letting the user submit a doomed update.
  username_changed_at?: string | null;
  // C1 — server-side privacy flag. RLS on `profiles` and the
  // `search_profiles` RPC both gate on this column, so it MUST be the
  // source of truth for the Settings → Privacy toggle. (A parallel
  // `user_settings.extra.publicProfile` field existed historically and
  // was unsynced — see audit C1.)
  is_public_profile?: boolean;
}
