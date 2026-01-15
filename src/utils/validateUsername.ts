import filter from 'leo-profanity';

// Offensive proper nouns and harmful compound words not covered by leo-profanity


const wordList = filter.list();

const ALLOWED = /^[a-zA-Z0-9_]+$/;

export function validateUsername(name: string): { ok: true } | { ok: false; reason: string } {
  if (name.length > 20) return { ok: false, reason: 'Max 20 characters' };
  if (!ALLOWED.test(name)) return { ok: false, reason: 'Only letters, numbers, and underscores' };

  const lower = name.toLowerCase();
  if (wordList.some(w => lower.includes(w))) return { ok: false, reason: 'That username is not allowed' };

  return { ok: true };
}
