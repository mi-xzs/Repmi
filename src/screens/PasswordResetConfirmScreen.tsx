import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { colors } from '../theme/colors';
import { useAccent } from '../services/SettingsContext';
import {
  validatePassword,
  checkPasswordBreached,
  PASSWORD_RULE_LABELS,
  PasswordRules,
} from '../services/passwordPolicy';
import {
  preventScreenCaptureAsync,
  allowScreenCaptureAsync,
} from 'expo-screen-capture';
import { mapAuthError } from '../services/errorMessages';
import { logError } from '../services/logger';
import { logAuditEvent } from '../services/profileService';
import { useAuth } from '../services/AuthContext';
import { Skeleton } from '../components/ui/Skeleton';

export default function PasswordResetConfirmScreen({ navigation, route }: any) {
  const { accent } = useAccent();
  const {
    setPasswordRecovery,
    clearPasswordRecovery,
    signOut,
    session,
    inPasswordRecovery,
  } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useFocusEffect(
    useCallback(() => {
      preventScreenCaptureAsync().catch(() => {});
      return () => { allowScreenCaptureAsync().catch(() => {}); };
    }, []),
  );

  useEffect(() => {
    const accessToken: string | undefined = route.params?.access_token;
    const refreshToken: string | undefined = route.params?.refresh_token;
    if (accessToken && refreshToken) {
      setPasswordRecovery();
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error: err }) => {
          if (err) {
            setError('Reset link is invalid or expired. Request a new one.');
          } else {
            setSessionReady(true);
          }
        });
      return;
    }
    if (inPasswordRecovery && session) {
      setSessionReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSessionReady(!!data.session);
      if (!data.session) {
        setError('Reset link is invalid or expired. Request a new one.');
      }
    });
  }, [route.params, inPasswordRecovery, session]);

  const { rules, isValid } = validatePassword(password);

  async function handleConfirm() {
    if (!sessionReady) return;
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!isValid) {
      setError('Password does not meet the requirements.');
      return;
    }
    setLoading(true);
    setError('');

    const breach = await checkPasswordBreached(password);
    if (breach.status === 'breached') {
      setLoading(false);
      setError('This password has appeared in a known data breach. Please choose a different one.');
      return;
    }
    if (breach.status === 'unavailable') {
      logError('passwordPolicy.breachCheck.unavailable', { screen: 'passwordResetConfirm' });
    }

    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      logError('auth.passwordReset.confirm.failed', { code: (err as { code?: string }).code });
      setError(mapAuthError(err));
      return;
    }
    await logAuditEvent('password_changed', null, { via: 'reset_link' });
    clearPasswordRecovery();
    await signOut().catch(() => {});
    try {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch {
    }
  }

  if (!sessionReady && !error) {
    return (
      <View style={s.container}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <Skeleton width="60%" height={32} radius={6} style={{ marginBottom: 10 }} />
          <Skeleton width="85%" height={16} radius={4} style={{ marginBottom: 32 }} />
          <Skeleton height={50} radius={12} style={{ marginBottom: 12 }} />
          <Skeleton height={50} radius={12} style={{ marginBottom: 12 }} />
          <Skeleton height={50} radius={12} style={{ marginTop: 4 }} />
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <Text style={[s.title, { color: accent }]}>New password</Text>
        <Text style={s.subtitle}>Choose a strong password to finish the reset.</Text>

        <TextInput
          style={s.input}
          placeholder="New password"
          placeholderTextColor={colors.button1}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        {password.length > 0 ? <Checklist rules={rules} accent={accent} /> : null}
        <TextInput
          style={s.input}
          placeholder="Confirm new password"
          placeholderTextColor={colors.button1}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
        />

        {error ? <Text style={s.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[
            s.button,
            { backgroundColor: accent },
            (loading || !sessionReady || !isValid) && { opacity: 0.5 },
          ]}
          onPress={handleConfirm}
          disabled={loading || !sessionReady || !isValid}
        >
          {loading
            ? <ActivityIndicator color={colors.background} />
            : <Text style={s.buttonText}>Set new password</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Checklist({ rules, accent }: { rules: PasswordRules; accent: string }) {
  const keys: (keyof PasswordRules)[] = ['minLength', 'hasUppercase', 'hasDigit', 'hasSymbol'];
  return (
    <View style={s.checklist}>
      {keys.map(k => {
        const ok = rules[k];
        return (
          <View key={k} style={s.checkRow}>
            <Feather name={ok ? 'check' : 'x'} size={12} color={ok ? accent : colors.button2} />
            <Text style={[s.checkText, { color: ok ? accent : colors.button1 }]}>
              {PASSWORD_RULE_LABELS[k]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 28 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 15, color: colors.button1, marginBottom: 32 },
  input: {
    backgroundColor: colors.container,
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  error: { color: '#FF6B6B', fontSize: 13, marginBottom: 10 },
  button: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  buttonText: { color: colors.background, fontWeight: '700', fontSize: 16 },
  checklist: { marginTop: -4, marginBottom: 12, paddingHorizontal: 4, gap: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkText: { fontSize: 12, fontWeight: '500' },
});
