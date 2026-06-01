// src/components/features/workout/PhaseSection/index.tsx

import React, { useState, useEffect, useMemo, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Modal } from 'react-native';
import * as Haptics from 'expo-haptics';
import DeleteButton from '../../../ui/DeleteButton';
import AddExerciseButton from '../../../ui/AddExerciseButton';
import { colors } from '../../../../theme/colors';
import { useAccent } from '../../../../services/SettingsContext';
import { Feather } from '@expo/vector-icons';
import { ExerciseRowBase, PhaseRowMode } from '../../../../types/exercise';
import { getDefaultRowForCategory } from '../../../../constants/workoutData';
import { styles } from '../Shared/SharedStyles';
import TimePickerModal from '../Shared/TimePickModal';
import RepsModal from '../Shared/RepsModal';
import PhaseExercisePickerModal from '../Shared/PhaseExercisePickerModal';
import PhaseCategoryModal from '../Shared/PhaseCategoryModal';
import RestTimerModal from '../../RestTimerModal';

export type PhaseKind = 'warmup' | 'cooldown';

// Imperative API exposed to CreateWorkoutScreen so it can validate the phase
// before saving and scroll to the first invalid row's view.
export type PhaseSectionHandle = {
  validate: () => boolean;
  getFirstErrorView: () => View | null;
};

type PhaseConfig = {
  title: string;
  emptyNamePlaceholder: string;
};

const PHASE_CONFIG: Record<PhaseKind, PhaseConfig> = {
  warmup:   { title: 'Warm Up',  emptyNamePlaceholder: 'Select exercise' },
  cooldown: { title: 'Cooldown', emptyNamePlaceholder: 'Select exercise' },
};

const MODE_ICON: Record<PhaseRowMode, keyof typeof Feather.glyphMap> = {
  timed: 'clock',
  reps: 'repeat',
  distance: 'navigation',
};

// Backwards-compat: rows saved before `mode` existed get a sensible default
// inferred from which fields they populated.
function inferMode(row: ExerciseRowBase): PhaseRowMode {
  if (row.mode) return row.mode;
  if ((row.meters ?? 0) > 0) return 'distance';
  if (row.reps > 0 && row.minutes === 0 && row.seconds === 0) return 'reps';
  return 'timed';
}

function formatDistance(m: number): string {
  if (m <= 0) return '0m';
  if (m >= 1000) return `${(m / 1000).toFixed(1)}km`;
  return `${m}m`;
}

function formatTime(m: number, s: number): string {
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function normalizeRows(rows: ExerciseRowBase[]): ExerciseRowBase[] {
  return rows.map((r) => (r.mode ? r : { ...r, mode: inferMode(r) }));
}

// Phase total: sum the planned duration of timed rows. Reps rows contribute 0
// to the timeline; surfaced as a separate count.
function computePhaseSummary(rows: ExerciseRowBase[]) {
  let totalSeconds = 0;
  let repsRows = 0;
  for (const r of rows) {
    const mode = inferMode(r);
    if (mode === 'timed') totalSeconds += (r.minutes ?? 0) * 60 + (r.seconds ?? 0);
    else if (mode === 'reps') repsRows += 1;
  }
  return { totalSeconds, repsRows };
}

function formatPhaseTotal(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

// A group of rows sharing a single category label.
type SectionGroup = {
  category: string | undefined;
  rows: ExerciseRowBase[];
  startIndex: number;
};

function computeSections(rows: ExerciseRowBase[]): SectionGroup[] {
  if (rows.length === 0) return [{ category: undefined, rows: [], startIndex: 0 }];
  const result: SectionGroup[] = [];
  let current: SectionGroup = { category: rows[0].sectionCategory, rows: [], startIndex: 0 };
  for (let i = 0; i < rows.length; i++) {
    if (i > 0 && rows[i].sectionCategory !== undefined) {
      result.push(current);
      current = { category: rows[i].sectionCategory, rows: [], startIndex: i };
    }
    current.rows.push(rows[i]);
  }
  result.push(current);
  return result;
}

type Props = {
  phase: PhaseKind;
  value?: ExerciseRowBase[];
  onChange?: (data: ExerciseRowBase[]) => void;
  onDelete?: () => void;
  readonly?: boolean;
  active?: boolean;
};

const PhaseSection = forwardRef<PhaseSectionHandle, Props>(function PhaseSection({
  phase,
  value,
  onChange,
  onDelete,
  readonly,
  active = false,
}, ref) {
  const { accent } = useAccent();
  const config = PHASE_CONFIG[phase];

  const [exercises, setExercises] = useState<ExerciseRowBase[]>(() =>
    Array.isArray(value) && value.length > 0
      ? normalizeRows(value)
      : [getDefaultRowForCategory(undefined)]
  );

  useEffect(() => {
    if (Array.isArray(value)) setExercises(normalizeRows(value));
  }, [value]);

  // Latest exercises always available to setTimeout callbacks that capture
  // stale closures.
  const exercisesRef = useRef(exercises);
  useEffect(() => { exercisesRef.current = exercises; }, [exercises]);

  const [modalVisible, setModalVisible] = useState(false);
  const [repsModalVisible, setRepsModalVisible] = useState(false);
  const [countdownVisible, setCountdownVisible] = useState(false);
  const [countdownDuration, setCountdownDuration] = useState(0);
  const [countdownLabel, setCountdownLabel] = useState('');
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [addSectionModalVisible, setAddSectionModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [pickerDefaultCategory, setPickerDefaultCategory] = useState<string | undefined>(undefined);

  // Long-press popup for changing a row's mode. Null = closed.
  const [modePopupRowIdx, setModePopupRowIdx] = useState<number | null>(null);

  // Info popup explaining how the long-press mode toggle works.
  const [infoVisible, setInfoVisible] = useState(false);

  // Per-row validation errors. Populated only when `validate()` is called by
  // CreateWorkoutScreen on save; cleared as the user edits the offending cell.
  const [nameErrors, setNameErrors] = useState<boolean[]>([]);
  const [valueErrors, setValueErrors] = useState<boolean[]>([]);

  // Refs to each rendered row's outer View so the parent can scroll precisely
  // to the first invalid row after validate().
  const rowViewRefs = useRef<(View | null)[]>([]);
  const firstInvalidIdxRef = useRef<number | null>(null);

  const sections = useMemo(() => computeSections(exercises), [exercises]);
  const phaseSummary = useMemo(() => computePhaseSummary(exercises), [exercises]);

  // First-undone row index — drives the next-row highlight during active mode.
  const nextUndoneIndex = useMemo(
    () => (active ? exercises.findIndex(r => !r.done) : -1),
    [active, exercises]
  );

  const isEditMode = !readonly && !active;

  // Reset all errors when row count changes — add/delete invalidates indexing.
  useEffect(() => {
    setNameErrors([]);
    setValueErrors([]);
  }, [exercises.length]);

  // Imperative validate() — runs on Save in CreateWorkoutScreen.
  useImperativeHandle(ref, () => ({
    validate(): boolean {
      let valid = true;
      let firstInvalid: number | null = null;
      const nameErrs = exercisesRef.current.map((r, i) => {
        const empty = !r.name || r.name.trim() === '';
        if (empty) {
          valid = false;
          if (firstInvalid === null) firstInvalid = i;
        }
        return empty;
      });
      const valueErrs = exercisesRef.current.map((r, i) => {
        const m = r.mode ?? inferMode(r);
        let invalid = false;
        if (m === 'timed') invalid = (r.minutes ?? 0) === 0 && (r.seconds ?? 0) === 0;
        else if (m === 'reps') invalid = (r.reps ?? 0) === 0;
        else if (m === 'distance') invalid = (r.meters ?? 0) === 0;
        if (invalid) {
          valid = false;
          if (firstInvalid === null || i < firstInvalid) firstInvalid = i;
        }
        return invalid;
      });
      setNameErrors(nameErrs);
      setValueErrors(valueErrs);
      firstInvalidIdxRef.current = firstInvalid;
      return valid;
    },
    getFirstErrorView(): View | null {
      const i = firstInvalidIdxRef.current;
      if (i == null) return null;
      return rowViewRefs.current[i] ?? null;
    },
  }));

  // ── Mutation helpers (spread-the-row to avoid shared-reference bugs).
  // Read latest exercises via exercisesRef so we can compute the new array
  // synchronously OUTSIDE the setExercises updater — calling onChange inside
  // the updater would trigger a parent setState during this component's
  // render, which React forbids.
  const updateRow = useCallback(<K extends keyof ExerciseRowBase>(
    index: number,
    key: K,
    newValue: ExerciseRowBase[K]
  ) => {
    const prev = exercisesRef.current;
    const next = [...prev];
    next[index] = { ...next[index], [key]: newValue };
    setExercises(next);
    onChange?.(next);
    // Clear the value error for this row as soon as the user touches a value
    // field. (Mode flips don't clear — the new mode may still be invalid.)
    if (key === 'minutes' || key === 'seconds' || key === 'reps' || key === 'meters') {
      setValueErrors(curr => {
        if (!curr[index]) return curr;
        const updated = [...curr];
        updated[index] = false;
        return updated;
      });
    }
  }, [onChange]);

  const setRowDone = useCallback((index: number, done: boolean) => {
    const prev = exercisesRef.current;
    const next = [...prev];
    next[index] = { ...next[index], done };
    setExercises(next);
    onChange?.(next);
  }, [onChange]);

  const handleAddRowToSection = (sectionIdx: number) => {
    const section = sections[sectionIdx];
    const insertAt = section.startIndex + section.rows.length;
    const newRow = getDefaultRowForCategory(section.category || undefined);
    const copy = [
      ...exercises.slice(0, insertAt),
      { ...newRow, sectionCategory: undefined },
      ...exercises.slice(insertAt),
    ];
    setExercises(copy);
    onChange?.(copy);
  };

  const handleAddSection = (category: string | null) => {
    const sectionCategory = category ?? '';
    const newRow = getDefaultRowForCategory(category || undefined);
    const copy = [...exercises, { ...newRow, sectionCategory }];
    setExercises(copy);
    onChange?.(copy);
    setAddSectionModalVisible(false);
  };

  const handleDeleteRow = (globalIndex: number) => {
    if (exercises.length <= 1) return;
    const copy = [...exercises];
    if (globalIndex > 0 && copy[globalIndex].sectionCategory !== undefined) {
      const nextIdx = globalIndex + 1;
      if (nextIdx < copy.length && copy[nextIdx].sectionCategory === undefined) {
        copy[nextIdx] = { ...copy[nextIdx], sectionCategory: copy[globalIndex].sectionCategory };
      }
    }
    const filtered = copy.filter((_, i) => i !== globalIndex);
    setExercises(filtered);
    onChange?.(filtered);
  };

  const handleDeleteSection = (sectionIdx: number) => {
    const section = sections[sectionIdx];
    const filtered = exercises.filter(
      (_, i) => i < section.startIndex || i >= section.startIndex + section.rows.length
    );
    setExercises(filtered);
    onChange?.(filtered);
  };

  const handleMarkDone = (index: number) => {
    if (!active) return;
    const markingDone = !exercises[index].done;
    setRowDone(index, markingDone);
    if (markingDone) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Open the rest-timer modal with the row's planned duration.
  const handleStartTimedRow = (row: ExerciseRowBase) => {
    const seconds = (row.minutes ?? 0) * 60 + (row.seconds ?? 0);
    if (seconds <= 0) return;
    setCountdownDuration(seconds);
    setCountdownLabel((row.name || config.title).toUpperCase());
    setCountdownVisible(true);
  };

  const handleSelectPhaseExercise = (rowIndex: number, name: string, mode: PhaseRowMode) => {
    const prev = exercisesRef.current;
    const next = [...prev];
    next[rowIndex] = { ...next[rowIndex], name, mode };
    setExercises(next);
    onChange?.(next);
    setNameErrors(curr => {
      if (!curr[rowIndex]) return curr;
      const updated = [...curr];
      updated[rowIndex] = false;
      return updated;
    });
  };

  const handleDistanceChange = (index: number, text: string) => {
    const val = parseInt(text) || 0;
    updateRow(index, 'meters', val);
  };

  const openExercisePicker = (globalIndex: number, sectionCategory: string | undefined) => {
    setSelectedRowIndex(globalIndex);
    setPickerDefaultCategory(sectionCategory || undefined);
    setExerciseModalVisible(true);
  };

  const handleTimerDismiss = () => {
    setCountdownVisible(false);
  };

  const cellBackground = (readonly || active) ? 'transparent' : colors.background;

  const renderValueCell = (row: ExerciseRowBase, index: number, hasError: boolean) => {
    const mode = row.mode ?? inferMode(row);
    const valueCellStyle = [
      styles.timePickerButton,
      { flex: 1.3, backgroundColor: cellBackground, height: undefined, minHeight: 30 },
      hasError && { borderWidth: 1, borderColor: '#FF6B6B' },
    ];
    const valueTextStyle = [
      styles.inputText,
      hasError && { color: '#FF6B6B' },
    ];

    if (mode === 'timed') {
      return (
        <Pressable
          style={valueCellStyle}
          onPress={
            isEditMode
              ? () => { setSelectedRowIndex(index); setModalVisible(true); }
              : active
              ? () => handleStartTimedRow(row)
              : undefined
          }
          accessibilityLabel={active ? 'Start timer' : undefined}
        >
          <Text style={valueTextStyle}>{formatTime(row.minutes, row.seconds)}</Text>
        </Pressable>
      );
    }

    if (mode === 'reps') {
      return (
        <Pressable
          style={valueCellStyle}
          onPress={isEditMode
            ? () => { setSelectedRowIndex(index); setRepsModalVisible(true); }
            : undefined
          }
        >
          <Text style={valueTextStyle}>{`${row.reps}×`}</Text>
        </Pressable>
      );
    }

    // distance
    if (isEditMode) {
      return (
        <TextInput
          style={[
            styles.timePickerButton,
            styles.inputText,
            { flex: 1.3, textAlign: 'center', backgroundColor: cellBackground, height: undefined, minHeight: 30 },
            hasError && { borderWidth: 1, borderColor: '#FF6B6B', color: '#FF6B6B' },
          ]}
          keyboardType="numeric"
          maxLength={5}
          value={(row.meters ?? 0) === 0 ? '' : (row.meters ?? 0).toString()}
          placeholder="0m"
          placeholderTextColor={hasError ? '#FF6B6B' : '#999'}
          onChangeText={(text) => handleDistanceChange(index, text)}
        />
      );
    }
    return (
      <View style={valueCellStyle}>
        <Text style={valueTextStyle}>{formatDistance(row.meters ?? 0)}</Text>
      </View>
    );
  };

  const isMultiSection = sections.length > 1;

  const phaseTotalLabel = (() => {
    const { totalSeconds, repsRows } = phaseSummary;
    if (totalSeconds === 0 && repsRows === 0) return '';
    if (totalSeconds === 0) return `${repsRows} sets`;
    if (repsRows === 0) return formatPhaseTotal(totalSeconds);
    return `${formatPhaseTotal(totalSeconds)} · ${repsRows} sets`;
  })();

  return (
    <View style={[styles.sectionContainer, { padding: 8 }]}>
      {/* Phase title + duration summary + active-mode controls + delete */}
      <View style={styles.sectionHeaderRow}>
        <View style={phaseStyles.titleWrap}>
          <Text style={[styles.sectionTitle, { color: accent }]}>{config.title}</Text>
          {phaseTotalLabel.length > 0 && (
            <Text style={phaseStyles.summaryText}>{phaseTotalLabel}</Text>
          )}
          {isEditMode && (
            <Pressable
              onPress={() => setInfoVisible(true)}
              hitSlop={10}
              accessibilityLabel="How this phase works"
              style={phaseStyles.infoBtn}
            >
              <Feather name="info" size={13} color={colors.button1} />
            </Pressable>
          )}
        </View>

        {isEditMode && onDelete && <DeleteButton onPress={onDelete} />}
      </View>

      {/* Column headers — Mode and Exercise are nudged right so they align
          visually with the Sets/Exercise columns of MainWorkout sections. */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerText, { width: 40, marginLeft: 12, marginRight: 10 }]}>Mode</Text>
        <Text style={[styles.headerText, { flex: 1.3, marginLeft: 6, marginRight: 2 }]}>Exercise</Text>
        <Text style={[styles.headerText, { flex: 1.3, marginHorizontal: 2 }]}>Value</Text>
        <Text style={[styles.headerText, { flex: 0.9, marginHorizontal: 2 }]}>Done</Text>
        {isEditMode && <Text style={{ width: 24 }} />}
      </View>

      {/* Sections — each category badge sits ABOVE its bordered container,
          so the label tags the group rather than living inside it. */}
      {sections.map((section, sectionIdx) => (
        <View
          key={`section-${sectionIdx}`}
          style={sectionIdx === 0 ? { marginTop: 8 } : undefined}
        >
          {section.category ? (
            <View style={[categoryLabelStyle.wrap, { backgroundColor: accent }]}>
              <Text style={categoryLabelStyle.text}>{section.category}</Text>
            </View>
          ) : null}

          <View style={sectionStyles.sectionGroup}>
            {isMultiSection && isEditMode && (
              <View style={sectionStyles.subHeader}>
                <View />
                <Pressable
                  style={sectionStyles.deleteSectionBtn}
                  onPress={() => handleDeleteSection(sectionIdx)}
                  accessibilityLabel={`Remove ${section.category || 'section'}`}
                >
                  <Feather name="trash-2" size={13} color={colors.button2} />
                </Pressable>
              </View>
            )}

          {section.rows.map((row, localIdx) => {
            const globalIdx = section.startIndex + localIdx;
            const mode = row.mode ?? inferMode(row);
            const isNextUp = nextUndoneIndex === globalIdx;

            return (
              <View
                key={`exercise-${globalIdx}`}
                ref={(node) => { rowViewRefs.current[globalIdx] = node; }}
                style={[
                  styles.inputRow,
                  { marginTop: 6, alignItems: 'stretch' },
                  isNextUp && phaseStyles.nextUpRow,
                  row.done && { opacity: 0.55 },
                ]}
              >
                {/* Mode icon — long-press in edit mode to choose; static in active/readonly */}
                {isEditMode ? (
                  <Pressable
                    style={[phaseStyles.modeButton, { backgroundColor: cellBackground }]}
                    onLongPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setModePopupRowIdx(globalIdx);
                    }}
                    delayLongPress={280}
                    accessibilityLabel={`Row mode: ${mode}. Long-press to change.`}
                    hitSlop={8}
                  >
                    <Feather name={MODE_ICON[mode]} size={14} color={colors.button1} />
                  </Pressable>
                ) : (
                  <View style={[phaseStyles.modeButton, { backgroundColor: cellBackground }]}>
                    <Feather name={MODE_ICON[mode]} size={14} color={colors.button1} />
                  </View>
                )}

                {readonly || active ? (
                  <Text
                    style={[
                      styles.exerciseInput,
                      { flex: 1.3, backgroundColor: cellBackground, height: undefined, minHeight: 30, textTransform: 'uppercase', fontSize: 11, fontWeight: '600', color: colors.highlight },
                    ]}
                  >
                    {row.name}
                  </Text>
                ) : (
                  <Pressable
                    style={[
                      styles.exerciseInput,
                      { flex: 1.3, backgroundColor: cellBackground, justifyContent: 'center', height: undefined, minHeight: 30 },
                      nameErrors[globalIdx] && { borderWidth: 1, borderColor: '#FF6B6B' },
                    ]}
                    onPress={() => openExercisePicker(globalIdx, section.category)}
                    accessibilityLabel={row.name ? `Change exercise from ${row.name}` : 'Pick exercise'}
                  >
                    <Text style={[
                      styles.inputText,
                      { textTransform: 'uppercase', fontSize: 11, fontWeight: '600', color: colors.highlight },
                      nameErrors[globalIdx] && { color: '#FF6B6B' },
                    ]}>
                      {row.name || config.emptyNamePlaceholder}
                    </Text>
                  </Pressable>
                )}

                {renderValueCell(row, globalIdx, valueErrors[globalIdx] === true)}

                <Pressable
                  style={[
                    styles.doneButton,
                    { flex: 0.9, height: undefined, minHeight: 30 },
                    row.done && [styles.doneButtonActive, { backgroundColor: accent + '1F' }],
                    !active && { opacity: 0.3 },
                  ]}
                  onPress={() => handleMarkDone(globalIdx)}
                  disabled={!active}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: row.done }}
                  accessibilityLabel={`Mark ${row.name || 'row'} ${row.done ? 'not done' : 'done'}`}
                >
                  {row.done ? (
                    <Feather name="check-circle" size={20} color={accent} />
                  ) : (
                    <Feather name="circle" size={20} color={colors.button1} />
                  )}
                </Pressable>

                {isEditMode && exercises.length > 1 && (
                  <Pressable
                    style={[styles.smallDeleteButton, { alignSelf: 'center' }]}
                    onPress={() => handleDeleteRow(globalIdx)}
                    accessibilityLabel="Remove row"
                    hitSlop={6}
                  >
                    <Text style={styles.smallDeleteText}>×</Text>
                  </Pressable>
                )}
              </View>
            );
          })}

            {isEditMode && <AddExerciseButton onPress={() => handleAddRowToSection(sectionIdx)} />}
          </View>
        </View>
      ))}

      {isEditMode && (
        <Pressable
          style={[sectionStyles.addSectionBtn, { borderColor: accent }]}
          onPress={() => setAddSectionModalVisible(true)}
        >
          <Feather name="plus" size={14} color={accent} />
          <Text style={[sectionStyles.addSectionText, { color: accent }]}>Add Section</Text>
        </Pressable>
      )}

      <RestTimerModal
        visible={countdownVisible}
        durationSeconds={countdownDuration}
        title={countdownLabel}
        onDismiss={handleTimerDismiss}
      />

      <PhaseCategoryModal
        visible={addSectionModalVisible}
        phase={phase}
        onSelect={handleAddSection}
        onClose={() => setAddSectionModalVisible(false)}
      />

      <PhaseExercisePickerModal
        visible={exerciseModalVisible}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedRowIndex={selectedRowIndex}
        onSelectExercise={handleSelectPhaseExercise}
        onClose={() => { setSearchQuery(''); setExerciseModalVisible(false); }}
        defaultCategory={pickerDefaultCategory}
      />

      <TimePickerModal
        visible={modalVisible}
        selectedRowIndex={selectedRowIndex}
        exercises={exercises}
        onUpdate={updateRow}
        onClose={() => setModalVisible(false)}
      />

      <RepsModal
        visible={repsModalVisible}
        selectedRowIndex={selectedRowIndex}
        exercises={exercises}
        onUpdate={updateRow}
        onClose={() => setRepsModalVisible(false)}
      />

      <ModePopup
        visible={modePopupRowIdx !== null}
        current={
          modePopupRowIdx !== null && exercises[modePopupRowIdx]
            ? (exercises[modePopupRowIdx].mode ?? inferMode(exercises[modePopupRowIdx]))
            : 'timed'
        }
        onSelect={(m) => {
          if (modePopupRowIdx !== null) updateRow(modePopupRowIdx, 'mode', m);
        }}
        onClose={() => setModePopupRowIdx(null)}
      />

      <InfoPopup visible={infoVisible} onClose={() => setInfoVisible(false)} />
    </View>
  );
});

export default PhaseSection;

function InfoPopup({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { accent } = useAccent();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={popupStyles.overlay} onPress={onClose}>
        <Pressable style={popupStyles.card} onPress={() => { /* swallow */ }}>
          <Text style={popupStyles.title}>How it works</Text>

          <View style={infoStyles.tipRow}>
            <Feather name="clock" size={16} color={accent} style={infoStyles.tipIcon} />
            <Text style={infoStyles.tipText}>
              Each row tracks one of three modes: <Text style={infoStyles.bold}>Time</Text>,{' '}
              <Text style={infoStyles.bold}>Reps</Text>, or <Text style={infoStyles.bold}>Distance</Text>.
            </Text>
          </View>

          <View style={infoStyles.tipRow}>
            <Feather name="zap" size={16} color={accent} style={infoStyles.tipIcon} />
            <Text style={infoStyles.tipText}>
              <Text style={infoStyles.bold}>Long-press</Text> the icon on the left of any row to switch its mode.
              Pick one from the popup and the row updates immediately.
            </Text>
          </View>

          <Pressable style={[infoStyles.closeBtn, { backgroundColor: accent }]} onPress={onClose} accessibilityLabel="Close info">
            <Text style={infoStyles.closeText}>Got it</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Long-press popup for selecting a row's mode. Three large pills — discoverable
// and accessible, unlike a 28-pixel cycle button.
const MODE_OPTIONS: { mode: PhaseRowMode; label: string }[] = [
  { mode: 'timed', label: 'Time' },
  { mode: 'reps', label: 'Reps' },
  { mode: 'distance', label: 'Distance' },
];

function ModePopup({
  visible,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  current: PhaseRowMode;
  onSelect: (m: PhaseRowMode) => void;
  onClose: () => void;
}) {
  const { accent } = useAccent();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={popupStyles.overlay} onPress={onClose}>
        <Pressable style={popupStyles.card} onPress={() => { /* swallow */ }}>
          <Text style={popupStyles.title}>Row mode</Text>
          {MODE_OPTIONS.map((opt) => {
            const isActive = current === opt.mode;
            return (
              <Pressable
                key={opt.mode}
                style={[popupStyles.option, isActive && popupStyles.optionActive, isActive && { backgroundColor: accent }]}
                onPress={() => { onSelect(opt.mode); onClose(); }}
                accessibilityRole="radio"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={opt.label}
              >
                <Feather
                  name={MODE_ICON[opt.mode]}
                  size={18}
                  color={isActive ? colors.background : colors.titleText}
                />
                <Text style={[popupStyles.optionLabel, isActive && popupStyles.optionLabelActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const phaseStyles = StyleSheet.create({
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flex: 1,
    gap: 8,
  },
  summaryText: {
    color: colors.button1,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  modeButton: {
    width: 40,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
    marginRight: 10,
    borderRadius: 8,
  },
  infoBtn: {
    padding: 2,
    opacity: 0.7,
  },
  nextUpRow: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
  },
});

const sectionStyles = StyleSheet.create({
  sectionGroup: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 6,
    marginBottom: 10,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  deleteSectionBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.button3,
  },
  addSectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  addSectionText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});

const popupStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.container,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    width: 260,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  title: {
    color: colors.titleText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    opacity: 0.55,
    marginBottom: 12,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    marginBottom: 6,
  },
  optionActive: {
    // backgroundColor applied inline via accent hook
  },
  optionLabel: {
    color: colors.titleText,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  optionLabelActive: {
    color: colors.background,
    fontWeight: '800',
  },
});

const infoStyles = StyleSheet.create({
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  tipIcon: {
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    color: colors.titleText,
    fontSize: 13,
    lineHeight: 18,
  },
  bold: {
    color: colors.titleText,
    fontWeight: '700',
  },
  closeBtn: {
    marginTop: 6,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});

const categoryLabelStyle = StyleSheet.create({
  wrap: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 7,
    marginTop: 6,
    marginBottom: 6,
    marginLeft: 6,
  },
  text: {
    color: colors.background,
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
