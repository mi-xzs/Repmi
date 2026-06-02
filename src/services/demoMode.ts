// src/services/demoMode.ts
//
// Demo-mode plumbing: a single read-only demo Supabase account that any
// visitor can "log in as" without signing up. Used to let recruiters /
// portfolio reviewers see the app fully populated with real-looking data
// without committing to a real signup.
//
// Credentials are sourced from EXPO_PUBLIC_ env vars so they aren't
// committed to the repo. The DEMO_EMAIL constant is also used by the
// useIsDemo() hook to recognise the current session as the demo account
// and gate destructive actions.

import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useAuth } from './AuthContext';

export const DEMO_EMAIL = process.env.EXPO_PUBLIC_DEMO_EMAIL ?? '';
export const DEMO_PASSWORD = process.env.EXPO_PUBLIC_DEMO_PASSWORD ?? '';

// True if demo credentials are configured at build time. Hides the demo
// button automatically in environments where it shouldn't appear.
export const DEMO_ENABLED = DEMO_EMAIL.length > 0 && DEMO_PASSWORD.length > 0;

/**
 * Returns true when the current signed-in session belongs to the demo
 * account. Use this to disable destructive actions (delete workout,
 * delete account, change settings that persist, etc.) when running in
 * demo mode so multiple recruiters can share the same account safely.
 */
export function useIsDemo(): boolean {
  const { session } = useAuth();
  if (!DEMO_EMAIL) return false;
  const email = session?.user?.email?.toLowerCase();
  return !!email && email === DEMO_EMAIL.toLowerCase();
}

/**
 * Returns a guard function — call it from any destructive handler.
 *   const guard = useDemoGuard();
 *   if (!guard('Delete workout')) return;   // blocked in demo mode
 * In demo mode it shows an Alert + returns false. Otherwise returns true.
 */
export function useDemoGuard() {
  const isDemo = useIsDemo();
  return useCallback(
    (actionLabel?: string): boolean => {
      if (!isDemo) return true;
      const message = `${
        actionLabel ?? 'This action'
      } is disabled in the demo account so it stays usable for everyone. Sign up for free to try it yourself.`;
      if (Platform.OS === 'web') {
        // RN's Alert is a no-op on web — use the browser dialog.
        // eslint-disable-next-line no-alert
        window.alert(`Demo mode\n\n${message}`);
      } else {
        Alert.alert('Demo mode', message, [{ text: 'OK' }]);
      }
      return false;
    },
    [isDemo],
  );
}
