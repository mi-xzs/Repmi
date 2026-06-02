// src/screens/EmailConfirmScreen.tsx
//
// Landing screen for the signup-confirmation deep link. The user clicks
// the "Confirm email" button in their welcome email; that link routes
// here via:
//   - WEB  → `https://repmi.co.uk/auth/confirm#access_token=…&type=signup`
//            Supabase's detectSessionInUrl auto-creates the session before
//            this screen even mounts, so by the time we render, RootNavigator
//            has already routed to Main and we never appear on-screen.
//   - NATIVE → `https://repmi.co.uk/auth/confirm?access_token=…` (after the
//              LINKING config's hash→query transform in App.tsx). The screen
//              reads the tokens from route.params and calls setSession()
//              explicitly. Once SIGNED_IN fires, RootNavigator switches to
//              Main and unmounts us.
//
// In both cases the screen is a brief skeleton-only stopover. The success
// signal is the navigator transition, not a visible "welcome" message —
// that gets handled by Onboarding or the main app shell.

import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../services/supabase';
import { colors } from '../theme/colors';
import { useAccent } from '../services/SettingsContext';
import { useAuth } from '../services/AuthContext';
import { Skeleton } from '../components/ui/Skeleton';

export default function EmailConfirmScreen({ navigation, route }: any) {
  const { accent } = useAccent();
  const { session } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    // Web: detectSessionInUrl already created the session before we
    // mounted. Nothing to do — RootNavigator will route to Main on the
    // next render.
    if (session) return;

    const accessToken: string | undefined = route.params?.access_token;
    const refreshToken: string | undefined = route.params?.refresh_token;

    if (accessToken && refreshToken) {
      // Native: tokens were transformed from hash to query params by the
      // LINKING normaliser, so they show up in route.params here.
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error: err }) => {
          if (err) {
            setError('Confirmation link is invalid or expired. Request a new one from the sign-up screen.');
          }
          // On success: no-op — AuthContext picks up the session via
          // onAuthStateChange and RootNavigator switches to Main.
        });
      return;
    }

    // No session and no tokens — the user either hit a stale link or
    // navigated here directly. Surface the same generic error.
    setError('Confirmation link is invalid or expired. Request a new one from the sign-up screen.');
  }, [route.params, session]);

  if (error) {
    return (
      <View style={s.container}>
        <Text style={[s.title, { color: accent }]}>Couldn't confirm</Text>
        <Text style={s.subtitle}>{error}</Text>
        <TouchableOpacity
          style={[s.button, { backgroundColor: accent }]}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
        >
          <Text style={s.buttonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Skeleton stop-over while setSession() resolves (or while we wait for
  // the navigator to swap to Main on web).
  return (
    <View style={s.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <Skeleton width="65%" height={32} radius={6} style={{ marginBottom: 10 }} />
        <Skeleton width="85%" height={16} radius={4} style={{ marginBottom: 32 }} />
        <Skeleton height={50} radius={12} style={{ marginBottom: 12 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 15, color: colors.button1, marginBottom: 32, lineHeight: 22 },
  button: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonText: { color: colors.background, fontWeight: '700', fontSize: 16 },
});
