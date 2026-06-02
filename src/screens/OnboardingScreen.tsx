import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Modal,
  ScrollView,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../theme/colors';
import { useProfile } from '../services/ProfileContext';
import { useAccent } from '../services/SettingsContext';
import { TrainingGoal } from '../types/user';
import { checkUsernameAvailable } from '../services/profileService';
import { validateUsername } from '../utils/validateUsername';
import WebBirthdayPicker from '../components/WebBirthdayPicker';

// ─── data ─────────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;

const GOALS: { key: TrainingGoal; label: string; desc: string; icon: string }[] = [
  { key: 'strength',    label: 'Strength',    desc: 'Build raw power & max lifts',  icon: 'trending-up' },
  { key: 'hypertrophy', label: 'Hypertrophy', desc: 'Maximise muscle size',          icon: 'layers'      },
  { key: 'endurance',   label: 'Endurance',   desc: 'Go harder, for longer',         icon: 'activity'    },
  { key: 'weight_loss', label: 'Cut',         desc: 'Drop fat, keep muscle',         icon: 'zap'         },
  { key: 'general',     label: 'General',     desc: 'Stay active and healthy',       icon: 'heart'       },
];

// ─── shared sub-components ────────────────────────────────────────────────────

function ProgressDots({ step }: { step: number }) {
  const { accent } = useAccent();
  return (
    <View style={s.dotsRow}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            s.dot,
            i + 1 <= step
              ? [s.dotFilled, { backgroundColor: accent }]
              : s.dotEmpty,
          ]}
        />
      ))}
    </View>
  );
}

function UnitToggle<T extends string>({
  value, options, onChange,
}: { value: T; options: T[]; onChange: (v: T) => void }) {
  return (
    <View style={s.unitToggle}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[s.unitOpt, value === opt && s.unitOptActive]}
          onPress={() => onChange(opt)}
        >
          <Text style={[s.unitOptText, value === opt && s.unitOptTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── step screens ─────────────────────────────────────────────────────────────

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

function StepName({
  name,
  setName,
  onStatusChange,
}: {
  name: string;
  setName: (v: string) => void;
  onStatusChange: (s: UsernameStatus) => void;
}) {
  const { accent } = useAccent();
  const [status, setStatus] = useState<UsernameStatus>('idle');
  const [hint, setHint] = useState('');

  useEffect(() => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setStatus('idle');
      onStatusChange('idle');
      return;
    }
    const validation = validateUsername(trimmed);
    if (!validation.ok) {
      setStatus('invalid');
      setHint(validation.reason);
      onStatusChange('invalid');
      return;
    }
    setStatus('checking');
    const timer = setTimeout(async () => {
      const available = await checkUsernameAvailable(trimmed);
      const next: UsernameStatus = available ? 'available' : 'taken';
      setStatus(next);
      onStatusChange(next);
    }, 600);
    return () => clearTimeout(timer);
  }, [name]);

  const indicator =
    status === 'checking' ? <ActivityIndicator size="small" color={colors.button1} /> :
    status === 'available' ? <Feather name="check-circle" size={18} color={accent} /> :
    status === 'taken' || status === 'invalid' ? <Feather name="x-circle" size={18} color="#FF6B6B" /> :
    null;

  return (
    <View style={s.stepContent}>
      <Text style={s.title}>What should we call you?</Text>
      <Text style={s.subtitle}>Pick a unique username! ദ്ദി(˵ •̀ ᴗ - ˵ ) ✧ </Text>
      <View style={s.inputRow}>
        <TextInput
          style={[s.input, s.inputFlex]}
          placeholder="Your username"
          placeholderTextColor={colors.button1}
          value={name}
          onChangeText={setName}
          autoCapitalize="none"
          returnKeyType="done"
          selectionColor={accent}
        />
        {indicator && <View style={s.inputIndicator}>{indicator}</View>}
      </View>
      {status === 'taken' && (
        <Text style={s.takenHint}>That username is already taken</Text>
      )}
      {status === 'invalid' && (
        <Text style={s.takenHint}>{hint}</Text>
      )}
    </View>
  );
}

const MAX_BIRTH_DATE = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 16); return d; })();
const MIN_BIRTH_DATE = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 100); return d; })();


interface StepStatsProps {
  birthDate: Date | null; setBirthDate: (v: Date) => void;
  weightVal: string; setWeightVal: (v: string) => void;
  weightUnit: 'kg' | 'lbs'; setWeightUnit: (v: 'kg' | 'lbs') => void;
  heightCm: string; setHeightCm: (v: string) => void;
  heightFt: string; setHeightFt: (v: string) => void;
  heightIn: string; setHeightIn: (v: string) => void;
  heightUnit: 'cm' | 'ft'; setHeightUnit: (v: 'cm' | 'ft') => void;
}

function StepStats({
  birthDate, setBirthDate,
  weightVal, setWeightVal, weightUnit, setWeightUnit,
  heightCm, setHeightCm,
  heightFt, setHeightFt,
  heightIn, setHeightIn,
  heightUnit, setHeightUnit,
}: StepStatsProps) {
  const { accent, accentDim, accentSubtle } = useAccent();
  const [showPicker, setShowPicker] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date>(MAX_BIRTH_DATE);

  const displayDate = birthDate
    ? birthDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Select your birthday';

  const openPicker = () => {
    setPendingDate(birthDate ?? MAX_BIRTH_DATE);
    setShowPicker(true);
  };

  return (
    <View style={s.stepContent}>
      <Text style={s.title}>Your stats</Text>
      <Text style={s.subtitle}>Optional — helps personalise your experience</Text>

      <Text style={s.fieldLabel}>Birthday</Text>
      {Platform.OS === 'web' ? (
        <WebBirthdayPicker
          value={birthDate}
          onChange={setBirthDate}
          accent={accent}
          accentDim={accentDim}
          accentSubtle={accentSubtle}
          minDate={MIN_BIRTH_DATE}
          maxDate={MAX_BIRTH_DATE}
        />
      ) : (
        <>
          <TouchableOpacity style={[s.input, s.birthdayRow]} onPress={openPicker} activeOpacity={0.7}>
            <Text style={[s.birthdayText, !birthDate && s.birthdayPlaceholder]}>{displayDate}</Text>
            <Feather name="calendar" size={16} color={colors.button1} />
          </TouchableOpacity>

          <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
            <TouchableOpacity style={s.pickerOverlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
              <View style={s.pickerCenterer}>
                <TouchableOpacity activeOpacity={1}>
                  <View style={s.pickerSheet}>
                    <View style={s.pickerHeader}>
                      <TouchableOpacity onPress={() => setShowPicker(false)}>
                        <Text style={s.pickerCancel}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { setBirthDate(pendingDate); setShowPicker(false); }}>
                        <Text style={[s.pickerDone, { color: accent }]}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={pendingDate}
                      mode="date"
                      display="spinner"
                      maximumDate={MAX_BIRTH_DATE}
                      minimumDate={MIN_BIRTH_DATE}
                      onChange={(_, date) => { if (date) setPendingDate(date); }}
                      themeVariant="dark"
                      style={{ width: '100%' }}
                    />
                  </View>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        </>
      )}

      <View style={s.fieldHeaderRow}>
        <Text style={s.fieldLabel}>Weight</Text>
        <UnitToggle value={weightUnit} options={['kg', 'lbs']} onChange={setWeightUnit} />
      </View>
      <TextInput
        style={s.input}
        placeholder={weightUnit === 'kg' ? 'e.g. 80' : 'e.g. 176'}
        placeholderTextColor={colors.button1}
        value={weightVal}
        onChangeText={setWeightVal}
        keyboardType="decimal-pad"
        selectionColor={accent}
      />

      <View style={s.fieldHeaderRow}>
        <Text style={s.fieldLabel}>Height</Text>
        <UnitToggle value={heightUnit} options={['cm', 'ft']} onChange={setHeightUnit} />
      </View>
      {heightUnit === 'cm' ? (
        <TextInput
          style={s.input}
          placeholder="e.g. 178"
          placeholderTextColor={colors.button1}
          value={heightCm}
          onChangeText={setHeightCm}
          keyboardType="decimal-pad"
          selectionColor={accent}
        />
      ) : (
        <View style={s.ftRow}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            placeholder="ft"
            placeholderTextColor={colors.button1}
            value={heightFt}
            onChangeText={setHeightFt}
            keyboardType="number-pad"
            selectionColor={accent}
          />
          <TextInput
            style={[s.input, { flex: 1 }]}
            placeholder="in"
            placeholderTextColor={colors.button1}
            value={heightIn}
            onChangeText={setHeightIn}
            keyboardType="number-pad"
            selectionColor={accent}
          />
        </View>
      )}
    </View>
  );
}

function StepGoal({ goal, setGoal }: { goal: TrainingGoal | null; setGoal: (v: TrainingGoal) => void }) {
  const { accent, accentSubtle } = useAccent();
  return (
    <View style={s.stepContent}>
      <Text style={s.title}>What's your{'\n'}main goal?</Text>
      <Text style={s.subtitle}>We'll tailor your experience around it</Text>
      {GOALS.map(g => {
        const active = goal === g.key;
        return (
          <TouchableOpacity
            key={g.key}
            style={[
              s.goalCard,
              active && [s.goalCardActive, { borderColor: accent, backgroundColor: accentSubtle }],
            ]}
            onPress={() => setGoal(g.key)}
            activeOpacity={0.75}
          >
            <View style={[s.goalIconBox, active && [s.goalIconBoxActive, { backgroundColor: accent }]]}>
              <Feather name={g.icon as any} size={18} color={active ? colors.background : colors.button1} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.goalLabel, active && [s.goalLabelActive, { color: accent }]]}>{g.label}</Text>
              <Text style={s.goalDesc}>{g.desc}</Text>
            </View>
            {active && <Feather name="check-circle" size={18} color={accent} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function StepConsistency({ target, setTarget }: { target: number; setTarget: (v: number) => void }) {
  const { accent, accentDim, accentSubtle } = useAccent();
  const hint =
    target <= 2 ? 'Great start — consistency is everything'
    : target <= 4 ? 'Perfect balance of effort and recovery'
    : target <= 6 ? 'High commitment — make sure to rest'
    : 'Every day — recovery is key too';

  return (
    <View style={s.stepContent}>
      <Text style={s.title}>How often do{'\n'}you train?</Text>
      <Text style={s.subtitle}>Set a weekly target to stay accountable</Text>
      <View style={s.dayGrid}>
        {[1, 2, 3, 4, 5, 6, 7].map(n => (
          <TouchableOpacity
            key={n}
            style={[
              s.dayChip,
              target === n && [s.dayChipActive, { backgroundColor: accentSubtle, borderColor: accent }],
            ]}
            onPress={() => setTarget(n)}
            activeOpacity={0.75}
          >
            <Text style={[s.dayChipNum, target === n && [s.dayChipNumActive, { color: accent }]]}>{n}</Text>
            <Text style={[s.dayChipLabel, target === n && [s.dayChipLabelActive, { color: accentDim }]]}>
              {n === 1 ? 'day' : 'days'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.consistencyHint}>{hint}</Text>
    </View>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { saveProfile } = useProfile();
  const { accent } = useAccent();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [weightVal, setWeightVal] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [goal, setGoal] = useState<TrainingGoal | null>(null);
  const [weeklyTarget, setWeeklyTarget] = useState(3);

  const canContinue =
    step === 1 ? usernameStatus === 'available' :
    step === 3 ? goal !== null :
    true;

  const goToStep = (n: number) => {
    setStep(n);
    scrollRef.current?.scrollTo({ x: (n - 1) * SCREEN_WIDTH, animated: true });
  };

  const handleNext = () => {
    if (!canContinue) return;
    Keyboard.dismiss();
    if (step < TOTAL_STEPS) { goToStep(step + 1); return; }
    submit();
  };

  const handleScrollEnd = (e: any) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH) + 1;
    if (page !== step) setStep(page);
  };

  async function submit() {
    if (!name.trim()) { goToStep(1); return; }
    if (!goal) { goToStep(3); return; }
    setLoading(true);
    try {
      let weight_kg: number | null = null;
      let height_cm: number | null = null;

      if (weightVal) {
        const w = parseFloat(weightVal);
        if (!isNaN(w)) weight_kg = weightUnit === 'lbs' ? +(w * 0.453592).toFixed(2) : w;
      }
      if (heightUnit === 'cm' && heightCm) {
        const h = parseFloat(heightCm);
        if (!isNaN(h)) height_cm = h;
      } else if (heightUnit === 'ft' && heightFt) {
        const ft = parseFloat(heightFt) || 0;
        const inch = parseFloat(heightIn) || 0;
        height_cm = +((ft * 12 + inch) * 2.54).toFixed(1);
      }

      const age = birthDate ? (() => {
        const today = new Date();
        let a = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) a--;
        return a;
      })() : null;

      await saveProfile({
        username: name.trim(),
        age,
        weight_kg,
        height_cm,
        goal,
        weekly_target: weeklyTarget,
        avatar_url: null,
        cover_url: null,
      });
    } catch {
      // Profile can be completed later from the Profile tab
    } finally {
      setLoading(false);
    }
  }

  const pageStyle = { width: SCREEN_WIDTH };

  return (
    <View style={s.container}>
      <ProgressDots step={step} />

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={step > 1}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
      >
        <View style={pageStyle}>
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <StepName name={name} setName={setName} onStatusChange={setUsernameStatus} />
          </ScrollView>
        </View>

        <View style={pageStyle}>
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
            <StepStats
              birthDate={birthDate} setBirthDate={setBirthDate}
              weightVal={weightVal} setWeightVal={setWeightVal}
              weightUnit={weightUnit} setWeightUnit={setWeightUnit}
              heightCm={heightCm} setHeightCm={setHeightCm}
              heightFt={heightFt} setHeightFt={setHeightFt}
              heightIn={heightIn} setHeightIn={setHeightIn}
              heightUnit={heightUnit} setHeightUnit={setHeightUnit}
            />
          </ScrollView>
        </View>

        <View style={pageStyle}>
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <StepGoal goal={goal} setGoal={setGoal} />
          </ScrollView>
        </View>

        <View style={pageStyle}>
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <StepConsistency target={weeklyTarget} setTarget={setWeeklyTarget} />
          </ScrollView>
        </View>
      </ScrollView>

      <View style={s.footer}>
        {step > 1 && (
          <TouchableOpacity style={s.backBtn} onPress={() => goToStep(step - 1)}>
            <Feather name="arrow-left" size={20} color={colors.button1} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.continueBtn, { backgroundColor: accent }, !canContinue && s.continueBtnDisabled]}
          onPress={handleNext}
          disabled={!canContinue || loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={colors.background} />
            : <Text style={s.continueBtnText}>{step === TOTAL_STEPS ? "Let's go" : 'Continue'}</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Progress dots
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingTop: 60,
    paddingBottom: 4,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotFilled: {
    width: 20,
  },
  dotEmpty: {
    width: 6,
    backgroundColor: colors.button2,
  },

  // Scroll content
  scroll: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    flexGrow: 1,
  },
  stepContent: {
    paddingTop: 36,
  },

  // Typography
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 40,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: colors.button1,
    marginBottom: 32,
  },

  // Input row (with indicator)
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  inputFlex: {
    flex: 1,
    marginBottom: 0,
  },
  inputIndicator: {
    paddingLeft: 12,
  },
  takenHint: {
    fontSize: 12,
    color: '#FF6B6B',
    marginBottom: 8,
    marginTop: 4,
  },

  // Input
  input: {
    backgroundColor: colors.container,
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.button1,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  fieldHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: colors.button3,
    borderRadius: 8,
    padding: 2,
  },
  unitOpt: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unitOptActive: { backgroundColor: colors.container },
  unitOptText: { fontSize: 12, fontWeight: '600', color: colors.button1 },
  unitOptTextActive: { color: '#fff' },
  ftRow: { flexDirection: 'row', gap: 8 },
  birthdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  birthdayText: { fontSize: 15, color: '#fff' },
  birthdayPlaceholder: { color: colors.button1 },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerCenterer: {
    width: '85%',
  },
  pickerSheet: {
    backgroundColor: colors.container,
    borderRadius: 20,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.button3,
  },
  pickerCancel: { fontSize: 16, color: colors.button1 },
  pickerDone: { fontSize: 16, fontWeight: '600' },

  // Goal cards
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.container,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  goalCardActive: {},
  goalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.button3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalIconBoxActive: {},
  goalLabel: { fontSize: 15, fontWeight: '600', color: '#fff', marginBottom: 2 },
  goalLabelActive: {},
  goalDesc: { fontSize: 12, color: colors.button1 },

  // Day chips
  dayGrid: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    marginBottom: 24,
  },
  dayChip: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.container,
    borderWidth: 1,
    borderColor: colors.button3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dayChipActive: {},
  dayChipNum: { fontSize: 15, fontWeight: '700', color: colors.button1 },
  dayChipNumActive: {},
  dayChipLabel: { fontSize: 9, color: colors.button2, fontWeight: '600', textTransform: 'uppercase' },
  dayChipLabelActive: {},
  consistencyHint: { fontSize: 13, color: colors.button1, textAlign: 'center' },

  // Footer
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.button3,
  },
  backBtn: {
    position: 'absolute',
    left: 28,
    bottom: Platform.OS === 'ios' ? 54 : 38,
    width: 44,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtn: {
    width: '65%',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnDisabled: { backgroundColor: colors.button3 },
  continueBtnText: { fontSize: 16, fontWeight: '700', color: colors.background },
});
