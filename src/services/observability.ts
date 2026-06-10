// src/services/observability.ts
//
// M1 — Sentry crash reporting + PII scrubbing + GDPR opt-in gating.
//
// Default posture: DISABLED. Sentry is only initialised when the user
// has explicitly opted in via Settings → Privacy → "Help improve Repmi
// by sending crash reports", or via the first-launch consent modal.
// The preference is stored in SecureStore so it survives reinstall on
// the same device.
//
// SECURITY / PRIVACY:
//
//   - `beforeSend` runs on EVERY event and scrubs:
//       • `event.user.email`           — dropped.
//       • `event.user.username`        — dropped.
//       • email strings anywhere in the payload — REDACTED.
//       • Supabase / Postgres DB-shape error messages — REDACTED.
//       • `event.request.cookies`      — dropped.
//   - `tracesSampleRate: 0.0` in production — no performance/tracing
//     data is collected; that's a separate consent surface we don't
//     ask for in M1.
//   - `sendDefaultPii: false` — turns off Sentry's automatic IP /
//     username collection at the SDK layer too.
//
// Public API:
//
//   initSentryIfEnabled()   — call once on app launch. Reads SecureStore;
//                             noop unless the user opted in.
//   enableCrashReporting()  — call from Settings toggle / consent modal
//                             when the user opts in.
//   disableCrashReporting() — call from Settings toggle when the user
//                             opts out. Calls Sentry.close() and clears
//                             the preference.
//   isCrashReportingEnabled() — read the persisted preference.
//   wrapApp(Component)      — Sentry.wrap() variant that becomes a
//                             no-op identity wrapper when crash
//                             reporting is disabled.

import * as SecureStore from 'expo-secure-store';
import * as Sentry from '@sentry/react-native';
import { registerSentryForwarder, _PII_REGEXES } from './logger';

const CONSENT_KEY = 'crash_reporting_enabled_v1';
// Tracks whether the consent modal has been answered (Yes / Not now /
// Never). Stored separately from CONSENT_KEY so "Not now" is
// remembered without flipping the actual reporting state.
export const CONSENT_PROMPT_KEY = 'crash_reporting_prompt_v1';

type ConsentDecision = 'yes' | 'not_now' | 'never';

const REDACTED = '[REDACTED]';
const { EMAIL_RE, DB_LEAK_RE } = _PII_REGEXES;

let initialised = false;

// ─── PII / sensitive-string scrubbing ───────────────────────────────────
//
// Mirrors the logic in `logger.ts` so the Sentry instrumentation matches
// the logger's behaviour exactly.

function scrubString(v: string): string {
  // 1. Strip embedded emails. Surrounding text often stays useful.
  let out = v.replace(EMAIL_RE, REDACTED);
  // 2. If the remaining string looks like a Postgres / Supabase error
  //    message, redact the whole thing — partial-redaction would leak
  //    column / constraint names.
  if (DB_LEAK_RE.test(out)) out = REDACTED;
  return out;
}

function scrubAny(v: unknown): unknown {
  if (v == null) return v;
  if (typeof v === 'string') return scrubString(v);
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (Array.isArray(v)) return v.map(scrubAny);
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(v)) {
      if (/password|token|secret|cookie|authorization/i.test(key)) {
        out[key] = REDACTED;
        continue;
      }
      out[key] = scrubAny((v as Record<string, unknown>)[key]);
    }
    return out;
  }
  return v;
}

// ─── Sentry beforeSend hook ─────────────────────────────────────────────
//
// Runs synchronously for every event before transmission. Returns the
// sanitised event, or `null` to drop it entirely. We never drop — we
// just redact — so crash patterns still surface for the engineer.

function beforeSend(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
  try {
    // 1. User identity — keep only the opaque `id` (if any) so we can
    //    deduplicate events from the same install without pulling
    //    email / username.
    if (event.user) {
      const id = event.user.id;
      event.user = id ? { id } : {};
    }

    // 2. Request — drop cookies. Same for headers that can carry
    //    Authorization / Set-Cookie. (`request` rarely populates on
    //    React Native but the SDK reserves the path.)
    if (event.request) {
      const req = event.request as { cookies?: unknown; headers?: Record<string, string> };
      delete req.cookies;
      if (req.headers) {
        for (const h of Object.keys(req.headers)) {
          if (/authorization|cookie|set-cookie|x-api-key/i.test(h)) {
            req.headers[h] = REDACTED;
          }
        }
      }
    }

    // 3. Top-level strings — message, breadcrumbs, exception messages.
    if (event.message) {
      event.message = scrubString(event.message);
    }
    if (event.exception?.values) {
      for (const ex of event.exception.values) {
        if (ex.value) ex.value = scrubString(ex.value);
        if (ex.type)  ex.type  = scrubString(ex.type);
      }
    }
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map(b => ({
        ...b,
        message: b.message ? scrubString(b.message) : b.message,
        data: b.data ? (scrubAny(b.data) as Record<string, unknown>) : b.data,
      }));
    }

    // 4. Tags / extra / contexts — generic recursive scrub.
    if (event.tags)     event.tags     = scrubAny(event.tags)     as Record<string, string>;
    if (event.extra)    event.extra    = scrubAny(event.extra)    as Record<string, unknown>;
    if (event.contexts) event.contexts = scrubAny(event.contexts) as Record<string, Record<string, unknown>>;

    return event;
  } catch {
    // If scrubbing throws (shouldn't), DROP the event rather than ship
    // an unscrubbed one. Privacy > observability.
    return null;
  }
}

// ─── Init + preference lifecycle ────────────────────────────────────────

function getDsn(): string {
  return process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';
}

async function readPref(): Promise<boolean> {
  try {
    const v = await SecureStore.getItemAsync(CONSENT_KEY);
    return v === '1';
  } catch {
    return false;
  }
}

async function writePref(value: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(CONSENT_KEY, value ? '1' : '0');
  } catch {
    // best-effort; on failure we behave as if the preference is off
    // next launch — fail-closed for privacy.
  }
}

function doInit(): void {
  if (initialised) return;
  const dsn = getDsn();
  if (!dsn) return; // No DSN — silently skip; nothing useful to send.

  try {
    Sentry.init({
      dsn,
      enabled: true,
      // M1 — no perf/tracing collection in this round. Bumping this
      // would change the consent surface (perf data can carry URL
      // path params + user paths) so we leave it at zero.
      tracesSampleRate: 0.0,
      sendDefaultPii: false,
      attachStacktrace: true,
      // Disable session-tracking — it pings Sentry on app start /
      // foreground and can be used to derive DAU; we don't ask for
      // that consent.
      enableAutoSessionTracking: false,
      beforeSend,
    });

    // Wire the logger forwarder so logError/logWarn in production
    // surface as Sentry messages — but only AFTER opt-in.
    registerSentryForwarder((code, level, scrub) => {
      Sentry.captureMessage(code, {
        level: level === 'error' ? 'error' : 'warning',
        extra: scrub,
      });
    });
    initialised = true;
  } catch {
    // Don't let a Sentry init failure crash the app.
    initialised = false;
  }
}

/**
 * Read the persisted opt-in. Used by Settings to render the toggle
 * state on mount, and by `initSentryIfEnabled()` on launch.
 */
export async function isCrashReportingEnabled(): Promise<boolean> {
  return readPref();
}

/**
 * Read the consent-prompt decision. Used by the first-launch consent
 * modal to skip re-prompting.
 */
export async function getCrashReportingConsentDecision(): Promise<ConsentDecision | null> {
  try {
    const v = await SecureStore.getItemAsync(CONSENT_PROMPT_KEY);
    if (v === 'yes' || v === 'not_now' || v === 'never') return v;
    return null;
  } catch {
    return null;
  }
}

/**
 * Record the consent-modal decision. Persists the decision separately
 * from the actual opt-in flag — "Not now" is remembered so we don't
 * re-prompt, without flipping reporting on.
 */
export async function setCrashReportingConsentDecision(decision: ConsentDecision): Promise<void> {
  try {
    await SecureStore.setItemAsync(CONSENT_PROMPT_KEY, decision);
  } catch {
    // best-effort
  }
  if (decision === 'yes') {
    await enableCrashReporting();
  } else {
    // "not_now" and "never" both leave Sentry disabled. The
    // difference is only in whether the modal re-appears next launch.
    await disableCrashReporting();
  }
}

/**
 * Initialise Sentry IFF the user has previously opted in. Idempotent
 * — safe to call multiple times. Called from `App.tsx` on mount.
 */
export async function initSentryIfEnabled(): Promise<void> {
  const enabled = await readPref();
  if (enabled) doInit();
}

/**
 * Turn crash reporting ON. Persists the preference and initialises
 * Sentry if not already initialised. Called from Settings toggle and
 * from the "Yes" path of the consent modal.
 */
export async function enableCrashReporting(): Promise<void> {
  await writePref(true);
  doInit();
}

/**
 * Turn crash reporting OFF. Persists the preference, unregisters the
 * logger forwarder, and tells Sentry to drain + close (which prevents
 * any further events from being sent in this session).
 */
export async function disableCrashReporting(): Promise<void> {
  await writePref(false);
  registerSentryForwarder(null);
  if (initialised) {
    try {
      // `close()` flushes the queue then disables the client.
      await Sentry.close();
    } catch {
      // best-effort
    }
    initialised = false;
  }
}

/**
 * Wrap the root component for Sentry crash + breadcrumb capture.
 * When reporting is disabled we return the component as-is to avoid
 * loading any Sentry instrumentation hooks. Once enabled mid-session,
 * the next launch will pick up the wrap; we do NOT hot-swap because
 * Sentry's hooks must mount at the root and React-tree-replacement
 * mid-render is an anti-pattern.
 */
export function wrapApp<P extends object>(
  Component: React.ComponentType<P>,
): React.ComponentType<P> {
  // `Sentry.wrap` must run AFTER `Sentry.init`, otherwise the SDK logs
  // "App Start Span could not be finished. Sentry.wrap was called before
  // Sentry.init." Our init is privacy-gated and async — the opt-in flag is
  // read from SecureStore on mount via initSentryIfEnabled() — so at
  // module-eval time, when App.tsx runs `wrapApp(App)` for its default
  // export, init has not happened yet. Wrapping here would always precede
  // init and emit that warning.
  //
  // So we only wrap once Sentry is actually initialised. In practice that
  // means the root render returns the component unwrapped; crashes are
  // still captured by the global error handlers Sentry.init installs, and
  // with tracesSampleRate 0 the wrap only added app-start/touch tracing we
  // deliberately don't collect.
  if (!initialised) return Component;
  try {
    return (Sentry.wrap as unknown as <T>(c: T) => T)(Component);
  } catch {
    return Component;
  }
}
