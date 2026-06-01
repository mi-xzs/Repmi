// src/screens/MFAChallengeScreen.tsx
//
// H2 — TOTP challenge after sign-in.
//
// Reached when `signInWithPassword` succeeds but
// `getAuthenticatorAssuranceLevel()` reports `currentLevel=aal1,
// nextLevel=aal2` — i.e. the user has at least one verified TOTP
// factor enrolled and must satisfy it before the session is fully
// trusted.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { colors } from '../theme/colors';
import { useAccent } from '../services/SettingsContext';
import {
  preventScreenCaptureAsync,
  allowScreenCaptureAsync,
} from 'expo-screen-capture';
import { mapAuthError } from '../services/errorMessages';
import { logError } from '../services/logger';

export default function MFAChallengeScreen() {
  const navigation = useNavigation<any>();
  const { accent } = useAccent();
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => {
    preventScreenCaptureAsync().catch(() => {});
    return () => { allowScreenCaptureAsync().catch(() => {}); };
  }, []));

  useEffect(() => {
    // Pick the first verified TOTP factor — that's the one the user
    // can already satisfy. Unverified factors (enrolment-in-progress)
    // shouldn't gate sign-in.
    supabase.auth.mfa.listFactors().then(({ data, error: err }) => {
      if (err) {
        logError('mfa.list.failed', { code: (err as { code?: string }).code });
        setError(mapAuthError(err));
        return;
      }
      const totp = (data?.totp ?? []).find(f => f.status === 'verified');
      if (!totp) {
        // No verified TOTP factor — bail to the app.
        navigation.goBack();
        return;
      }
      setFactorId(totp.id);
    });
  }, [navigation]);

  async function handleSubmit() {
    if (!factorId) return;
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (chErr || !ch?.id) {
        logError('mfa.challenge.failed', { code: (chErr as { code?: string } | null)?.code });
        setError(mapAuthError(chErr));
        return;
      }
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: ch.id,
        code,
      });
      if (vErr) {
        logError('mfa.verify.failed', { code: (vErr as { code?: string }).code });
        setError(mapAuthError(vErr));
        return;
      }
      // On success the session is now AAL2; auth-state listener will
      // re-render the app stack. Pop this screen from the auth nav.
      navigation.goBack();
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <View style={s.container}>
      <Text style={[s.title, { color: accent }]}>Enter 2FA code</Text>
      <Text style={s.subtitle}>
        Open your authenticator app and enter the current 6-digit code for
        your Repmi account.
      </Text>

      <TextInput
        style={s.input}
        placeholder="123456"
        placeholderTextColor={colors.button1}
        value={code}
        onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
      />

      {error ? <Text style={s.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[s.button, { backgroundColor: accent }, busy && { opacity: 0.5 }]}
        onPress={handleSubmit}
        disabled={busy}
      >
        {busy
          ? <ActivityIndicator color={colors.background} />
          : <Text style={s.buttonText}>Verify</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleSignOut}>
        <Text style={s.link}>Cancel & sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 28,
    paddingTop: 80,
  },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.button1, marginBottom: 32, lineHeight: 20 },
  input: {
    backgroundColor: colors.container,
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: 12,
  },
  error: { color: '#FF6B6B', fontSize: 13, marginBottom: 10 },
  button: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  buttonText: { color: colors.background, fontWeight: '700', fontSize: 16 },
  link: { color: colors.button1, textAlign: 'center', fontSize: 14 },
});
