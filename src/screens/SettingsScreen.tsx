import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect , useNavigation } from '@react-navigation/native';
import {
  preventScreenCaptureAsync,
  allowScreenCaptureAsync,
} from 'expo-screen-capture';
import { supabase } from '../services/supabase';
import {
  isBiometricAvailable,
  isBiometricEnabled,
  setBiometricEnabled,
  authenticateBiometric,
} from '../services/biometricService';
import {
  fetchBlockedUsers,
  unblockUser,
  BlockedUser,
} from '../services/moderationService';
import { mapAuthError, mapGenericError } from '../services/errorMessages';
import { logError } from '../services/logger';
import {
  daysUntilUsernameChangeAllowed,
  usernameChangeAvailableOn,
  logAuditEvent,
} from '../services/profileService';
import {
  isCrashReportingEnabled,
  enableCrashReporting,
  disableCrashReporting,
} from '../services/observability';
import { Feather } from '@expo/vector-icons';

import { colors } from '../theme/colors';
import { useResponsive, CONTENT_MAX_WIDTH } from '../hooks/useResponsive';
import { useAuth } from '../services/AuthContext';
import { useProfile } from '../services/ProfileContext';
import { useSettings, useAccent } from '../services/SettingsContext';
import { deleteAccount, requireReAuth } from '../services/accountService';
import { TrainingGoal } from '../types/user';

// On wide web, cap the "screen width" that drives the segmented control
// and the horizontal tab pager to the shared content column, so the whole
// screen fits the same centered max-width as the rest of the web app.
const SCREEN_W = Math.min(Dimensions.get('window').width, CONTENT_MAX_WIDTH);
const TAB_COUNT = 5;
const SEGMENT_W = (SCREEN_W - 32) / TAB_COUNT; // 16px padding each side
// Swipe gesture thresholds — mirrors AchievementsScreen so the tab
// nav grammar reads as one family across the app.
const SWIPE_VELOCITY_THRESHOLD = 0.3;
const SWIPE_DISTANCE_THRESHOLD = SCREEN_W * 0.35;

// ─── types ────────────────────────────────────────────────────────────────────

type TabId = 'account' | 'preferences' | 'customization' | 'privacy' | 'about';

const TABS: { id: TabId; label: string }[] = [
  { id: 'account',       label: 'Account' },
  { id: 'preferences',   label: 'Prefs'   },
  { id: 'customization', label: 'Custom'  },
  { id: 'privacy',       label: 'Privacy' },
  { id: 'about',         label: 'About'   },
];

const GOALS: { key: TrainingGoal; label: string; icon: string }[] = [
  { key: 'strength',    label: 'Strength',    icon: 'trending-up' },
  { key: 'hypertrophy', label: 'Hypertrophy', icon: 'layers'      },
  { key: 'endurance',   label: 'Endurance',   icon: 'activity'    },
  { key: 'weight_loss', label: 'Cut',         icon: 'zap'         },
  { key: 'general',     label: 'General',     icon: 'heart'       },
];

// ─── shared row components ────────────────────────────────────────────────────

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionBody}>{children}</View>
    </View>
  );
}

function Row({
  icon, label, value, onPress, danger, last,
  right,
}: {
  icon: string; label: string; value?: string; onPress?: () => void;
  danger?: boolean; last?: boolean; right?: React.ReactNode;
}) {
  const Inner = (
    <View style={[s.row, last && s.rowLast]}>
      <View style={[s.rowIcon, danger && s.rowIconDanger]}>
        <Feather name={icon as any} size={15} color={danger ? '#FF6B6B' : colors.button1} />
      </View>
      <Text style={[s.rowLabel, danger && s.rowLabelDanger]}>{label}</Text>
      <View style={s.rowRight}>
        {value ? <Text style={s.rowValue}>{value}</Text> : null}
        {right ?? null}
        {onPress && !right ? <Feather name="chevron-right" size={15} color={colors.button2} /> : null}
      </View>
    </View>
  );
  return onPress
    ? <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{Inner}</TouchableOpacity>
    : Inner;
}

// ─── tabs ─────────────────────────────────────────────────────────────────────

function AccountTab() {
  const { session, signOut } = useAuth();
  const { profile, updateProfile } = useProfile();
  const navigation = useNavigation<any>();
  const { accent } = useAccent();

  // H9 — prevent screenshots while the Settings screen is mounted
  // (bodyweight + height + email are all rendered here).
  useFocusEffect(useCallback(() => {
    preventScreenCaptureAsync().catch(() => {});
    return () => { allowScreenCaptureAsync().catch(() => {}); };
  }, []));

  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput,   setUsernameInput]   = useState(profile?.username ?? '');
  const [isDeleting,      setIsDeleting]      = useState(false);

  // H2 — Security state.
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled,   setBioEnabled]   = useState(false);
  const [mfaEnrolled,  setMfaEnrolled]  = useState<string | null>(null); // factor id if enrolled
  const [blocked, setBlocked] = useState<BlockedUser[] | null>(null);

  // A6 / M3 — re-auth modal state for destructive ops
  // (disable MFA, delete account).
  const [reAuth, setReAuth] = useState<
    | { kind: 'disable_mfa'; factorId: string }
    | { kind: 'delete_account'; userId: string }
    | null
  >(null);

  useEffect(() => {
    isBiometricAvailable().then(setBioAvailable);
    isBiometricEnabled().then(setBioEnabled);
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.mfa.listFactors().then(({ data }) => {
      if (cancelled) return;
      const totp = (data?.totp ?? []).find(f => f.status === 'verified');
      setMfaEnrolled(totp?.id ?? null);
    });
    fetchBlockedUsers().then(rows => {
      if (!cancelled) setBlocked(rows);
    });
    return () => { cancelled = true; };
  }, []);

  const toggleBiometric = async (next: boolean) => {
    if (next) {
      const ok = await authenticateBiometric('Confirm to enable biometric unlock');
      if (!ok) return;
      await setBiometricEnabled(true);
      setBioEnabled(true);
    } else {
      await setBiometricEnabled(false);
      setBioEnabled(false);
    }
  };

  // A6 / M3 — Disable 2FA is gated by ReAuthModal (password + biometric).
  // The actual unenroll runs in performDisableMfa after re-auth succeeds.
  const disableMfa = () => {
    if (!mfaEnrolled) return;
    setReAuth({ kind: 'disable_mfa', factorId: mfaEnrolled });
  };

  const performDisableMfa = async (factorId: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) {
      logError('mfa.unenroll.failed', { code: (error as { code?: string }).code });
      Alert.alert('Failed', mapAuthError(error));
    } else {
      setMfaEnrolled(null);
      // M8 — record the MFA-disable event in the audit log so a
      // compromised account can prove when the second factor
      // was removed.
      logAuditEvent('mfa_unenrolled', null, { factorType: 'totp' });
    }
  };

  const handleUnblock = async (id: string) => {
    try {
      await unblockUser(id);
      setBlocked(prev => (prev ?? []).filter(b => b.id !== id));
    } catch (e) {
      logError('moderation.unblock.failed', { name: (e as Error)?.name });
      Alert.alert('Unblock failed', mapGenericError(e));
    }
  };

  const saveUsername = async () => {
    const trimmed = usernameInput.trim();
    setEditingUsername(false);
    if (!trimmed || trimmed === profile?.username) return;
    // M11 — client-side check against the 30-day window. The server
    // trigger is the authoritative gate, but checking here avoids a
    // round-trip + lets us show a friendlier message.
    const remainingDays = daysUntilUsernameChangeAllowed(
      (profile as { username_changed_at?: string | null })?.username_changed_at,
    );
    if (remainingDays > 0) {
      const next = usernameChangeAvailableOn(
        (profile as { username_changed_at?: string | null })?.username_changed_at,
      );
      Alert.alert(
        'Username locked',
        next
          ? `You can change your username again on ${next.toLocaleDateString()} (${remainingDays} day${remainingDays === 1 ? '' : 's'} away).`
          : 'You changed your username recently. Try again later.',
      );
      return;
    }
    try {
      await updateProfile({ username: trimmed });
    } catch (e) {
      // M11 — server-side rate-limit fires as PostgREST exception
      // with hint 'username_change_rate_limit'. Surface generic copy.
      const msg = (e as { message?: string })?.message ?? '';
      if (/username_change_rate_limit/.test(msg)) {
        Alert.alert(
          'Username locked',
          'You can change your username again 30 days after the last change.',
        );
      } else {
        logError('profile.username.update.failed', { name: (e as Error)?.name });
        Alert.alert('Could not save', mapGenericError(e));
      }
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  // A6 / M3 — Delete account is gated by ReAuthModal (password + biometric).
  // The actual delete runs in performDeleteAccount after re-auth succeeds.
  const handleDeleteAccount = () => {
    if (isDeleting) return;
    const userId = session?.user?.id;
    if (!userId) return;
    setReAuth({ kind: 'delete_account', userId });
  };

  const performDeleteAccount = async (userId: string) => {
    setIsDeleting(true);
    try {
      await deleteAccount(userId);
      // signOut inside deleteAccount fires onAuthStateChange in
      // AuthContext, which unmounts the authed nav stack — no
      // further navigation needed here.
    } catch (e) {
      setIsDeleting(false);
      logError('account.delete.failed', { name: (e as Error)?.name });
      Alert.alert(
        'Delete failed',
        `${mapGenericError(e)}\n\nPlease try again, or email support if the problem persists.`,
      );
    }
  };

  // A6 / M3 — runs the queued destructive op after the modal verified
  // the password + biometric. Errors are surfaced inside the modal so
  // the user can retry without re-opening it.
  const handleReAuthConfirm = async (password: string) => {
    const pending = reAuth;
    if (!pending) return;
    const email = session?.user?.email;
    if (!email) throw new Error('no_email');
    const reason =
      pending.kind === 'disable_mfa'
        ? 'Confirm to disable two-factor'
        : 'Confirm to delete your account';
    await requireReAuth(email, password, reason);
    setReAuth(null);
    if (pending.kind === 'disable_mfa') {
      await performDisableMfa(pending.factorId);
    } else {
      await performDeleteAccount(pending.userId);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.tabContent} showsVerticalScrollIndicator={false}>
      <SettingsSection title="Profile">
        {editingUsername ? (
          <View style={[s.row, { gap: 8 }]}>
            <View style={s.rowIcon}>
              <Feather name="user" size={15} color={colors.button1} />
            </View>
            <TextInput
              style={[s.inlineInput, { borderBottomColor: accent }]}
              value={usernameInput}
              onChangeText={setUsernameInput}
              autoFocus
              autoCapitalize="none"
              returnKeyType="done"
              onBlur={saveUsername}
              onSubmitEditing={saveUsername}
              selectionColor={accent}
            />
            <TouchableOpacity onPress={saveUsername} style={{ padding: 4 }}>
              <Feather name="check" size={16} color={accent} />
            </TouchableOpacity>
          </View>
        ) : (
          <Row
            icon="user"
            label="Username"
            value={profile?.username ?? '—'}
            onPress={() => { setUsernameInput(profile?.username ?? ''); setEditingUsername(true); }}
          />
        )}
        <Row icon="mail"  label="Email" value={session?.user.email ?? '—'} last />
      </SettingsSection>

      <SettingsSection title="Security">
        <Row
          icon="lock"
          label="Change password"
          onPress={() => {
            Alert.alert('Change password', 'A reset link will be sent to your email.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Send link',
                onPress: async () => {
                  if (!session?.user?.email) return;
                  const { error } = await supabase.auth.resetPasswordForEmail(
                    session.user.email,
                  );
                  if (error) {
                    logError('auth.passwordReset.failed', { code: (error as { code?: string }).code });
                    Alert.alert('Failed', mapAuthError(error));
                  } else {
                    // M8 — record password-reset request in the audit log.
                    logAuditEvent('password_reset_requested', null, {});
                    Alert.alert('Sent', 'Check your inbox for the reset link.');
                  }
                },
              },
            ]);
          }}
        />
        {/* H2 — Two-factor authentication. */}
        <Row
          icon="shield"
          label={mfaEnrolled ? 'Two-factor: enabled' : 'Enable two-factor (TOTP)'}
          onPress={() => mfaEnrolled ? disableMfa() : navigation.navigate('MFAEnroll')}
        />
        {/* H2 — Biometric unlock. */}
        <Row
          icon="unlock"
          label={bioAvailable ? 'Unlock with biometrics' : 'Biometrics unavailable'}
          last
          right={bioAvailable ? (
            <Switch
              value={bioEnabled}
              onValueChange={toggleBiometric}
              trackColor={{ false: colors.button3, true: accent + '99' }}
              thumbColor={bioEnabled ? accent : colors.button1}
            />
          ) : <Text style={s.rowValue}>n/a</Text>}
        />
      </SettingsSection>

      {/* H12 — Blocked users management. Hidden when the list is empty so
          the user doesn't see an empty "Blocked users" card unnecessarily. */}
      {blocked && blocked.length > 0 ? (
        <SettingsSection title="Blocked users">
          {blocked.map((b, i) => (
            <View key={b.id} style={[s.row, i === blocked.length - 1 && s.rowLast]}>
              <View style={s.rowIcon}>
                <Feather name="user-x" size={15} color={colors.button1} />
              </View>
              <Text style={s.rowLabel} numberOfLines={1}>
                {b.username ?? 'Unknown user'}
              </Text>
              <TouchableOpacity onPress={() => handleUnblock(b.id)} style={s.unblockBtn}>
                <Text style={s.unblockBtnText}>Unblock</Text>
              </TouchableOpacity>
            </View>
          ))}
        </SettingsSection>
      ) : null}

      <SettingsSection title="Session">
        <Row icon="log-out" label="Sign out" onPress={handleSignOut} last />
      </SettingsSection>

      <SettingsSection title="Danger zone">
        <Row
          icon="trash-2"
          label={isDeleting ? 'Deleting…' : 'Delete account'}
          onPress={isDeleting ? undefined : handleDeleteAccount}
          danger
          last
        />
      </SettingsSection>

      {/* A6 / M3 — re-auth gate for disable-MFA + delete-account. */}
      <ReAuthModal
        visible={reAuth !== null}
        kind={reAuth?.kind ?? 'disable_mfa'}
        onCancel={() => setReAuth(null)}
        onConfirm={handleReAuthConfirm}
      />
    </ScrollView>
  );
}

// A6 / M3 — modal that collects the password and routes through
// requireReAuth() before any destructive op runs. Decoupled from the
// caller so the screen just opens it and reacts to the resolved
// promise; modal owns the password input, the spinner, and the
// error-string mapping.
function ReAuthModal({
  visible,
  kind,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  kind: 'disable_mfa' | 'delete_account';
  onCancel: () => void;
  onConfirm: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setPassword('');
      setBusy(false);
      setErr(null);
    }
  }, [visible]);

  const title = kind === 'disable_mfa' ? 'Disable two-factor' : 'Delete account';
  const message =
    kind === 'disable_mfa'
      ? 'Enter your password to confirm. This removes the extra layer of protection on your account.'
      : 'This will permanently delete your account and all data. Enter your password to confirm.';
  const confirmLabel = kind === 'disable_mfa' ? 'Disable' : 'Delete';

  const submit = async () => {
    if (!password || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await onConfirm(password);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === 'cancelled') {
        // Biometric cancel — silent, leave the modal open so the user
        // can retry or hit Cancel themselves.
      } else if (msg === 'password_mismatch') {
        setErr('Incorrect password.');
      } else {
        setErr('Could not verify. Try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.modalOverlay}
      >
        <View style={s.modalCard}>
          <Text style={s.modalTitle}>{title}</Text>
          <Text style={s.modalMessage}>{message}</Text>
          <TextInput
            style={s.modalInput}
            placeholder="Password"
            placeholderTextColor={colors.button1}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            value={password}
            onChangeText={setPassword}
            editable={!busy}
            onSubmitEditing={submit}
            returnKeyType="done"
          />
          {err ? <Text style={s.modalError}>{err}</Text> : null}
          <View style={s.modalButtons}>
            <TouchableOpacity
              onPress={onCancel}
              disabled={busy}
              style={[s.modalBtn, s.modalBtnCancel]}
            >
              <Text style={s.modalBtnTextCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={submit}
              disabled={busy || password.length === 0}
              style={[
                s.modalBtn,
                s.modalBtnConfirm,
                (busy || password.length === 0) && s.modalBtnDisabled,
              ]}
            >
              <Text style={s.modalBtnTextConfirm}>
                {busy ? 'Verifying…' : confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function PreferencesTab() {
  const { profile, updateProfile } = useProfile();
  const { weightUnit, heightUnit, setWeightUnit, setHeightUnit } = useSettings();
  const { accent, accentDim, accentSubtle } = useAccent();
  const { session } = useAuth();
  const navigation = useNavigation<any>();

  // H4 — gate the first save of body metrics on GDPR Art. 9 consent.
  // We lazily import to avoid pulling consent code into screens that
  // don't need it. The check runs server-side too.
  const requireBodyMetricsConsent = useCallback(async (): Promise<boolean> => {
    const uid = session?.user?.id;
    if (!uid) return false;
    const { hasConsent } = await import('../services/consentService');
    if (await hasConsent(uid, 'body_metrics')) return true;
    navigation.navigate('HealthDataConsent');
    return false;
  }, [session?.user?.id, navigation]);

  const [weeklyTarget, setWeeklyTarget] = useState(profile?.weekly_target ?? 3);
  const [goal, setGoal] = useState<TrainingGoal | null>(profile?.goal ?? null);

  const [editingWeight, setEditingWeight] = useState(false);
  const [editingHeight, setEditingHeight] = useState(false);
  const [weightInput,   setWeightInput]   = useState('');
  const [heightInput,   setHeightInput]   = useState('');

  const saveWeightUnit = setWeightUnit;
  const saveHeightUnit = setHeightUnit;

  const saveWeeklyTarget = (val: number) => {
    setWeeklyTarget(val);
    updateProfile({ weekly_target: val });
  };

  const saveGoal = (val: TrainingGoal) => {
    setGoal(val);
    updateProfile({ goal: val });
  };

  const weightKg = profile?.weight_kg ?? null;
  const heightCm = profile?.height_cm ?? null;

  const displayWeight = (): string => {
    if (!weightKg) return '—';
    if (weightUnit === 'lbs') return `${Math.round(weightKg * 2.20462)} lbs`;
    return `${weightKg} kg`;
  };

  const displayHeight = (): string => {
    if (!heightCm) return '—';
    if (heightUnit === 'ft') {
      const totalIn = heightCm / 2.54;
      const ft = Math.floor(totalIn / 12);
      const inches = Math.round(totalIn % 12);
      return `${ft}'${inches}"`;
    }
    return `${heightCm} cm`;
  };

  const startEditWeight = () => {
    setWeightInput(
      weightKg
        ? weightUnit === 'lbs' ? String(Math.round(weightKg * 2.20462)) : String(weightKg)
        : '',
    );
    setEditingWeight(true);
  };

  const saveWeight = async () => {
    setEditingWeight(false);
    const val = parseFloat(weightInput);
    if (!isNaN(val) && val > 0) {
      // H4 — gate save on consent.
      const ok = await requireBodyMetricsConsent();
      if (!ok) return;
      const kg = weightUnit === 'lbs' ? val / 2.20462 : val;
      await updateProfile({ weight_kg: Math.round(kg * 10) / 10 });
    }
  };

  const startEditHeight = () => {
    setHeightInput(
      heightCm
        ? heightUnit === 'ft' ? String(Math.round(heightCm / 2.54)) : String(heightCm)
        : '',
    );
    setEditingHeight(true);
  };

  const saveHeight = async () => {
    setEditingHeight(false);
    const val = parseFloat(heightInput);
    if (!isNaN(val) && val > 0) {
      // H4 — gate save on consent.
      const ok = await requireBodyMetricsConsent();
      if (!ok) return;
      const cm = heightUnit === 'ft' ? val * 2.54 : val;
      await updateProfile({ height_cm: Math.round(cm) });
    }
  };

  return (
    <ScrollView contentContainerStyle={s.tabContent} showsVerticalScrollIndicator={false}>
      <SettingsSection title="Body">
        {/* Weight row — value + unit toggle combined */}
        {editingWeight ? (
          <View style={[s.row, { gap: 8 }]}>
            <View style={s.rowIcon}>
              <Feather name="activity" size={15} color={colors.button1} />
            </View>
            <TextInput
              style={[s.inlineInput, { borderBottomColor: accent }]}
              value={weightInput}
              onChangeText={setWeightInput}
              autoFocus
              keyboardType="numeric"
              returnKeyType="done"
              placeholder={weightUnit === 'lbs' ? 'lbs' : 'kg'}
              placeholderTextColor={colors.button2}
              onBlur={saveWeight}
              onSubmitEditing={saveWeight}
              selectionColor={accent}
            />
            <UnitToggle options={['kg', 'lbs']} value={weightUnit} onChange={v => saveWeightUnit(v as 'kg' | 'lbs')} />
            <TouchableOpacity onPress={saveWeight} style={{ padding: 4 }}>
              <Feather name="check" size={16} color={accent} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={startEditWeight} activeOpacity={0.7} style={s.row}>
            <View style={s.rowIcon}>
              <Feather name="activity" size={15} color={colors.button1} />
            </View>
            <Text style={s.rowLabel}>Weight</Text>
            <View style={s.rowRight}>
              <View style={s.editChip}>
                <Text style={s.editChipText}>{displayWeight()}</Text>
                <Feather name="edit-2" size={11} color={colors.button1} />
              </View>
              <UnitToggle options={['kg', 'lbs']} value={weightUnit} onChange={v => saveWeightUnit(v as 'kg' | 'lbs')} />
            </View>
          </TouchableOpacity>
        )}
        {/* Height row — value + unit toggle combined */}
        {editingHeight ? (
          <View style={[s.row, s.rowLast, { gap: 8 }]}>
            <View style={s.rowIcon}>
              <Feather name="arrow-up" size={15} color={colors.button1} />
            </View>
            <TextInput
              style={[s.inlineInput, { borderBottomColor: accent }]}
              value={heightInput}
              onChangeText={setHeightInput}
              autoFocus
              keyboardType="numeric"
              returnKeyType="done"
              placeholder={heightUnit === 'ft' ? 'total inches' : 'cm'}
              placeholderTextColor={colors.button2}
              onBlur={saveHeight}
              onSubmitEditing={saveHeight}
              selectionColor={accent}
            />
            <UnitToggle options={['cm', 'ft']} value={heightUnit} onChange={v => saveHeightUnit(v as 'cm' | 'ft')} />
            <TouchableOpacity onPress={saveHeight} style={{ padding: 4 }}>
              <Feather name="check" size={16} color={accent} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={startEditHeight} activeOpacity={0.7} style={[s.row, s.rowLast]}>
            <View style={s.rowIcon}>
              <Feather name="arrow-up" size={15} color={colors.button1} />
            </View>
            <Text style={s.rowLabel}>Height</Text>
            <View style={s.rowRight}>
              <View style={s.editChip}>
                <Text style={s.editChipText}>{displayHeight()}</Text>
                <Feather name="edit-2" size={11} color={colors.button1} />
              </View>
              <UnitToggle options={['cm', 'ft']} value={heightUnit} onChange={v => saveHeightUnit(v as 'cm' | 'ft')} />
            </View>
          </TouchableOpacity>
        )}
      </SettingsSection>

      <SettingsSection title="Weekly target">
        <View style={s.chipGrid}>
          {[1, 2, 3, 4, 5, 6, 7].map(n => (
            <TouchableOpacity
              key={n}
              style={[
                s.chip,
                weeklyTarget === n && [s.chipActive, { backgroundColor: accentSubtle, borderColor: accent }],
              ]}
              onPress={() => saveWeeklyTarget(n)}
              activeOpacity={0.7}
            >
              <Text style={[s.chipNum, weeklyTarget === n && [s.chipNumActive, { color: accent }]]}>{n}</Text>
              <Text style={[s.chipLabel, weeklyTarget === n && [s.chipLabelActive, { color: accentDim }]]}>
                {n === 1 ? 'day' : 'days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SettingsSection>

      <SettingsSection title="Training goal">
        {GOALS.map((g, i) => (
          <TouchableOpacity
            key={g.key}
            style={[
              s.goalRow,
              goal === g.key && [s.goalRowActive, { backgroundColor: accentSubtle }],
              i === GOALS.length - 1 && s.rowLast,
            ]}
            onPress={() => saveGoal(g.key)}
            activeOpacity={0.75}
          >
            <View style={s.rowIcon}>
              <Feather name={g.icon as any} size={15} color={goal === g.key ? accent : colors.button1} />
            </View>
            <Text style={[s.rowLabel, goal === g.key && { color: accent }]}>{g.label}</Text>
            {goal === g.key && <Feather name="check" size={15} color={accent} />}
          </TouchableOpacity>
        ))}
      </SettingsSection>
    </ScrollView>
  );
}

// Theme catalog mirrored from the store. Settings only needs the bits
// it renders (id, name, swatch color, free/paid) — the full metadata
// lives in AchievementsScreen's COSMETIC_THEMES. `id: null` is the
// implicit default; equipping it falls back to the mint green palette.
const SETTINGS_THEMES: { id: string | null; name: string; swatch: string; free: boolean }[] = [
  { id: null,      name: 'Mint Green', swatch: '#00FA9A', free: true  },
  { id: 'crimson', name: 'Crimson',    swatch: '#DC143C', free: false },
  { id: 'pink',    name: 'Pink',       swatch: '#FF4DD2', free: false },
];

function CustomizationTab() {
  const {
    waterTrackerEnabled,
    setWaterTrackerEnabled,
    equippedThemeId,
    ownedThemeIds,
    equipTheme,
  } = useSettings();
  const { accent, accentDim } = useAccent();

  // Only show themes the user actually owns. Free themes are always
  // available; paid themes appear once unlocked in the store.
  const ownedThemes = SETTINGS_THEMES.filter(t => t.free || (t.id !== null && ownedThemeIds.has(t.id)));

  return (
    <ScrollView contentContainerStyle={s.tabContent} showsVerticalScrollIndicator={false}>
      <SettingsSection title="Home screen">
        <Row
          icon="droplet"
          label="Water tracker"
          last
          right={
            <Switch
              value={waterTrackerEnabled}
              onValueChange={setWaterTrackerEnabled}
              trackColor={{ false: colors.button3, true: accentDim }}
              thumbColor={waterTrackerEnabled ? accent : colors.button1}
            />
          }
        />
      </SettingsSection>

      <SettingsSection title="Theme">
        {ownedThemes.map((t, i) => {
          const isEquipped = equippedThemeId === t.id;
          const isLast = i === ownedThemes.length - 1;
          return (
            <View key={t.id ?? 'default'} style={[s.row, isLast && s.rowLast]}>
              <View
                style={[
                  s.rowIcon,
                  { backgroundColor: t.swatch + '22', borderWidth: 1, borderColor: t.swatch + '99' },
                ]}
              >
                <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: t.swatch }} />
              </View>
              <Text style={[s.rowLabel, isEquipped && { color: t.swatch }]}>{t.name}</Text>
              <Switch
                value={isEquipped}
                onValueChange={(on) => equipTheme(on ? t.id : null)}
                trackColor={{ false: colors.button3, true: t.swatch + '99' }}
                thumbColor={isEquipped ? t.swatch : colors.button1}
              />
            </View>
          );
        })}
      </SettingsSection>
    </ScrollView>
  );
}

function PrivacyTab() {
  const { publicProfile, openFollows, setPublicProfile, setOpenFollows } = useSettings();
  const { accent, accentDim } = useAccent();

  // M1 — Crash-reporting opt-in. The toggle is loaded from SecureStore
  // on mount and persists each flip via the observability module
  // (which also closes / reinitialises the Sentry client).
  const [crashReportingOn, setCrashReportingOn] = useState(false);
  useEffect(() => {
    isCrashReportingEnabled().then(setCrashReportingOn);
  }, []);
  const toggleCrashReporting = async (next: boolean) => {
    setCrashReportingOn(next);
    if (next) await enableCrashReporting();
    else      await disableCrashReporting();
  };

  return (
    <ScrollView contentContainerStyle={s.tabContent} showsVerticalScrollIndicator={false}>
      <SettingsSection title="Profile">
        <Row
          icon="globe"
          label="Public profile"
          right={
            <Switch
              value={publicProfile}
              onValueChange={setPublicProfile}
              trackColor={{ false: colors.button3, true: accentDim }}
              thumbColor={publicProfile ? accent : colors.button1}
            />
          }
        />
        <Row
          icon="user-plus"
          label="Allow anyone to follow"
          last
          right={
            <Switch
              value={openFollows}
              onValueChange={setOpenFollows}
              trackColor={{ false: colors.button3, true: accentDim }}
              thumbColor={openFollows ? accent : colors.button1}
            />
          }
        />
      </SettingsSection>

      {/* M1 — Crash reporting opt-in (GDPR Art. 6(1)(a)). Default OFF. */}
      <SettingsSection title="Crash reporting">
        <Row
          icon="alert-triangle"
          label="Help improve Repmi by sending crash reports"
          last
          right={
            <Switch
              value={crashReportingOn}
              onValueChange={toggleCrashReporting}
              trackColor={{ false: colors.button3, true: accentDim }}
              thumbColor={crashReportingOn ? accent : colors.button1}
            />
          }
        />
      </SettingsSection>

      <SettingsSection title="Data">
        <Row icon="download" label="Export my data"  onPress={() => Alert.alert('Coming soon', 'Data export will be available in a future update.')} />
        <Row icon="eye-off"  label="Hide from search" last right={<Text style={s.rowValue}>Coming soon</Text>} />
      </SettingsSection>
    </ScrollView>
  );
}

function AboutTab() {
  return (
    <ScrollView contentContainerStyle={s.tabContent} showsVerticalScrollIndicator={false}>
      <SettingsSection title="App">
        <Row icon="info"        label="Version"         value="1.0.0" />
        <Row icon="star"        label="Rate the app"    onPress={() => {}} />
        <Row icon="message-square" label="Send feedback" onPress={() => Linking.openURL('mailto:support@repmi.co.uk')} last />
      </SettingsSection>

      <SettingsSection title="Legal">
        {/* TODO: update URL once legal docs are hosted */}
        <Row
          icon="file-text"
          label="Terms of service"
          onPress={() => Linking.openURL('https://repmi.co.uk/terms')}
        />
        {/* TODO: update URL once legal docs are hosted */}
        <Row
          icon="shield"
          label="Privacy policy"
          onPress={() => Linking.openURL('https://repmi.co.uk/privacy')}
          last
        />
      </SettingsSection>
    </ScrollView>
  );
}

// ─── unit toggle helper ───────────────────────────────────────────────────────

function UnitToggle({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={s.unitToggle}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[s.unitOpt, value === opt && s.unitOptActive]}
          onPress={() => onChange(opt)}
          activeOpacity={0.7}
        >
          <Text style={[s.unitOptText, value === opt && s.unitOptTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<TabId>('account');
  const { contentMaxWidth } = useResponsive();
  const rootWideStyle = contentMaxWidth
    ? { maxWidth: contentMaxWidth, alignSelf: 'center' as const, width: '100%' as const }
    : null;
  const pillX = useRef(new Animated.Value(0)).current;
  // Horizontal pager state — translateX drives the full-width row of
  // tab panes; tabIndexRef gives the gesture handler stable access to
  // the current index without re-creating the PanResponder closure.
  const translateX = useRef(new Animated.Value(0)).current;
  const tabIndexRef = useRef(0);
  const dragStartValue = useRef(0);
  const isHorizontal = useRef(false);

  const snapToIndex = useCallback((index: number, velocityX = 0) => {
    const clamped = Math.max(0, Math.min(TAB_COUNT - 1, index));
    tabIndexRef.current = clamped;
    setActiveTab(TABS[clamped].id);
    Animated.spring(translateX, {
      toValue: -clamped * SCREEN_W,
      useNativeDriver: true,
      velocity: -velocityX,
      tension: 68,
      friction: 11,
      overshootClamping: false,
    }).start();
    Animated.spring(pillX, {
      toValue: clamped * SEGMENT_W,
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start();
  }, [pillX, translateX]);

  const switchTab = (tab: TabId) => {
    const index = TABS.findIndex(t => t.id === tab);
    snapToIndex(index);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, gs) => {
        // Horizontal-dominant + minimum displacement so vertical
        // scrolling inside each tab still wins.
        const horizontal = Math.abs(gs.dx) > Math.abs(gs.dy) * 1.8 && Math.abs(gs.dx) > 8;
        isHorizontal.current = horizontal;
        return horizontal;
      },
      onPanResponderGrant: () => {
        translateX.stopAnimation(v => { dragStartValue.current = v; });
        isHorizontal.current = false;
      },
      onPanResponderMove: (_e, gs) => {
        if (!isHorizontal.current) return;
        const idx = tabIndexRef.current;
        let dx = gs.dx;
        // Rubber-band past the first/last tab edges instead of letting
        // them drift off-screen.
        if ((idx === 0 && dx > 0) || (idx === TAB_COUNT - 1 && dx < 0)) dx *= 0.15;
        translateX.setValue(dragStartValue.current + dx);
      },
      onPanResponderRelease: (_e, gs) => {
        const { dx, vx } = gs;
        const idx = tabIndexRef.current;
        const goNext = dx < -SWIPE_DISTANCE_THRESHOLD || vx < -SWIPE_VELOCITY_THRESHOLD;
        const goPrev = dx >  SWIPE_DISTANCE_THRESHOLD || vx >  SWIPE_VELOCITY_THRESHOLD;
        if      (goNext && idx < TAB_COUNT - 1) snapToIndex(idx + 1, vx);
        else if (goPrev && idx > 0)             snapToIndex(idx - 1, vx);
        else                                    snapToIndex(idx, vx);
      },
      onPanResponderTerminate: () => { snapToIndex(tabIndexRef.current, 0); },
    }),
  ).current;

  return (
    <View style={[s.screen, rootWideStyle]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Feather name="x" size={22} color={colors.highlight} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
      </View>

      {/* Segmented control */}
      <View style={s.segmentWrap}>
        <Animated.View style={[s.segmentPill, { width: SEGMENT_W, transform: [{ translateX: pillX }] }]} />
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={s.segmentBtn}
            onPress={() => switchTab(tab.id)}
            activeOpacity={0.8}
          >
            <Text style={[s.segmentLabel, activeTab === tab.id && s.segmentLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Swipeable pager — all 5 tabs sit in a horizontal row of
          `SCREEN_W * TAB_COUNT` width; translateX shifts the row so
          one pane is on-screen at a time. */}
      <View style={{ flex: 1, overflow: 'hidden' }} {...panResponder.panHandlers}>
        <Animated.View
          style={{
            flex: 1,
            flexDirection: 'row',
            width: SCREEN_W * TAB_COUNT,
            transform: [{ translateX }],
          }}
        >
          <View style={{ width: SCREEN_W }}><AccountTab /></View>
          <View style={{ width: SCREEN_W }}><PreferencesTab /></View>
          <View style={{ width: SCREEN_W }}><CustomizationTab /></View>
          <View style={{ width: SCREEN_W }}><PrivacyTab /></View>
          <View style={{ width: SCREEN_W }}><AboutTab /></View>
        </Animated.View>
      </View>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.highlight,
  },

  // Segmented control
  segmentWrap: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: colors.container,
    borderRadius: 12,
    padding: 3,
    position: 'relative',
  },
  segmentPill: {
    position: 'absolute',
    top: 3,
    left: 3,
    bottom: 3,
    borderRadius: 9,
    backgroundColor: colors.button2,
  },
  segmentBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    zIndex: 1,
  },
  segmentLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.button1,
  },
  segmentLabelActive: {
    color: colors.highlight,
  },
  tabLabelActive: {
    // NOTE: unused dead style; module-scope inline can't react to theme.
    color: '#00FA9A',
  },

  // Tab content
  tabContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 48,
    gap: 24,
  },

  // Section
  section: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.button1,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  sectionBody: {
    backgroundColor: colors.container,
    borderRadius: 14,
    overflow: 'hidden',
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.button3,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.button3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: {
    backgroundColor: 'rgba(255,107,107,0.15)',
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.highlight,
    fontWeight: '500',
  },
  rowLabelDanger: {
    color: '#FF6B6B',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValue: {
    fontSize: 13,
    color: colors.button1,
  },
  editChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.button3,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.highlight,
  },

  // Inline username edit
  inlineInput: {
    flex: 1,
    fontSize: 14,
    color: colors.highlight,
    borderBottomWidth: 1,
    paddingBottom: 2,
  },

  // Unit toggle
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: colors.button3,
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  unitOpt: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unitOptActive: {
    backgroundColor: colors.button2,
  },
  unitOptText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.button1,
  },
  unitOptTextActive: {
    color: colors.highlight,
  },

  // Weekly chips
  chipGrid: {
    flexDirection: 'row',
    gap: 6,
    padding: 12,
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.button3,
    alignItems: 'center',
    gap: 2,
  },
  chipActive: {
    borderWidth: 1,
  },
  chipNum: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.button1,
  },
  chipNumActive: {},
  chipLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: colors.button2,
    textTransform: 'uppercase',
  },
  chipLabelActive: {},

  // H12 — Unblock button
  unblockBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.button3,
  },
  unblockBtnText: {
    color: colors.highlight,
    fontSize: 12,
    fontWeight: '600',
  },

  // Goal rows
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.button3,
  },
  goalRowActive: {},

  // A6 / M3 — Re-auth modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.container,
    borderRadius: 14,
    padding: 18,
    gap: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.highlight,
  },
  modalMessage: {
    fontSize: 13,
    color: colors.button1,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: colors.button3,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.highlight,
  },
  modalError: {
    fontSize: 12,
    color: '#FF6B6B',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: colors.button3,
  },
  modalBtnConfirm: {
    backgroundColor: '#FF6B6B',
  },
  modalBtnDisabled: {
    opacity: 0.5,
  },
  modalBtnTextCancel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.highlight,
  },
  modalBtnTextConfirm: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
