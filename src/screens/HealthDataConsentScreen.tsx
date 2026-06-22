import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAccent } from '../services/SettingsContext';
import { useAuth } from '../services/AuthContext';
import {
  fetchConsents,
  grantConsent,
  ConsentKind,
} from '../services/consentService';
import {
  preventScreenCaptureAsync,
  allowScreenCaptureAsync,
} from 'expo-screen-capture';

export default function HealthDataConsentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { session } = useAuth();
  const { accent } = useAccent();
  const userId = session?.user.id;

  useFocusEffect(
    useCallback(() => {
      preventScreenCaptureAsync().catch(() => {});
      return () => {
        allowScreenCaptureAsync().catch(() => {});
      };
    }, []),
  );

  const [bodyChecked, setBodyChecked] = useState(false);
  const [trainingChecked, setTrainingChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existing, setExisting] = useState<Record<ConsentKind, boolean>>({
    body_metrics: false,
    training_data: false,
  });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchConsents(userId).then(rows => {
      if (cancelled) return;
      const map: Record<ConsentKind, boolean> = {
        body_metrics: false,
        training_data: false,
      };
      for (const r of rows) {
        if (!r.revoked_at) map[r.kind] = true;
      }
      setExisting(map);
      setBodyChecked(map.body_metrics);
      setTrainingChecked(map.training_data);
    });
    return () => { cancelled = true; };
  }, [userId]);

  const onContinue = useCallback(async () => {
    if (!userId) return;
    if (!bodyChecked && !trainingChecked) {
      Alert.alert('No consent given', 'Tick at least one option to continue, or use Decline to go back.');
      return;
    }
    setLoading(true);
    try {
      if (bodyChecked && !existing.body_metrics) {
        await grantConsent(userId, 'body_metrics');
      }
      if (trainingChecked && !existing.training_data) {
        await grantConsent(userId, 'training_data');
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not save consent', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userId, bodyChecked, trainingChecked, existing, navigation]);

  const onDecline = useCallback(() => {
    if (route.params?.onDecline) route.params.onDecline();
    navigation.goBack();
  }, [navigation, route.params]);

  return (
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <View style={s.headerRow}>
        <Feather name="shield" size={20} color={accent} />
        <Text style={s.title}>Your consent</Text>
      </View>

      <Text style={s.body}>
        Some Repmi features process information that European data
        protection law classifies as <Text style={s.bold}>special category
        data</Text> (GDPR Article 9). We will not store this information
        until you give explicit, granular consent.
      </Text>

      <ConsentRow
        checked={bodyChecked}
        onToggle={() => setBodyChecked(v => !v)}
        title="Body metrics"
        description="I consent to Repmi storing my body metrics (age, weight, height) as health-related data — GDPR Art. 9(2)(a)."
        accent={accent}
      />

      <ConsentRow
        checked={trainingChecked}
        onToggle={() => setTrainingChecked(v => !v)}
        title="Training data"
        description="I consent to Repmi storing my workout intensity (RPE) and training data."
        accent={accent}
      />

      <Text style={s.fineprint}>
        You can withdraw consent at any time in Settings → Privacy. Without
        consent, body-metric / RPE features stay disabled, but the rest of
        Repmi works normally.
      </Text>

      <View style={s.actions}>
        <TouchableOpacity
          style={[s.decline]}
          onPress={onDecline}
          activeOpacity={0.7}
        >
          <Text style={s.declineText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.continue, { backgroundColor: accent }, loading && { opacity: 0.6 }]}
          onPress={onContinue}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={colors.background} />
            : <Text style={s.continueText}>Save & continue</Text>
          }
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function ConsentRow({
  checked, onToggle, title, description, accent,
}: {
  checked: boolean;
  onToggle: () => void;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <TouchableOpacity
      style={s.row}
      activeOpacity={0.7}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View
        style={[
          s.checkbox,
          checked && { backgroundColor: accent, borderColor: accent },
        ]}
      >
        {checked ? <Feather name="check" size={14} color={colors.background} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle}>{title}</Text>
        <Text style={s.rowDesc}>{description}</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  scroll: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: colors.background,
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.highlight,
  },
  body: {
    color: colors.button1,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  bold: { fontWeight: '700', color: colors.highlight },
  row: {
    flexDirection: 'row',
    backgroundColor: colors.container,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginBottom: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.button1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  rowTitle: {
    color: colors.highlight,
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  rowDesc: {
    color: colors.button1,
    fontSize: 12,
    lineHeight: 17,
  },
  fineprint: {
    color: colors.button2,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 'auto',
  },
  decline: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.container,
    alignItems: 'center',
  },
  declineText: {
    color: colors.highlight,
    fontWeight: '600',
    fontSize: 14,
  },
  continue: {
    flex: 1.4,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 14,
  },
});
