// src/services/logger.ts
//
// L1 — Structured logging helper.
//
// Why a wrapper around console:
//
//  - Production bundles strip `console.log/info/debug/trace` via the
//    babel-plugin-transform-remove-console plugin, but `console.error`
//    and `console.warn` are kept (they're useful for native crash
//    reports). If we feed those calls raw error objects, the message
//    text — which can contain emails, Supabase error bodies, schema
//    names, etc. — ends up on Logcat and in any crash reporter
//    output.
//  - The audit's HIGH and MEDIUM rounds called for replacing free-form
//    `console.error('...', err.message)` with structured, PII-scrubbed
//    log codes. This module is the single chokepoint that performs
//    that scrub.
//
// API:
//
//   logError('profile.fetch.failed', { supabaseCode: e.code })
//   logWarn('session.queue.flush.retry', { attempt: 3 })
//   logCacheCorruption('workouts')   // M6 — convenience for Zod cache
//                                    //       schema misses.
//
// The `scrub` parameter is a plain object. Any string value that
// matches an email regex (or that looks like a Supabase constraint
// message) is redacted. Stack and `cause` fields are dropped
// entirely.
//
// Behavioural matrix:
//
//                       __DEV__              production
//   logError('code',…) console.error(…)      Sentry.captureMessage when
//                                            crashReportingEnabled, else
//                                            no-op.
//   logWarn ('code',…) console.warn(…)        ditto, level=warning.
//
// Sentry is initialised lazily by `observability.ts` and only when the
// user has opted in. The logger must NOT import the Sentry SDK directly
// — that pulls native code into the bundle even if the user never opts
// in. We use a tiny shim that observability.ts registers at runtime.

// ─── PII / sensitive-string scrubbing ───────────────────────────────────
//
// Patterns reused across observability.ts (Sentry beforeSend) so the same
// rules apply whether a value flows through the logger or via the Sentry
// instrumentation hooks. Kept here so we have ONE place to update.

const EMAIL_RE = /[^\s<>"']+@[^\s<>"']+\.[^\s<>"']+/g;

// Supabase / PostgREST error messages often include schema names,
// constraint names, and the offending column / value — all leak DB
// structure to anyone reading the log. Treat any string matching one
// of these substrings as "DB-leak suspect" and redact entirely.
const DB_LEAK_RE = /(duplicate key|constraint|column .* does not exist|relation .* does not exist|violates .* constraint|RLS policy)/i;

const REDACTED = '[REDACTED]';

function scrubString(v: string): string {
  // 1. Strip embedded emails first — surrounding text often stays useful.
  let out = v.replace(EMAIL_RE, REDACTED);
  // 2. If the remaining string looks like a Supabase DB error, redact
  //    the whole thing — partial-redaction would leak column names.
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
    // Always drop stack / cause — they carry call-site filenames that
    // can include the user's home-directory path on dev builds and
    // are useless for log codes anyway.
    if (key === 'stack' || key === 'cause') continue;
    // Drop anything obviously credential-y.
    if (/password|token|secret|cookie|authorization/i.test(key)) {
      out[key] = REDACTED;
      continue;
    }
    out[key] = scrubValue(o[key]);
  }
  return out;
}

// ─── Sentry shim ────────────────────────────────────────────────────────
//
// observability.ts calls `registerSentryForwarder()` after Sentry has
// been initialised AND the user has opted in. Until then, the shim is
// a no-op so unrelated modules can call logError/logWarn from the
// first line of the bundle without crashing the import graph.

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
    // Pretty-print in dev so the engineer sees something useful.
     
    console.error(`[${code}]`, sanitized);
    return;
  }
  if (sentryForwarder) {
    try {
      sentryForwarder(code, 'error', sanitized);
    } catch {
      // Never let logging crash the app.
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
      // Never let logging crash the app.
    }
  }
}

/**
 * M6 — convenience helper used by `cacheSchemas.ts` so each schema
 * miss site doesn't need to repeat the same code string.
 */
export function logCacheCorruption(cacheKey: string, extra?: Record<string, unknown>): void {
  logWarn('cache.schema.invalid', { cacheKey, ...(extra ?? {}) });
}

// ─── Exposed regex constants ────────────────────────────────────────────
//
// observability.ts reuses these from its beforeSend hook so the Sentry
// instrumentation matches the logger's behaviour exactly.
export const _PII_REGEXES = {
  EMAIL_RE,
  DB_LEAK_RE,
};
