import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '../services/supabase';
import { colors } from '../theme/colors';
import { useAccent } from '../services/SettingsContext';
import {
  preventScreenCaptureAsync,
  allowScreenCaptureAsync,
} from 'expo-screen-capture';
import { mapAuthError } from '../services/errorMessages';
import { logError } from '../services/logger';
import { logAuditEvent } from '../services/profileService';

export default function MFAEnrollScreen() {
  const navigation = useNavigation<any>();
  const { accent } = useAccent();

  const [factorId, setFactorId] = useState<string | null>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [enrolling, setEnrolling] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(useCallback(() => {
    preventScreenCaptureAsync().catch(() => {});
    return () => { allowScreenCaptureAsync().catch(() => {}); };
  }, []));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: err } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
        });
        if (cancelled) return;
        if (err) {
          logError('mfa.enroll.failed', { code: (err as { code?: string }).code });
          setError(mapAuthError(err));
          return;
        }
        const totp = (data as { totp?: { uri?: string; secret?: string }; id: string }).totp;
        setFactorId(data.id);
        setUri(totp?.uri ?? null);
        setSecret(totp?.secret ?? null);
      } catch (e) {
        if (!cancelled) {
          logError('mfa.enroll.exception', { name: (e as Error)?.name });
          setError(mapAuthError(e));
        }
      } finally {
        if (!cancelled) setEnrolling(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleVerify() {
    if (!factorId) return;
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setVerifying(true);
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
      logAuditEvent('mfa_enrolled', null, { factorType: 'totp' });
      Alert.alert('Two-factor authentication enabled', 'You\'ll be asked for a code on your next sign-in.');
      navigation.goBack();
    } finally {
      setVerifying(false);
    }
  }

  if (enrolling) {
    return (
      <View style={[s.container, { justifyContent: 'center' }]}>
        <ActivityIndicator color={accent} />
      </View>
    );
  }

  if (!uri || !factorId) {
    return (
      <View style={[s.container, { justifyContent: 'center', paddingHorizontal: 28 }]}>
        <Text style={s.title}>Enrolment failed</Text>
        <Text style={s.subtitle}>{error || 'No TOTP URI returned.'}</Text>
        <TouchableOpacity
          style={[s.button, { backgroundColor: accent }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={s.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Text style={[s.title, { color: accent }]}>Enable 2FA</Text>
      <Text style={s.subtitle}>
        Scan this QR with your authenticator app (Google Authenticator,
        1Password, Authy, etc.), then type the 6-digit code below.
      </Text>

      <View style={s.qrWrap}>
        <QRCode value={uri} size={200} backgroundColor="#fff" color="#000" />
      </View>

      {secret ? (
        <Text style={s.secret}>
          Can't scan? Enter this secret manually: <Text style={{ fontWeight: '700', color: colors.highlight }}>{secret}</Text>
        </Text>
      ) : null}

      <TextInput
        style={s.input}
        placeholder="123456"
        placeholderTextColor={colors.button1}
        value={code}
        onChangeText={t => setCode(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
      />

      {error ? <Text style={s.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[s.button, { backgroundColor: accent }, verifying && { opacity: 0.5 }]}
        onPress={handleVerify}
        disabled={verifying}
      >
        {verifying
          ? <ActivityIndicator color={colors.background} />
          : <Text style={s.buttonText}>Verify & enable</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={s.link}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    padding: 24,
    paddingTop: 60,
    flexGrow: 1,
  },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 6, color: colors.highlight },
  subtitle: { fontSize: 14, color: colors.button1, marginBottom: 24, lineHeight: 20 },
  qrWrap: {
    alignSelf: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 16,
  },
  secret: {
    color: colors.button1,
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
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
