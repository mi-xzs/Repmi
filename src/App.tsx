import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, View, Modal, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
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
  getCrashReportingConsentDecision,
  setCrashReportingConsentDecision,
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

// M1 — One-time crash-reporting consent modal. Shown the first time a
// signed-in user reaches the app shell after Sentry is wired up. Stores
// the choice in SecureStore so it's never asked again unless the user
// re-enables prompting (we don't currently expose that surface — they
// can toggle in Settings → Privacy).
function CrashReportingConsentGate({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      const decision = await getCrashReportingConsentDecision();
      if (!cancelled && decision === null) setVisible(true);
    })();
    return () => { cancelled = true; };
  }, [session]);

  const choose = useCallback(async (decision: 'yes' | 'not_now' | 'never') => {
    setVisible(false);
    await setCrashReportingConsentDecision(decision);
  }, []);

  return (
    <>
      {children}
      <Modal
        animationType="fade"
        transparent
        visible={visible}
        onRequestClose={() => choose('not_now')}
      >
        <View style={consentStyles.backdrop}>
          <View style={consentStyles.card}>
            <Text style={consentStyles.title}>Help improve Repmi?</Text>
            <Text style={consentStyles.body}>
              Send anonymised crash reports so we can find and fix bugs.
              We never include your email, workouts, or any personal data.
              You can change this any time in Settings → Privacy.
            </Text>
            <TouchableOpacity style={consentStyles.primaryBtn} onPress={() => choose('yes')}>
              <Text style={consentStyles.primaryText}>Yes, send crash reports</Text>
            </TouchableOpacity>
            <TouchableOpacity style={consentStyles.secondaryBtn} onPress={() => choose('not_now')}>
              <Text style={consentStyles.secondaryText}>Not now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={consentStyles.secondaryBtn} onPress={() => choose('never')}>
              <Text style={consentStyles.secondaryText}>Never</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const consentStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#171717',
    borderRadius: 16,
    padding: 24,
    gap: 12,
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  body: { color: '#bbb', fontSize: 14, lineHeight: 20, marginBottom: 8 },
  primaryBtn: {
    backgroundColor: '#00FA9A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: { color: '#000', fontWeight: '700' },
  secondaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: { color: '#888' },
});

function App() {
  // One-time setup of the Android notification channel used by the rest
  // timer.  Cheap, idempotent, no-op on iOS.
  // M1: also initialise Sentry IFF the user has previously opted in.
  // The function is a no-op when the consent flag isn't set, so this
  // is safe to call at the top of every launch.
  useEffect(() => {
    ensureRestTimerChannel();
    initSentryIfEnabled();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer linking={LINKING}>
        <ThreatGate>
          <AuthProvider>
            <BiometricGate>
              <CrashReportingConsentGate>
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
              </CrashReportingConsentGate>
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
