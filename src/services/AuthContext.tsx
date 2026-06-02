import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { clearLocalUserData } from './clearLocalUserData';
import { mapAuthError } from './errorMessages';
import { logError } from './logger';

// Web-only: detect a password-recovery landing URL synchronously, before
// React mounts. Supabase fires a PASSWORD_RECOVERY auth event after it
// parses the URL hash, but that event can race the listener attachment
// in AuthContext's useEffect — if the parse finishes before we subscribe,
// the event is silently lost and the user lands on the home page (since
// Supabase already created a session) instead of the reset form.
//
// We detect by PATHNAME alone: `/auth/reset` is only ever reached via
// the email link, no normal user navigates there. This is more robust
// than checking the URL hash because:
//   - Supabase clears the hash via history.replaceState after parsing,
//     and that can fire before our useState initialiser runs
//   - PKCE flow uses `?code=` which the implicit-flow check would miss
//   - Even if the hash is partially eaten by some other handler, the
//     path stays intact until we explicitly navigate away
function detectRecoveryFromUrl(): boolean {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined') return false;
  try {
    const pathname = window.location.pathname || '';
    return pathname.startsWith('/auth/reset');
  } catch {
    return false;
  }
}

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  // H2 — true when the user has a valid Supabase session at AAL1 but
  // has TOTP enrolled and must verify a code before reaching AAL2.
  mfaRequired: boolean;
  // True between the moment the user clicks a password-reset email
  // link (Supabase fires PASSWORD_RECOVERY) and the moment they finish
  // setting a new password. While true, RootNavigator hijacks the
  // navigator to PasswordResetConfirmScreen regardless of session
  // state — otherwise the recovery session would route the user
  // straight to the home tab and they'd never see the reset form.
  inPasswordRecovery: boolean;
  // Called by PasswordResetConfirmScreen when it detects recovery
  // tokens in route.params and is about to call setSession(). Without
  // this explicit set, RootNavigator would see "session arrived, no
  // recovery flag" and route the user to Main, unmounting the reset
  // form. Web uses the synchronous pathname check in
  // detectRecoveryFromUrl() and so doesn't need this.
  setPasswordRecovery: () => void;
  // Called by PasswordResetConfirmScreen after a successful update.
  clearPasswordRecovery: () => void;
  signUp: (
    email: string,
    password: string,
    emailRedirectTo?: string,
  ) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshAAL: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);
  // Seed from URL on first render so we don't race Supabase's
  // PASSWORD_RECOVERY event. Once set true, only clearPasswordRecovery()
  // or signOut() flips it back.
  const [inPasswordRecovery, setInPasswordRecovery] = useState<boolean>(
    () => detectRecoveryFromUrl(),
  );

  // H2 — Recompute the MFA gate after a session changes. If the
  // user has a verified TOTP factor but the session is still AAL1,
  // they need to satisfy a challenge before we show app content.
  async function refreshAAL(): Promise<void> {
    try {
      const { data, error } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) {
        setMfaRequired(false);
        return;
      }
      const need =
        !!data &&
        data.currentLevel === 'aal1' &&
        data.nextLevel === 'aal2';
      setMfaRequired(need);
    } catch {
      setMfaRequired(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
      if (data.session) refreshAAL();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (s) refreshAAL();
      else setMfaRequired(false);
      // Web: Supabase fires PASSWORD_RECOVERY after parsing the recovery
      // tokens from the URL hash (detectSessionInUrl=true on web). We
      // mirror that into state so RootNavigator can route to the reset
      // form instead of the home tab.
      if (event === 'PASSWORD_RECOVERY') {
        setInPasswordRecovery(true);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  function setPasswordRecovery() {
    setInPasswordRecovery(true);
  }

  function clearPasswordRecovery() {
    setInPasswordRecovery(false);
  }

  async function signUp(
    email: string,
    password: string,
    emailRedirectTo?: string,
  ): Promise<string | null> {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      // Routes the "Confirm email" button in the welcome email to the
      // app's confirmation deep link. Without this, Supabase falls
      // back to the dashboard Site URL, which on native lands the user
      // on the app's root screen without parsing the recovery tokens.
      options: emailRedirectTo ? { emailRedirectTo } : undefined,
    });
    if (error) {
      // M7: log the raw error code for diagnostics; return scrubbed
      // copy so the UI can't accidentally surface the email leak that
      // Supabase puts in `error.message` on duplicate-signup.
      logError('auth.signup.failed', {
        code: (error as { code?: string }).code,
        status: (error as { status?: number }).status,
      });
      return mapAuthError(error);
    }
    return null;
  }

  async function signIn(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      logError('auth.signin.failed', {
        code: (error as { code?: string }).code,
        status: (error as { status?: number }).status,
      });
      return mapAuthError(error);
    }
    // After password auth, ask the server whether AAL2 is required.
    await refreshAAL();
    return null;
  }

  async function signOut() {
    // SECURITY (H3): wipe every locally-cached user blob — AsyncStorage
    // workout caches, water counts, queued sessions, and SecureStore
    // sensitive caches — so the next account that signs in on this
    // device can NEVER see the previous user's data.
    await supabase.auth.signOut();
    await clearLocalUserData();
    setMfaRequired(false);
    setInPasswordRecovery(false);
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        mfaRequired,
        inPasswordRecovery,
        setPasswordRecovery,
        clearPasswordRecovery,
        signUp,
        signIn,
        signOut,
        refreshAAL,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
