import filter from 'leo-profanity';
import { isReservedUsername } from './reservedUsernames';

// Offensive proper nouns and harmful compound words not covered by leo-profanity


const wordList = filter.list();

// M11 — Username constraint.
//
// `^[a-zA-Z0-9_]+$` keeps the input fully ASCII, which is the simplest
// defence against Unicode-confusable / homograph attacks (e.g. Cyrillic
// `а` U+0430 vs Latin `a` U+0061 — they render the same but compare
// as different strings, letting a bad actor mimic legitimate handles).
//
// If/when the product wants to relax this to allow non-ASCII (for i18n
// or accented names), pair the change with a Unicode-skeleton check
// against the reserved-names list (see `reservedUsernames.ts`).
const ALLOWED = /^[a-zA-Z0-9_]+$/;

export function validateUsername(name: string): { ok: true } | { ok: false; reason: string } {
  const trimmed = name.trim();
  if (trimmed.length < 2) return { ok: false, reason: 'At least 2 characters' };
  if (trimmed.length > 20) return { ok: false, reason: 'Max 20 characters' };
  if (!ALLOWED.test(trimmed)) return { ok: false, reason: 'Only letters, numbers, and underscores' };

  // M11 — reserved deny-list. Surfaced as "not allowed" rather than
  // "reserved" so we don't enumerate the rule.
  if (isReservedUsername(trimmed)) {
    return { ok: false, reason: 'That username is not allowed' };
  }

  const lower = trimmed.toLowerCase();
  if (wordList.some(w => lower.includes(w))) return { ok: false, reason: 'That username is not allowed' };

  return { ok: true };
}
