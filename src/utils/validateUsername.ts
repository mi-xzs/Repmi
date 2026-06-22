import filter from 'leo-profanity';
import { isReservedUsername } from './reservedUsernames';

const wordList = filter.list();

const ALLOWED = /^[a-zA-Z0-9_]+$/;

export function validateUsername(name: string): { ok: true } | { ok: false; reason: string } {
  const trimmed = name.trim();
  if (trimmed.length < 2) return { ok: false, reason: 'At least 2 characters' };
  if (trimmed.length > 20) return { ok: false, reason: 'Max 20 characters' };
  if (!ALLOWED.test(trimmed)) return { ok: false, reason: 'Only letters, numbers, and underscores' };

  if (isReservedUsername(trimmed)) {
    return { ok: false, reason: 'That username is not allowed' };
  }

  const lower = trimmed.toLowerCase();
  if (wordList.some(w => lower.includes(w))) return { ok: false, reason: 'That username is not allowed' };

  return { ok: true };
}
