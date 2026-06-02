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
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../services/AuthContext';
import { colors } from '../theme/colors';
import { useAccent } from '../services/SettingsContext';
import {
  validatePassword,
  checkPasswordBreached,
  PASSWORD_RULE_LABELS,
  PasswordRules,
} from '../services/passwordPolicy';
import { logError } from '../services/logger';

// The "Confirm email" link in the signup welcome email points here. MUST
// be in Supabase Dashboard → Auth → URL Configuration → Redirect URLs,
// otherwise Supabase silently falls back to the Site URL and strips the
// tokens. Native uses Universal Links (iOS) / App Links (Android) — both
// route this https URL to the app when installed, and fall back to the
// web flow when not.
const EMAIL_CONFIRM_URL = 'https://repmi.co.uk/auth/confirm';

export default function SignUpScreen({ navigation }: any) {
  const { signUp } = useAuth();
  const { accent } = useAccent();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  // SECURITY / COMPLIANCE: minimum age gate. The app collects body
  // metrics (weight, height, training data) which most jurisdictions
  // treat as health-adjacent personal data, so we require an attested
  // age of 16+ before signup is enabled. The submit button stays
  // disabled until the checkbox is checked; we re-validate in the
  // handler as a defence-in-depth measure.
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  // H1: live per-rule validation so the checklist updates as the user types.
  const { rules: passwordRules, isValid: passwordValid } = validatePassword(password);

  async function handleSignUp() {
    if (!ageConfirmed) {
      setError('You must confirm you are at least 16 years old to create an account.');
      return;
    }
    if (!email || !password || !confirm) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!passwordValid) {
      // The live checklist is the primary affordance; this is a
      // defence-in-depth guard for the submit handler.
      setError('Password does not meet the requirements below.');
      return;
    }
    setError('');
    setLoading(true);

    // A7 / M5 — block known-breached passwords. Fails open (proceeds) if
    // HIBP is unreachable so an outage can't stop all signups.
    const breach = await checkPasswordBreached(password);
    if (breach.status === 'breached') {
      setLoading(false);
      setError('This password has appeared in a known data breach. Please choose a different one.');
      return;
    }
    if (breach.status === 'unavailable') {
      logError('passwordPolicy.breachCheck.unavailable', { screen: 'signup' });
    }

    const err = await signUp(email.trim(), password, EMAIL_CONFIRM_URL);
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

  const submitDisabled = loading || !ageConfirmed || !passwordValid;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={[styles.title, { color: accent }]}>Create account</Text>
      <Text style={styles.subtitle}>Start tracking your gains</Text>

      {/* Age gate — must be acknowledged BEFORE the email/password fields
          per spec, so users see the requirement up front rather than
          discovering it after typing credentials. */}
      <TouchableOpacity
        style={styles.checkboxRow}
        activeOpacity={0.7}
        onPress={() => setAgeConfirmed(v => !v)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: ageConfirmed }}
      >
        <View
          style={[
            styles.checkbox,
            ageConfirmed && { backgroundColor: accent, borderColor: accent },
          ]}
        >
          {ageConfirmed ? (
            <Feather name="check" size={14} color={colors.background} />
          ) : null}
        </View>
        <Text style={styles.checkboxLabel}>I am at least 16 years old</Text>
      </TouchableOpacity>

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
      {/* H1: live password-rule checklist. Renders once the user starts
          typing so it doesn't clutter the empty state. */}
      {password.length > 0 ? (
        <PasswordChecklist rules={passwordRules} accent={accent} />
      ) : null}
      <TextInput
        style={styles.input}
        placeholder="Confirm password"
        placeholderTextColor={colors.button1}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: accent },
          submitDisabled && styles.buttonDisabled,
        ]}
        onPress={handleSignUp}
        disabled={submitDisabled}
      >
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

// H1 — per-rule checklist. Each row is a check/x glyph + label; passes are
// rendered in the accent colour, fails in muted grey. Live updates as the
// user types via the parent's validatePassword() output.
function PasswordChecklist({
  rules,
  accent,
}: {
  rules: PasswordRules;
  accent: string;
}) {
  const keys: (keyof PasswordRules)[] = [
    'minLength',
    'hasUppercase',
    'hasDigit',
    'hasSymbol',
  ];
  return (
    <View style={styles.checklist}>
      {keys.map(k => {
        const ok = rules[k];
        return (
          <View key={k} style={styles.checklistRow}>
            <Feather
              name={ok ? 'check' : 'x'}
              size={12}
              color={ok ? accent : colors.button2}
            />
            <Text
              style={[
                styles.checklistText,
                { color: ok ? accent : colors.button1 },
              ]}
            >
              {PASSWORD_RULE_LABELS[k]}
            </Text>
          </View>
        );
      })}
    </View>
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
  buttonDisabled: {
    opacity: 0.5,
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.button1,
    backgroundColor: colors.container,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxLabel: {
    color: '#fff',
    fontSize: 14,
    flexShrink: 1,
  },
  checklist: {
    marginTop: -4,
    marginBottom: 12,
    paddingHorizontal: 4,
    gap: 4,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checklistText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
