import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '../services/supabase';

const PRODUCTION_RESET_URL = 'https://repmi.co.uk/auth/reset';
import { colors } from '../theme/colors';
import { useAccent } from '../services/SettingsContext';
import { mapAuthError } from '../services/errorMessages';
import { logError } from '../services/logger';

export default function PasswordResetScreen({ navigation }: any) {
  const { accent } = useAccent();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!email.trim()) {
      setError('Please enter your account email.');
      return;
    }
    setLoading(true);
    setError('');
    const redirectTo = PRODUCTION_RESET_URL;
    const { error: err } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo },
    );
    setLoading(false);
    if (err) {
      logError('auth.passwordReset.send.failed', { code: (err as { code?: string }).code });
      setError(mapAuthError(err));
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <View style={s.container}>
        <Text style={[s.title, { color: accent }]}>Check your email</Text>
        <Text style={s.subtitle}>
          If an account exists for {email}, we just sent a reset link.{'\n'}
          Tap the link on this device to set a new password.
        </Text>
        <TouchableOpacity
          style={[s.button, { backgroundColor: accent }]}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={s.buttonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={[s.title, { color: accent }]}>Reset password</Text>
      <Text style={s.subtitle}>
        Enter the email on your Repmi account. We'll send you a link to
        set a new password.
      </Text>

      <TextInput
        style={s.input}
        placeholder="Email"
        placeholderTextColor={colors.button1}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      {error ? <Text style={s.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[s.button, { backgroundColor: accent }, loading && { opacity: 0.5 }]}
        onPress={handleSend}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color={colors.background} />
          : <Text style={s.buttonText}>Send reset link</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={s.link}>Back to login</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
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
  link: { color: colors.button1, textAlign: 'center', fontSize: 14 },
});
