const RESERVED = [
  'admin',
  'administrator',
  'api',
  'app',
  'facebook',
  'help',
  'instagram',
  'mail',
  'me',
  'mod',
  'moderator',
  'noreply',
  'null',
  'official',
  'repmi',
  'root',
  'security',
  'staff',
  'support',
  'system',
  'team',
  'tiktok',
  'twitter',
  'undefined',
  'verified',
  'www',
  'youtube',
] as const;

const RESERVED_SET = new Set<string>(RESERVED);

export function isReservedUsername(name: string): boolean {
  return RESERVED_SET.has(name.trim().toLowerCase());
}

export function containsConfusableUnicode(s: string): boolean {
  return /[^\x00-\x7F]/.test(s);
}

export const RESERVED_USERNAMES = RESERVED;
