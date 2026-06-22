import * as SecureStore from 'expo-secure-store';
import * as Sentry from '@sentry/react-native';
import { registerSentryForwarder, _PII_REGEXES } from './logger';

const CONSENT_KEY = 'crash_reporting_enabled_v1';
export const CONSENT_PROMPT_KEY = 'crash_reporting_prompt_v1';

type ConsentDecision = 'yes' | 'not_now' | 'never';

const REDACTED = '[REDACTED]';
const { EMAIL_RE, DB_LEAK_RE } = _PII_REGEXES;

let initialised = false;

// ─── PII / sensitive-string scrubbing ───────────────────────────────────

function scrubString(v: string): string {
  let out = v.replace(EMAIL_RE, REDACTED);
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

function beforeSend(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
  try {
    if (event.user) {
      const id = event.user.id;
      event.user = id ? { id } : {};
    }

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

    if (event.tags)     event.tags     = scrubAny(event.tags)     as Record<string, string>;
    if (event.extra)    event.extra    = scrubAny(event.extra)    as Record<string, unknown>;
    if (event.contexts) event.contexts = scrubAny(event.contexts) as Record<string, Record<string, unknown>>;

    return event;
  } catch {
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
  }
}

function doInit(): void {
  if (initialised) return;
  const dsn = getDsn();
  if (!dsn) return;

  try {
    Sentry.init({
      dsn,
      enabled: true,
      tracesSampleRate: 0.0,
      sendDefaultPii: false,
      attachStacktrace: true,
      enableAutoSessionTracking: false,
      beforeSend,
    });

    registerSentryForwarder((code, level, scrub) => {
      Sentry.captureMessage(code, {
        level: level === 'error' ? 'error' : 'warning',
        extra: scrub,
      });
    });
    initialised = true;
  } catch {
    initialised = false;
  }
}

export async function isCrashReportingEnabled(): Promise<boolean> {
  return readPref();
}

export async function getCrashReportingConsentDecision(): Promise<ConsentDecision | null> {
  try {
    const v = await SecureStore.getItemAsync(CONSENT_PROMPT_KEY);
    if (v === 'yes' || v === 'not_now' || v === 'never') return v;
    return null;
  } catch {
    return null;
  }
}

export async function setCrashReportingConsentDecision(decision: ConsentDecision): Promise<void> {
  try {
    await SecureStore.setItemAsync(CONSENT_PROMPT_KEY, decision);
  } catch {
  }
  if (decision === 'yes') {
    await enableCrashReporting();
  } else {
    await disableCrashReporting();
  }
}

export async function initSentryIfEnabled(): Promise<void> {
  const enabled = await readPref();
  if (enabled) doInit();
}

export async function enableCrashReporting(): Promise<void> {
  await writePref(true);
  doInit();
}

export async function disableCrashReporting(): Promise<void> {
  await writePref(false);
  registerSentryForwarder(null);
  if (initialised) {
    try {
      await Sentry.close();
    } catch {
    }
    initialised = false;
  }
}

export function wrapApp<P extends object>(
  Component: React.ComponentType<P>,
): React.ComponentType<P> {
  if (!initialised) return Component;
  try {
    return (Sentry.wrap as unknown as <T>(c: T) => T)(Component);
  } catch {
    return Component;
  }
}
