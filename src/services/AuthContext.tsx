import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { clearLocalUserData } from './clearLocalUserData';
import { mapAuthError } from './errorMessages';
import { logError } from './logger';

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
  mfaRequired: boolean;
  inPasswordRecovery: boolean;
  setPasswordRecovery: () => void;
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
  const [inPasswordRecovery, setInPasswordRecovery] = useState<boolean>(
    () => detectRecoveryFromUrl(),
  );

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
      options: emailRedirectTo ? { emailRedirectTo } : undefined,
    });
    if (error) {
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
    await refreshAAL();
    return null;
  }

  async function signOut() {
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
