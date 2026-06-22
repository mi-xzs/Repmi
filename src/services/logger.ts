// ─── PII / sensitive-string scrubbing ───────────────────────────────────

const EMAIL_RE = /[^\s<>"']+@[^\s<>"']+\.[^\s<>"']+/g;

const DB_LEAK_RE = /(duplicate key|constraint|column .* does not exist|relation .* does not exist|violates .* constraint|RLS policy)/i;

const REDACTED = '[REDACTED]';

function scrubString(v: string): string {
  let out = v.replace(EMAIL_RE, REDACTED);
  if (DB_LEAK_RE.test(out)) out = REDACTED;
  return out;
}

function scrubValue(v: unknown): unknown {
  if (v == null) return v;
  if (typeof v === 'string') return scrubString(v);
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (Array.isArray(v)) return v.map(scrubValue);
  if (typeof v === 'object') return scrubObject(v as Record<string, unknown>);
  return undefined;
}

function scrubObject(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(o)) {
    if (key === 'stack' || key === 'cause') continue;
    if (/password|token|secret|cookie|authorization/i.test(key)) {
      out[key] = REDACTED;
      continue;
    }
    out[key] = scrubValue(o[key]);
  }
  return out;
}

// ─── Sentry shim ────────────────────────────────────────────────────────

type SentryLevel = 'error' | 'warning';
type SentryForwarder = (code: string, level: SentryLevel, scrub: Record<string, unknown>) => void;

let sentryForwarder: SentryForwarder | null = null;

export function registerSentryForwarder(fn: SentryForwarder | null): void {
  sentryForwarder = fn;
}

// ─── Public API ─────────────────────────────────────────────────────────

export function logError(code: string, scrub?: Record<string, unknown>): void {
  const sanitized = scrub ? scrubObject(scrub) : {};
  if (__DEV__) {

    console.error(`[${code}]`, sanitized);
    return;
  }
  if (sentryForwarder) {
    try {
      sentryForwarder(code, 'error', sanitized);
    } catch {
    }
  }
}

export function logWarn(code: string, scrub?: Record<string, unknown>): void {
  const sanitized = scrub ? scrubObject(scrub) : {};
  if (__DEV__) {

    console.warn(`[${code}]`, sanitized);
    return;
  }
  if (sentryForwarder) {
    try {
      sentryForwarder(code, 'warning', sanitized);
    } catch {
    }
  }
}

export function logCacheCorruption(cacheKey: string, extra?: Record<string, unknown>): void {
  logWarn('cache.schema.invalid', { cacheKey, ...(extra ?? {}) });
}

// ─── Exposed regex constants ────────────────────────────────────────────
export const _PII_REGEXES = {
  EMAIL_RE,
  DB_LEAK_RE,
};
