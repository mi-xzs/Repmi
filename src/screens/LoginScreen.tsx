import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useAuth } from '../services/AuthContext';
import { colors } from '../theme/colors';
import { useAccent } from '../services/SettingsContext';

export default function LoginScreen({ navigation }: any) {
  const { signIn } = useAuth();
  const { accent } = useAccent();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // M6 — login is explicit-tap only. The previous auto-submit useEffect
  // (fired when password-manager autofill populated both fields) was
  // removed: it caused surprise logins on autofill and made failed-attempt
  // throttling harder to reason about. The user must press "Log In".

  async function handleLogin() {
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    const err = await signIn(email.trim(), password);
    setLoading(false);
    if (err) setError(err);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      automaticallyAdjustKeyboardInsets
    >
      <View style={styles.formCol}>
      <Text style={[styles.title, { color: accent }]}>Welcome back</Text>
      <Text style={styles.subtitle}>Log in to your account</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.button1}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.button1}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={[styles.button, { backgroundColor: accent }]} onPress={handleLogin} disabled={loading}>
        {loading
          ? <ActivityIndicator color={colors.background} />
          : <Text style={styles.buttonText}>Log In</Text>
        }
      </TouchableOpacity>

      {/* H2 — Forgot password? Routes to PasswordResetScreen which calls
          supabase.auth.resetPasswordForEmail with a `repmi://auth/reset`
          redirect, then on tap returns the user to PasswordResetConfirmScreen. */}
      <TouchableOpacity onPress={() => navigation.navigate('PasswordReset')}>
        <Text style={[styles.link, { marginBottom: 12 }]}>
          <Text style={[styles.linkAccent, { color: accent }]}>Forgot password?</Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
        <Text style={styles.link}>Don't have an account? <Text style={[styles.linkAccent, { color: accent }]}>Sign up</Text></Text>
      </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    backgroundColor: colors.background,
  },
  // Centered, max-width form column so the login form sits in a tidy
  // card-width block on wide web viewports instead of stretching across
  // the whole screen. On mobile the maxWidth is wider than the viewport,
  // so it's effectively full-width.
  formCol: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: colors.button1,
    marginBottom: 32,
  },
  input: {
    backgroundColor: colors.container,
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  error: {
    color: '#FF6B6B',
    fontSize: 13,
    marginBottom: 10,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  buttonText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
  link: {
    color: colors.button1,
    textAlign: 'center',
    fontSize: 14,
  },
  linkAccent: {
    fontWeight: '600',
  },
});
