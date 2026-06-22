import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, View, Platform } from 'react-native';
import { NavigationContainer, LinkingOptions, DarkTheme, Theme } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { colors } from './theme/colors';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './services/AuthContext';
import { ProfileProvider } from './services/ProfileContext';
import { SettingsProvider } from './services/SettingsContext';
import { WorkoutProvider } from './services/WorkoutContext';
import { XPProvider } from './services/XPContext';
import { CoinProvider } from './services/CoinContext';
import RootNavigator from './navigation/RootNavigator';
import { ensureRestTimerChannel } from './services/notifications';
import ThreatGate from './security/ThreatGate';
import {
  authenticateBiometric,
  isBiometricEnabled,
} from './services/biometricService';
import {
  initSentryIfEnabled,
  wrapApp,
} from './services/observability';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.style.backgroundColor = colors.background;
  if (document.body) {
    document.body.style.backgroundColor = colors.background;
  }
}

function BiometricGate({ children }: { children: React.ReactNode }) {
  const { session, signOut } = useAuth();
  const [locked, setLocked] = useState(false);
  const wasBackground = useRef(false);

  const requireBiometric = useCallback(async () => {
    if (!session) return;
    const enabled = await isBiometricEnabled();
    if (!enabled) return;
    setLocked(true);
    const ok = await authenticateBiometric('Unlock Repmi');
    if (ok) {
      setLocked(false);
    } else {
      setLocked(false);
      await signOut();
    }
  }, [session, signOut]);

  useEffect(() => {
    requireBiometric();
  }, [requireBiometric]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'background' || s === 'inactive') {
        wasBackground.current = true;
      } else if (s === 'active' && wasBackground.current) {
        wasBackground.current = false;
        requireBiometric();
      }
    });
    return () => sub.remove();
  }, [requireBiometric]);

  if (locked) {
    return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  }
  return <>{children}</>;
}

function normaliseAuthCallbackUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.includes('/auth/reset#')) {
    return url.replace('/auth/reset#', '/auth/reset?');
  }
  if (url.includes('/auth/confirm#')) {
    return url.replace('/auth/confirm#', '/auth/confirm?');
  }
  return url;
}

const LINKING: LinkingOptions<any> = {
  prefixes: [
    Linking.createURL('/'),
    'repmi://',
    'exp+gym-tracking-app://',
    'https://repmi.co.uk',
  ],
  config: {
    screens: {
      Auth: {
        screens: {
          PasswordResetConfirm: 'auth/reset',
          EmailConfirm: 'auth/confirm',
        },
      },
    },
  },
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    return normaliseAuthCallbackUrl(url);
  },
  subscribe(listener) {
    const sub = Linking.addEventListener('url', ({ url }) => {
      const normalised = normaliseAuthCallbackUrl(url);
      if (normalised) listener(normalised);
    });
    return () => sub.remove();
  },
};

const NAV_THEME: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
  },
};

function App() {
  useEffect(() => {
    ensureRestTimerChannel();
    initSentryIfEnabled();
    if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('hide-scrollbars')) {
      const style = document.createElement('style');
      style.id = 'hide-scrollbars';
      style.textContent =
        '::-webkit-scrollbar{width:0!important;height:0!important;display:none!important}' +
        '*{scrollbar-width:none!important;-ms-overflow-style:none!important}';
      document.head.appendChild(style);
    }

    if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('repmi-mobile-theme')) {
      const marker = document.createElement('meta');
      marker.id = 'repmi-mobile-theme';
      marker.name = 'repmi-mobile-theme';
      marker.content = '1';
      document.head.appendChild(marker);

      const ensureMeta = (name: string, content: string) => {
        let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
        if (!el) {
          el = document.createElement('meta');
          el.name = name;
          document.head.appendChild(el);
        }
        el.content = content;
      };
      ensureMeta('theme-color', colors.background);
      ensureMeta('apple-mobile-web-app-capable', 'yes');
      ensureMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');
      ensureMeta('mobile-web-app-capable', 'yes');
      ensureMeta(
        'viewport',
        'width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover',
      );
      document.documentElement.style.backgroundColor = colors.background;
      document.body.style.backgroundColor = colors.background;
    }
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer
        theme={NAV_THEME}
        linking={LINKING}
        documentTitle={{
          formatter: (options, route) => {
            const screen = options?.title ?? route?.name;
            return screen ? `${screen} · Repmi` : 'Repmi';
          },
        }}
      >
        <ThreatGate>
          <AuthProvider>
            <BiometricGate>
              <ProfileProvider>
                <SettingsProvider>
                  <WorkoutProvider>
                    <XPProvider>
                      <CoinProvider>
                        <RootNavigator />
                      </CoinProvider>
                    </XPProvider>
                  </WorkoutProvider>
                </SettingsProvider>
              </ProfileProvider>
            </BiometricGate>
          </AuthProvider>
        </ThreatGate>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default wrapApp(App);
