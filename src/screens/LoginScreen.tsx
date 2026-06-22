import React, { useEffect, useRef, useState } from 'react';
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
import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_ENABLED } from '../services/demoMode';
import {
  clearThrottle,
  formatLockout,
  getLockoutSecondsRemaining,
  recordFailedAttempt,
} from '../services/loginThrottle';

export default function LoginScreen({ navigation }: any) {
  const { signIn } = useAuth();
  const { accent } = useAccent();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const lastCheckedEmailRef = useRef('');

  useEffect(() => {
    const trimmed = email.trim().toLowerCase();
    lastCheckedEmailRef.current = trimmed;
    if (!trimmed) {
      setLockoutSeconds(0);
      return;
    }
    let cancelled = false;
    getLockoutSecondsRemaining(trimmed).then(secs => {
      if (cancelled || lastCheckedEmailRef.current !== trimmed) return;
      setLockoutSeconds(secs);
    });
    return () => {
      cancelled = true;
    };
  }, [email]);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const handle = setInterval(() => {
      setLockoutSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(handle);
  }, [lockoutSeconds > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogin() {
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    const trimmedEmail = email.trim();
    const remaining = await getLockoutSecondsRemaining(trimmedEmail);
    if (remaining > 0) {
      setLockoutSeconds(remaining);
      setError(`Too many attempts. Try again in ${formatLockout(remaining)}.`);
      return;
    }
    setError('');
    setLoading(true);
    const err = await signIn(trimmedEmail, password);
    setLoading(false);
    if (err) {
      const { lockoutSeconds: lock } = await recordFailedAttempt(trimmedEmail);
      if (lock > 0) {
        setLockoutSeconds(lock);
        setError(`Too many attempts. Try again in ${formatLockout(lock)}.`);
      } else {
        setError(err);
      }
    } else {
      await clearThrottle(trimmedEmail);
    }
  }

  async function handleDemoLogin() {
    setError('');
    setLoading(true);
    const err = await signIn(DEMO_EMAIL.trim(), DEMO_PASSWORD);
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

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: accent },
          (loading || lockoutSeconds > 0) && styles.buttonDisabled,
        ]}
        onPress={handleLogin}
        disabled={loading || lockoutSeconds > 0}
      >
        {loading ? (
          <ActivityIndicator color={colors.background} />
        ) : lockoutSeconds > 0 ? (
          <Text style={styles.buttonText}>
            Try again in {formatLockout(lockoutSeconds)}
          </Text>
        ) : (
          <Text style={styles.buttonText}>Log In</Text>
        )}
      </TouchableOpacity>

      {DEMO_ENABLED && (
        <>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>
          <TouchableOpacity
            style={[styles.demoButton, { borderColor: accent }]}
            onPress={handleDemoLogin}
            disabled={loading}
          >
            <Text style={[styles.demoButtonText, { color: accent }]}>
              Try the demo →
            </Text>
          </TouchableOpacity>
        </>
      )}

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
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 16,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dividerText: {
    color: colors.button1,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  demoButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  demoButtonText: {
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
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
