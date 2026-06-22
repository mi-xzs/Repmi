import { useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useAuth } from './AuthContext';

export const DEMO_EMAIL = process.env.EXPO_PUBLIC_DEMO_EMAIL ?? '';
export const DEMO_PASSWORD = process.env.EXPO_PUBLIC_DEMO_PASSWORD ?? '';

export const DEMO_ENABLED = DEMO_EMAIL.length > 0 && DEMO_PASSWORD.length > 0;

export function useIsDemo(): boolean {
  const { session } = useAuth();
  if (!DEMO_EMAIL) return false;
  const email = session?.user?.email?.toLowerCase();
  return !!email && email === DEMO_EMAIL.toLowerCase();
}

export function useDemoGuard() {
  const isDemo = useIsDemo();
  return useCallback(
    (actionLabel?: string): boolean => {
      if (!isDemo) return true;
      const message = `${
        actionLabel ?? 'This action'
      } is disabled in the demo account so it stays usable for everyone. Sign up for free to try it yourself.`;
      if (Platform.OS === 'web') {
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
