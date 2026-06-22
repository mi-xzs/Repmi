import React, {
  useState, useMemo, useEffect, useRef,
  forwardRef, useImperativeHandle,
} from 'react';
import { View, Text, Pressable, TextInput, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import DeleteButton from '../../../ui/DeleteButton';
import AddExerciseButton from '../../../ui/AddExerciseButton';
import { colors } from '../../../../theme/colors';
import { useAccent } from '../../../../services/SettingsContext';
import { Feather } from '@expo/vector-icons';
import { WorkoutRowData, ExerciseMode, ExerciseRowBase } from '../../../../types/exercise';
import { styles } from '../Shared/SharedStyles';
import ExercisePickerModal from '../Shared/ExercisePickerModal';
import RepsModal from '../Shared/RepsModal';
import TimePickerModal from '../Shared/TimePickModal';
import QuickAdjustModal from '../Shared/QuickAdjustModal';
import RestTimerModal from '../../RestTimerModal';
import { findExercise } from '../../../../constants/exerciseCatalog';

const isWeb = Platform.OS === 'web';

export type PreviousSet = {
  kg?: number;
  reps?: number;
  label?: string;
  minutes?: number;
  seconds?: number;
  meters?: number;
};

export const formatDistance = (m: number): string => {
  if (m <= 0) return '';
  if (m >= 1000) return `${(m / 1000).toFixed(1)}km`;
  return `${m}m`;
};

type Props = {
  value?: WorkoutRowData[];
  onChange?: (data: WorkoutRowData[]) => void;
  onDelete?: () => void;
  readonly?: boolean;
  active?: boolean;
  workoutName?: string;
  onWorkoutNameChange?: (name: string) => void;
  previousSets?: PreviousSet[];
  exerciseMode?: ExerciseMode;
  onExerciseModeChange?: (mode: ExerciseMode) => void;
  onSwap?: (name: string, mode: ExerciseMode) => void;
  linkedFromPrev?: boolean;
  linkedToNext?: boolean;
  highlightNextSet?: boolean;
  workoutTitle?: string;
};

export type WorkoutSectionHandle = {
  validate: () => boolean;
  getFirstErrorView: () => View | null;
};

const assignSets = (data: WorkoutRowData[]): WorkoutRowData[] => {
  if (data.length === 0) return data;
  const firstIsWarmup = data[0].sets === 0;
  return data.map((row, i) => ({
    ...row,
    sets: firstIsWarmup ? (i === 0 ? 0 : i) : i + 1,
  }));
};

const formatPrev = (prev: PreviousSet | undefined, mode: ExerciseMode): string => {
  if (!prev) return '----';
  if (mode === 'weight') {
    const kg = prev.kg ?? 0;
    const reps = prev.reps ?? 0;
    if (kg === 0 && reps === 0) return '----';
    return `${kg}×${reps}`;
  }
  if (mode === 'bodyweight') {
    const reps = prev.reps ?? 0;
    if (reps === 0) return '----';
    return `×${reps}`;
  }
  if (mode === 'distance') {
    const meters = prev.meters ?? 0;
    const m = prev.minutes ?? 0;
    const s = prev.seconds ?? 0;
    if (meters === 0 && m === 0 && s === 0) return '----';
    const distPart = meters > 0 ? formatDistance(meters) : '';
    const timePart = m > 0 || s > 0 ? `${m}:${s.toString().padStart(2, '0')}` : '';
    return [distPart, timePart].filter(Boolean).join(' / ');
  }
  // timed
  const m = prev.minutes ?? 0;
  const s = prev.seconds ?? 0;
  const reps = prev.reps ?? 0;
  if (m === 0 && s === 0 && reps === 0) return '----';
  const timePart = m > 0 || s > 0 ? `${m}:${s.toString().padStart(2, '0')}` : '';
  const repsPart = reps > 0 ? `×${reps}` : '';
  return [timePart, repsPart].filter(Boolean).join(' ');
};

const MODES: ExerciseMode[] = ['weight', 'bodyweight', 'timed', 'distance'];
const MODE_LABELS: Record<ExerciseMode, string> = {
  weight: 'Weight',
  bodyweight: 'Bodyweight',
  timed: 'Timed',
  distance: 'Distance',
};

const WorkoutSection = forwardRef<WorkoutSectionHandle, Props>(function WorkoutSection(
  {
    value,
    onChange,
    onDelete,
    readonly = false,
    active = false,
    workoutName,
    onWorkoutNameChange,
    previousSets,
    exerciseMode,
    onExerciseModeChange,
    onSwap,
    linkedFromPrev = false,
    linkedToNext = false,
    highlightNextSet = true,
    workoutTitle,
  },
  ref
) {
  const { accent } = useAccent();
  const defaultRows: WorkoutRowData[] = [
    { sets: 1, kg: 0, reps: 0, done: false, minutes: 0, seconds: 0 },
    { sets: 2, kg: 0, reps: 0, done: false, minutes: 0, seconds: 0 },
    { sets: 3, kg: 0, reps: 0, done: false, minutes: 0, seconds: 0 },
  ];

  const isBlank = (r: WorkoutRowData) => r.kg === 0 && r.reps === 0 && !r.done;

  const [rows, setRows] = useState<WorkoutRowData[]>(() => {
    if (!Array.isArray(value) || value.length === 0) return assignSets(defaultRows);
    if (value.length === 1 && isBlank(value[0])) return assignSets(defaultRows);
    return assignSets(value);
  });

  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  useEffect(() => {
    if (!Array.isArray(value) || value.length === 0) return;
    if (value.length === 1 && isBlank(value[0])) return;
    if (value === rowsRef.current) return;
    setRows(assignSets(value));
  }, [value]);

  const [mode, setMode] = useState<ExerciseMode>(exerciseMode ?? 'weight');

  useEffect(() => {
    if (exerciseMode) setMode(exerciseMode);
  }, [exerciseMode]);

  const handleModeChange = (m: ExerciseMode) => {
    setMode(m);
    onExerciseModeChange?.(m);
  };

  const [repsModalVisible, setRepsModalVisible] = useState(false);
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [countdownVisible, setCountdownVisible] = useState(false);
  const [countdownDuration, setCountdownDuration] = useState(0);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [quickAdjust, setQuickAdjust] = useState<{ index: number; field: 'kg' | 'reps' } | null>(null);

  const openQuickAdjust = (index: number, field: 'kg' | 'reps') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setQuickAdjust({ index, field });
  };

  const saveQuickAdjust = (value: number) => {
    if (!quickAdjust) return;
    const copy = [...rows];
    copy[quickAdjust.index] = { ...copy[quickAdjust.index], [quickAdjust.field]: value };
    setRows(copy);
    onChange?.(copy);
  };
  const [selectedWorkout, setSelectedWorkout] = useState<string | null>(workoutName || null);

  useEffect(() => {
    setSelectedWorkout(workoutName || null);
  }, [workoutName]);

  const [workoutNameModalVisible, setWorkoutNameModalVisible] = useState(false);
  const [swapModalVisible, setSwapModalVisible] = useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');

  const handleSwapSelect = (name: string) => {
    const ex = findExercise(name);
    const newMode: ExerciseMode = ex?.mode ?? mode;
    onSwap?.(name, newMode);
    setSelectedWorkout(name);
    if (ex?.mode && ex.mode !== mode) {
      setMode(ex.mode);
    }
    setSwapModalVisible(false);
    setExerciseSearchQuery('');
  };

  const [nameError, setNameError] = useState(false);
  const [rowErrors, setRowErrors] = useState<boolean[]>([]);

  const rowViewRefs = useRef<(View | null)[]>([]);
  const firstInvalidIdxRef = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    validate(): boolean {
      let valid = true;
      let firstInvalid: number | null = null;

      const nameInvalid = !selectedWorkout || selectedWorkout.trim() === '';
      setNameError(nameInvalid);
      if (nameInvalid) {
        valid = false;
        firstInvalid = 0;
      }

      const errors = rows.map((row, i) => {
        let invalid = false;
        if (mode === 'weight') {
          invalid = row.kg === 0 && row.reps === 0;
        } else if (mode === 'bodyweight') {
          invalid = row.reps === 0;
        } else if (mode === 'distance') {
          invalid = (row.meters ?? 0) === 0 && (row.minutes ?? 0) === 0 && (row.seconds ?? 0) === 0;
        } else {
          invalid = (row.minutes ?? 0) === 0 && (row.seconds ?? 0) === 0 && row.reps === 0;
        }
        if (invalid) {
          valid = false;
          if (firstInvalid === null || i < firstInvalid) firstInvalid = i;
        }
        return invalid;
      });
      setRowErrors(errors);
      firstInvalidIdxRef.current = firstInvalid;

      return valid;
    },
    getFirstErrorView(): View | null {
      const i = firstInvalidIdxRef.current;
      if (i == null) return null;
      return rowViewRefs.current[i] ?? null;
    },
  }));

  useEffect(() => {
    setRowErrors([]);
    firstInvalidIdxRef.current = null;
  }, [rows.length]);

  const cellStyle = (readonly || active) ? { backgroundColor: 'transparent' } : {};

  const COLUMN_FLEX: Record<ExerciseMode, { sets: number; prev: number; mid: number; done: number }> = {
    weight:     { sets: 1.0, prev: 1.4, mid: 1.4, done: 1.0 },
    bodyweight: { sets: 1.0, prev: 1.2, mid: 2.0, done: 1.0 },
    timed:      { sets: 1.0, prev: 1.5, mid: 1.3, done: 1.0 },
    distance:   { sets: 1.0, prev: 1.4, mid: 1.9, done: 1.0 },
  };
  const cf = COLUMN_FLEX[mode];
  const setsFlex = cf.sets;
  const prevFlex = cf.prev;
  const midFlex  = cf.mid;
  const doneFlex = cf.done;

  const timedRows = useMemo<ExerciseRowBase[]>(
    () => rows.map(r => ({
      name: '',
      minutes: r.minutes ?? 0,
      seconds: r.seconds ?? 0,
      reps: r.reps,
      done: r.done,
    })),
    [rows]
  );

  const handleTimeUpdate = <K extends keyof ExerciseRowBase>(
    index: number, key: K, val: ExerciseRowBase[K]
  ) => {
    if (key === 'minutes' || key === 'seconds') {
      const copy = [...rows];
      copy[index] = { ...copy[index], [key]: val as number };
      setRows(copy);
      onChange?.(copy);
    }
  };

  const handleSelectWorkout = (name: string) => {
    setSelectedWorkout(name);
    setNameError(false);
    setWorkoutNameModalVisible(false);
    onWorkoutNameChange?.(name);
  };

  const handleMarkDone = (index: number) => {
    if (!active) return;
    const copy = [...rows];
    const markingDone = !copy[index].done;
    copy[index].done = markingDone;
    setRows(copy);
    onChange?.(copy);
    if (markingDone) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const isEditMode = !readonly && !active;
  const inSuperset = linkedFromPrev || linkedToNext;

  return (
    <View
      style={[
        styles.sectionContainer,
        inSuperset && {
          borderLeftWidth: 3,
          borderLeftColor: accent,
          paddingLeft: 10,
        },
      ]}
    >
      {/* Header row */}
      <View style={styles.sectionHeaderRow}>
        {isEditMode ? (
          <Pressable
            style={{ flexDirection: 'row', alignItems: 'center' }}
            onPress={() => setWorkoutNameModalVisible(true)}
          >
            <Text
              numberOfLines={1}
              style={[styles.sectionTitle, { color: accent, flexShrink: 1 }, nameError && { color: 'red' }]}
            >
              {selectedWorkout || 'Exercise *'}
            </Text>
            <Feather
              name="edit-2"
              size={18}
              color={nameError ? 'red' : colors.button2}
              style={{ marginLeft: 6 }}
            />
            {inSuperset && (
              <View
                style={{
                  paddingHorizontal: 4,
                  paddingVertical: 1,
                  borderRadius: 4,
                  backgroundColor: accent,
                  marginLeft: 6,
                  flexShrink: 0,
                }}
              >
                <Text style={{ color: colors.background, fontSize: 8, fontWeight: '800', letterSpacing: 0.4 }}>
                  SUPERSET
                </Text>
              </View>
            )}
          </Pressable>
        ) : (
          <Pressable
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
            onLongPress={active && onSwap ? () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setSwapModalVisible(true);
            } : undefined}
            delayLongPress={350}
          >
            <Text numberOfLines={1} style={[styles.sectionTitle, { color: accent, flexShrink: 1 }]}>{selectedWorkout || 'Workout'}</Text>
            {inSuperset && (
              <View
                style={{
                  paddingHorizontal: 4,
                  paddingVertical: 1,
                  borderRadius: 4,
                  backgroundColor: accent,
                  marginLeft: 6,
                  flexShrink: 0,
                }}
              >
                <Text style={{ color: colors.background, fontSize: 8, fontWeight: '800', letterSpacing: 0.4 }}>
                  SUPERSET
                </Text>
              </View>
            )}
          </Pressable>
        )}
        {nameError && (
          <Text style={{ color: 'red', fontSize: 11, marginLeft: 4 }}>Required</Text>
        )}
        {active && onSwap && (
          <Pressable
            onPress={() => setSwapModalVisible(true)}
            hitSlop={10}
            style={{ paddingHorizontal: 6, paddingVertical: 4 }}
            accessibilityLabel="Swap exercise"
          >
            <Feather name="more-vertical" size={20} color={colors.button1} />
          </Pressable>
        )}
        {isEditMode && onDelete && <DeleteButton onPress={onDelete} />}
      </View>

      {/* Mode toggle — edit mode only */}
      {isEditMode && (
        <View style={styles.modeToggle}>
          {MODES.map((m) => (
            <Pressable
              key={m}
              style={[styles.modePill, mode === m && [styles.modePillActive, { backgroundColor: accent }]]}
              onPress={() => handleModeChange(m)}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={[styles.modePillText, mode === m && styles.modePillTextActive]}
              >
                {MODE_LABELS[m]}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Column headers */}
      <View style={styles.headerRow}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.headerText, { flex: setsFlex }]}>Sets</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.headerText, { flex: prevFlex }]}>Prev</Text>
        {mode === 'weight'     && <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.headerText, { flex: midFlex }]}>Kg</Text>}
        {(mode === 'weight' || mode === 'bodyweight') && <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.headerText, { flex: midFlex }]}>Reps</Text>}
        {mode === 'timed'      && <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.headerText, { flex: midFlex }]}>Time</Text>}
        {mode === 'timed'      && <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.headerText, { flex: midFlex }]}>Reps</Text>}
        {mode === 'distance'   && <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.headerText, { flex: midFlex }]}>Distance</Text>}
        {mode === 'distance'   && <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.headerText, { flex: midFlex }]}>Time</Text>}
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={[styles.headerText, { flex: doneFlex }]}>Done</Text>
        {isEditMode && <Text style={[styles.headerText, { width: 24 }]} />}
      </View>

      {isEditMode && rows[0]?.sets !== 0 && (
        <Pressable
          style={({ pressed }) => [styles.addWarmupButton, pressed && { opacity: 0.6 }]}
          onPress={() => {
            const warmupRow: WorkoutRowData = { sets: 0, kg: 0, reps: 0, done: false, minutes: 0, seconds: 0 };
            const copy = assignSets([warmupRow, ...rows]);
            setRows(copy);
            onChange?.(copy);
          }}
        >
          <Text style={styles.addWarmupText}>+ W set</Text>
        </Pressable>
      )}

      {/* Rows */}
      {(() => {
        const activeRowIndex = (active && highlightNextSet) ? rows.findIndex(r => !r.done) : -1;
        return rows.map((row, index) => {
        const rowIsInvalid = rowErrors[index] === true;
        const isActiveRow = active && index === activeRowIndex;
        const prevLabel = formatPrev(previousSets?.[index], mode);
        const hasPrev = prevLabel !== '----';

        return (
          <View
            key={index}
            ref={(node) => { rowViewRefs.current[index] = node; }}
            style={[
              styles.inputRow,
              isActiveRow && { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 8 },
              rowIsInvalid && { borderWidth: 1, borderColor: 'red', borderRadius: 6 },
            ]}
          >
            {/* Sets */}
            <View style={[styles.inputCell, { flex: setsFlex }, cellStyle]}>
              <Text style={styles.inputText}>
                {row.sets === 0 ? 'W' : row.sets}
              </Text>
            </View>

            {/* Prev */}
            <View style={[styles.inputCell, { flex: prevFlex }, cellStyle]}>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[
                  styles.inputText,
                  hasPrev ? { color: colors.highlight } : { color: colors.button1 },
                ]}
              >
                {prevLabel}
              </Text>
            </View>

            {/* Kg — weight mode only */}
            {mode === 'weight' && (
              isEditMode ? (
                <TextInput
                  style={[
                    styles.inputCell,
                    styles.inputText,
                    { flex: midFlex, textAlign: 'center', textAlignVertical: 'center', padding: 0 },
                    rowIsInvalid && { color: 'red' },
                  ]}
                  keyboardType="numeric"
                  maxLength={3}
                  value={row.kg === 0 ? '' : row.kg.toString()}
                  placeholder="0"
                  placeholderTextColor={rowIsInvalid ? 'red' : '#999'}
                  onChangeText={(text) => {
                    const val = parseInt(text) || 0;
                    const copy = [...rows];
                    copy[index].kg = val;
                    setRows(copy);
                    onChange?.(copy);
                    if (val > 0 || copy[index].reps > 0) {
                      setRowErrors((prev) => {
                        const next = [...prev];
                        next[index] = false;
                        return next;
                      });
                    }
                  }}
                />
              ) : active ? (
                <Pressable
                  style={[styles.inputCell, { flex: midFlex }, cellStyle]}
                  onPress={() => openQuickAdjust(index, 'kg')}
                  onLongPress={() => openQuickAdjust(index, 'kg')}
                  delayLongPress={250}
                >
                  <Text style={styles.inputText}>{row.kg}</Text>
                </Pressable>
              ) : (
                <View style={[styles.inputCell, { flex: midFlex }, cellStyle]}>
                  <Text style={styles.inputText}>{row.kg}</Text>
                </View>
              )
            )}

            {/* Reps — weight + bodyweight */}
            {(mode === 'weight' || mode === 'bodyweight') && (
              isEditMode ? (
                isWeb ? (
                  <TextInput
                    style={[
                      styles.inputCell,
                      styles.inputText,
                      { flex: midFlex, textAlign: 'center', textAlignVertical: 'center', padding: 0 },
                      rowIsInvalid && row.reps === 0 && { color: 'red' },
                    ]}
                    keyboardType="numeric"
                    maxLength={3}
                    value={row.reps === 0 ? '' : row.reps.toString()}
                    placeholder="0"
                    placeholderTextColor={rowIsInvalid && row.reps === 0 ? 'red' : '#999'}
                    onChangeText={(text) => {
                      const val = parseInt(text) || 0;
                      const copy = [...rows];
                      copy[index].reps = val;
                      setRows(copy);
                      onChange?.(copy);
                      if (val > 0 || copy[index].kg > 0) {
                        setRowErrors((prev) => {
                          const next = [...prev];
                          next[index] = false;
                          return next;
                        });
                      }
                    }}
                  />
                ) : (
                  <Pressable
                    style={[styles.inputCell, { flex: midFlex }]}
                    onPress={() => {
                      setSelectedRowIndex(index);
                      setRepsModalVisible(true);
                    }}
                  >
                    <Text style={[
                      styles.inputText,
                      rowIsInvalid && row.reps === 0 && { color: 'red' },
                    ]}>
                      {row.reps}
                    </Text>
                  </Pressable>
                )
              ) : active ? (
                <Pressable
                  style={[styles.inputCell, { flex: midFlex }, cellStyle]}
                  onPress={() => openQuickAdjust(index, 'reps')}
                  onLongPress={() => openQuickAdjust(index, 'reps')}
                  delayLongPress={250}
                >
                  <Text style={styles.inputText}>{row.reps}</Text>
                </Pressable>
              ) : (
                <View style={[styles.inputCell, { flex: midFlex }, cellStyle]}>
                  <Text style={styles.inputText}>{row.reps}</Text>
                </View>
              )
            )}

            {/* Distance + Time — distance mode only */}
            {mode === 'distance' && (
              isEditMode ? (
                <TextInput
                  style={[
                    styles.inputCell,
                    styles.inputText,
                    { flex: midFlex, textAlign: 'center', textAlignVertical: 'center', padding: 0 },
                    rowIsInvalid && { color: 'red' },
                  ]}
                  keyboardType="numeric"
                  maxLength={5}
                  value={(row.meters ?? 0) === 0 ? '' : (row.meters ?? 0).toString()}
                  placeholder="0m"
                  placeholderTextColor={rowIsInvalid ? 'red' : '#999'}
                  onChangeText={(text) => {
                    const val = parseInt(text) || 0;
                    const copy = [...rows];
                    copy[index] = { ...copy[index], meters: val };
                    setRows(copy);
                    onChange?.(copy);
                    if (val > 0 || (copy[index].minutes ?? 0) > 0 || (copy[index].seconds ?? 0) > 0) {
                      setRowErrors((prev) => {
                        const next = [...prev];
                        next[index] = false;
                        return next;
                      });
                    }
                  }}
                />
              ) : (
                <View style={[styles.inputCell, { flex: midFlex }, cellStyle]}>
                  <Text style={styles.inputText}>
                    {(row.meters ?? 0) > 0 ? formatDistance(row.meters ?? 0) : '0m'}
                  </Text>
                </View>
              )
            )}

            {mode === 'distance' && (
              isEditMode ? (
                <Pressable
                  style={[styles.inputCell, { flex: midFlex }]}
                  onPress={() => {
                    setSelectedRowIndex(index);
                    setTimeModalVisible(true);
                  }}
                >
                  <Text style={[
                    styles.inputText,
                    rowIsInvalid && (row.meters ?? 0) === 0 && (row.minutes ?? 0) === 0 && (row.seconds ?? 0) === 0 && { color: 'red' },
                  ]}>
                    {(row.minutes ?? 0).toString().padStart(2, '0')}:{(row.seconds ?? 0).toString().padStart(2, '0')}
                  </Text>
                </Pressable>
              ) : (
                <View style={[styles.inputCell, { flex: midFlex }, cellStyle]}>
                  <Text style={styles.inputText}>
                    {(row.minutes ?? 0).toString().padStart(2, '0')}:{(row.seconds ?? 0).toString().padStart(2, '0')}
                  </Text>
                </View>
              )
            )}

            {/* Duration — timed mode only */}
            {mode === 'timed' && (
              isEditMode ? (
                <Pressable
                  style={[styles.inputCell, { flex: midFlex }]}
                  onPress={() => {
                    setSelectedRowIndex(index);
                    setTimeModalVisible(true);
                  }}
                >
                  <Text style={[
                    styles.inputText,
                    rowIsInvalid && (row.minutes ?? 0) === 0 && (row.seconds ?? 0) === 0 && row.reps === 0 && { color: 'red' },
                  ]}>
                    {(row.minutes ?? 0).toString().padStart(2, '0')}:{(row.seconds ?? 0).toString().padStart(2, '0')}
                  </Text>
                </Pressable>
              ) : active ? (
                <Pressable
                  style={[styles.inputCell, { flex: midFlex }, cellStyle]}
                  onPress={() => {
                    setCountdownDuration((row.minutes ?? 0) * 60 + (row.seconds ?? 0));
                    setCountdownVisible(true);
                  }}
                >
                  <Text style={styles.inputText}>
                    {(row.minutes ?? 0).toString().padStart(2, '0')}:{(row.seconds ?? 0).toString().padStart(2, '0')}
                  </Text>
                </Pressable>
              ) : (
                <View style={[styles.inputCell, { flex: midFlex }, cellStyle]}>
                  <Text style={styles.inputText}>
                    {(row.minutes ?? 0).toString().padStart(2, '0')}:{(row.seconds ?? 0).toString().padStart(2, '0')}
                  </Text>
                </View>
              )
            )}

            {/* Reps — timed mode */}
            {mode === 'timed' && (
              isEditMode ? (
                <Pressable
                  style={[styles.inputCell, { flex: midFlex }]}
                  onPress={() => {
                    setSelectedRowIndex(index);
                    setRepsModalVisible(true);
                  }}
                >
                  <Text style={[
                    styles.inputText,
                    rowIsInvalid && row.reps === 0 && (row.minutes ?? 0) === 0 && (row.seconds ?? 0) === 0 && { color: 'red' },
                  ]}>
                    {row.reps}
                  </Text>
                </Pressable>
              ) : (
                <View style={[styles.inputCell, { flex: midFlex }, cellStyle]}>
                  <Text style={styles.inputText}>{row.reps}</Text>
                </View>
              )
            )}

            {/* Done */}
            <Pressable
              style={[
                styles.doneButton,
                { flex: doneFlex },
                row.done && [styles.doneButtonActive, { backgroundColor: accent + '1F' }],
                !active && { opacity: 0.3 },
              ]}
              onPress={() => handleMarkDone(index)}
              disabled={!active}
            >
              {row.done ? (
                <Feather name="check-circle" size={20} color={accent} />
              ) : (
                <Feather name="circle" size={20} color={colors.button1} />
              )}
            </Pressable>

            {/* Delete row — hidden when only one row would remain */}
            {isEditMode && rows.length > 1 && (
              <Pressable
                style={styles.smallDeleteButton}
                onPress={() => {
                  const filtered = rows.filter((_, i) => i !== index);
                  const updated = assignSets(filtered);
                  setRows(updated);
                  onChange?.(updated);
                }}
              >
                <Text style={styles.smallDeleteText}>×</Text>
              </Pressable>
            )}
          </View>
        );
      });
      })()}

      {isEditMode && (
        <AddExerciseButton
          onPress={() => {
            const newRow: WorkoutRowData = { sets: 0, kg: 0, reps: 0, done: false, minutes: 0, seconds: 0 };
            const copy = assignSets([...rows, newRow]);
            setRows(copy);
            onChange?.(copy);
          }}
        />
      )}

      <RepsModal
        visible={repsModalVisible}
        selectedRowIndex={selectedRowIndex}
        exercises={rows}
        onUpdate={(index, key, value) => {
          const copy = [...rows];
          copy[index][key] = value;
          setRows(copy);
          onChange?.(copy);
        }}
        onClose={() => setRepsModalVisible(false)}
      />

      <TimePickerModal
        visible={timeModalVisible}
        selectedRowIndex={selectedRowIndex}
        exercises={timedRows}
        onUpdate={handleTimeUpdate}
        onClose={() => setTimeModalVisible(false)}
      />

      {isEditMode && (
        <ExercisePickerModal
          visible={workoutNameModalVisible}
          searchQuery={exerciseSearchQuery}
          onSearchChange={setExerciseSearchQuery}
          selectedRowIndex={0}
          onSelect={(_index, _key, value) => handleSelectWorkout(value as string)}
          onClose={() => {
            setExerciseSearchQuery('');
            setWorkoutNameModalVisible(false);
          }}
          excludeSections={['Warm Up']}
          workoutContext={workoutTitle}
        />
      )}

      {active && onSwap && (
        <ExercisePickerModal
          visible={swapModalVisible}
          searchQuery={exerciseSearchQuery}
          onSearchChange={setExerciseSearchQuery}
          selectedRowIndex={0}
          onSelect={(_index, _key, value) => handleSwapSelect(value as string)}
          onClose={() => {
            setExerciseSearchQuery('');
            setSwapModalVisible(false);
          }}
          title="Swap Exercise"
          workoutContext={workoutTitle}
        />
      )}

      <RestTimerModal
        visible={countdownVisible}
        durationSeconds={countdownDuration}
        onDismiss={() => setCountdownVisible(false)}
      />

      <QuickAdjustModal
        visible={quickAdjust !== null}
        title={quickAdjust?.field === 'kg' ? 'Adjust kg' : 'Adjust reps'}
        unit={quickAdjust?.field === 'kg' ? 'kg' : undefined}
        initialValue={
          quickAdjust
            ? (quickAdjust.field === 'kg' ? rows[quickAdjust.index]?.kg : rows[quickAdjust.index]?.reps) ?? 0
            : 0
        }
        steps={quickAdjust?.field === 'kg' ? [-5, 5] : [-1, 1]}
        min={0}
        max={quickAdjust?.field === 'kg' ? 999 : 100}
        onSave={saveQuickAdjust}
        onClose={() => setQuickAdjust(null)}
      />
    </View>
  );
});

export default WorkoutSection;
