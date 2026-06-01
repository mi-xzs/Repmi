import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { clearLocalUserData } from './clearLocalUserData';
import { mapAuthError } from './errorMessages';
import { logError } from './logger';

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  // H2 — true when the user has a valid Supabase session at AAL1 but
  // has TOTP enrolled and must verify a code before reaching AAL2.
  mfaRequired: boolean;
  signUp: (email: string, password: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshAAL: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);

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

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) refreshAAL();
      else setMfaRequired(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signUp(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signUp({ email, password });
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
  }

  return (
    <AuthContext.Provider
      value={{ session, isLoading, mfaRequired, signUp, signIn, signOut, refreshAAL }}
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
