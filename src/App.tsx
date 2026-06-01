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

/**
 * H2 — Biometric foreground gate.
 *
 * When the user has enabled "Unlock with Face ID / fingerprint" in
 * Settings, the AppState handler below prompts on every transition
 * back to `active`. The biometric prompt is a LOCAL re-auth — it does
 * not derive any key, it does not decrypt the Supabase session. The
 * session token continues to live in SecureStore independently of this
 * gate.
 *
 * If biometric authentication fails (user cancels), we sign out so a
 * lost / borrowed phone can't bypass the prompt by killing the app.
 */
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
    // Prompt once on mount if a session already exists (cold start).
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
    // Render an empty black screen while the biometric prompt is up
    // so the previously-displayed UI isn't visible behind a dismissed
    // prompt.
    return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  }
  return <>{children}</>;
}

// H2 / H7 — Deep-link routing config.
//   - `repmi://auth/reset` → PasswordResetConfirmScreen (Supabase reset email)
//   - The legacy `exp+gym-tracking-app://` prefix is included so already-issued
//     links from before the rename keep resolving. Drop after one release.
//   - `https://repmi.co.uk` is included so Universal Links / App Links route
//     the same screens once the .well-known files ship.
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
        },
      },
    },
  },
};

// Dark navigation theme so the scene background behind centered web
// layouts is the app's dark background, not React Navigation's default
// white. Without this, screens that center their content in a max-width
// column (web) show white gutters on either side.
const NAV_THEME: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
  },
};

function App() {
  // One-time setup of the Android notification channel used by the rest
  // timer.  Cheap, idempotent, no-op on iOS.
  // M1: also initialise Sentry IFF the user has previously opted in.
  // The function is a no-op when the consent flag isn't set, so this
  // is safe to call at the top of every launch.
  useEffect(() => {
    ensureRestTimerChannel();
    initSentryIfEnabled();
    // Hide scrollbars on web — scrolling still works via wheel / trackpad /
    // drag, it's just the visible bar that's removed for an app-like look.
    if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('hide-scrollbars')) {
      const style = document.createElement('style');
      style.id = 'hide-scrollbars';
      style.textContent =
        '::-webkit-scrollbar{width:0!important;height:0!important;display:none!important}' +
        '*{scrollbar-width:none!important;-ms-overflow-style:none!important}';
      document.head.appendChild(style);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={NAV_THEME} linking={LINKING}>
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

// M1 — Wrap the root with Sentry's tracing wrapper so screen
// breadcrumbs (navigation transitions, etc.) are captured when crash
// reporting is enabled. The wrapper is an identity function when
// Sentry isn't initialised, so this is always safe.
export default wrapApp(App);
