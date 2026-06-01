// src/utils/reservedUsernames.ts
//
// M11 — Reserved-username deny-list.
//
// SECURITY: Reserved names defend two surfaces at once:
//
//   1. Impersonation / abuse — usernames like `admin`, `support`,
//      `verified`, `repmi`, `mod`, etc. would let a malicious user
//      mimic system actors in DMs, leaderboards, and shared workouts.
//   2. Brand confusion — names of major social platforms (`instagram`,
//      `twitter`, etc.) get squatted for phishing across the broader
//      ecosystem; reserving them up front prevents a domino-effect
//      report queue down the line.
//
// The list is conservative — if a name is borderline-legitimate (e.g.
// the user's actual name happens to be `mod`), the in-app block
// message says "not allowed" rather than enumerating the rule. Ops can
// extend the list at any time by editing this file and shipping a
// build; the username_validator on the server (see migration H11 /
// M11) treats this as the source of truth.

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

// O(1) lookups by pre-building the Set at module load. The list is
// small enough that an array also works, but a Set makes the intent
// explicit and avoids accidental string-contains traps.
const RESERVED_SET = new Set<string>(RESERVED);

/**
 * Returns true if `name` (case-insensitive) is on the reserved list.
 */
export function isReservedUsername(name: string): boolean {
  return RESERVED_SET.has(name.trim().toLowerCase());
}

/**
 * Future-proofing for if/when we relax the ASCII-only constraint.
 *
 * Unicode "confusables" are characters that LOOK like ASCII letters
 * but are different code points — e.g. Cyrillic `а` (U+0430) vs Latin
 * `a` (U+0061). They're used in homograph attacks where a username
 * like `аdmin` (with Cyrillic а) renders identically to `admin` but
 * passes a naive equality check.
 *
 * Right now `validateUsername.ts` enforces ASCII-only via
 * `/^[a-zA-Z0-9_]+$/`, which closes this attack vector entirely. If
 * we ever broaden to allow non-ASCII characters (e.g. for i18n), call
 * `containsConfusableUnicode()` and reject anything that returns true,
 * OR run the input through the Unicode `skeleton` algorithm
 * (Unicode TR39) and compare against the reserved-names skeleton set.
 *
 * For now this is a documentation-and-helper module — the production
 * username path NEVER calls it because the regex above already cuts
 * off non-ASCII at the door.
 */
export function containsConfusableUnicode(s: string): boolean {
  // Anything outside the basic Latin block is suspect for username
  // purposes. This is a coarse filter — a real Unicode-skeleton
  // implementation would normalise and compare against a reserved
  // skeleton table per TR39.
   
  return /[^\x00-\x7F]/.test(s);
}

export const RESERVED_USERNAMES = RESERVED;
