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
import { useAuth } from '../services/AuthContext';
import { colors } from '../theme/colors';
import { useAccent } from '../services/SettingsContext';

export default function SignUpScreen({ navigation }: any) {
  const { signUp } = useAuth();
  const { accent } = useAccent();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSignUp() {
    if (!email || !password || !confirm) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setLoading(true);
    const err = await signUp(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { color: accent }]}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a confirmation link to {email}.{'\n'}Click it to activate your account.
        </Text>
        <TouchableOpacity style={[styles.button, { backgroundColor: accent }]} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.buttonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={[styles.title, { color: accent }]}>Create account</Text>
      <Text style={styles.subtitle}>Start tracking your gains</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.button1}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={colors.button1}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm password"
        placeholderTextColor={colors.button1}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={[styles.button, { backgroundColor: accent }]} onPress={handleSignUp} disabled={loading}>
        {loading
          ? <ActivityIndicator color={colors.background} />
          : <Text style={styles.buttonText}>Sign Up</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? <Text style={[styles.linkAccent, { color: accent }]}>Log in</Text></Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    paddingHorizontal: 28,
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
