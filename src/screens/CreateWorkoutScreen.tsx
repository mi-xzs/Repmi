import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Keyboard,
  UIManager,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import Screen from '../components/ui/Screen';
import SaveButton from '../components/ui/SaveButton';
import CancelButton from '../components/ui/CancelButton';
import WorkoutSection, { WorkoutSectionHandle } from '../components/features/workout/MainWorkout';
import PhaseSection, { PhaseSectionHandle } from '../components/features/workout/PhaseSection';
import PhaseCategoryModal from '../components/features/workout/Shared/PhaseCategoryModal';
import WorkoutTypePickerModal from '../components/features/workout/Shared/WorkoutTypePickerModal';
import AddWarmUpButton from '../components/ui/AddWarmUpButton';
import AddSection from '../components/ui/AddSectionButton';
import CooldownButton from '../components/ui/AddCooldownButton';
import AddRestTimerButton from '../components/ui/AddRestTimerButton';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/HomeStackNavigator';
import { useCreateWorkout } from '../hooks/useCreateWorkout';
import { getDefaultRowForCategory } from '../constants/workoutData';
import { colors } from '../theme/colors';
import { useAccent } from '../services/SettingsContext';

type CreateWorkoutNavProp = NativeStackNavigationProp<HomeStackParamList, 'CreateWorkout'>;

export default function CreateWorkoutScreen() {
  const navigation = useNavigation<CreateWorkoutNavProp>();
  const { accent } = useAccent();
  const sectionRefs = useRef<Map<string, WorkoutSectionHandle>>(new Map());
  const warmUpRef = useRef<PhaseSectionHandle | null>(null);
  const cooldownRef = useRef<PhaseSectionHandle | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);
  const scrollOffsetY = useRef<number>(0);
  const nameSectionViewRef = useRef<View | null>(null);
  const sectionViewRefs = useRef<Map<string, View>>(new Map());
  const warmUpViewRef = useRef<View | null>(null);
  const cooldownViewRef = useRef<View | null>(null);

  const measureYInScroll = (view: View | null): Promise<number | null> => {
    return new Promise(resolve => {
      if (!view || !scrollRef.current) { resolve(null); return; }
      const scrollableNode = (scrollRef.current as any).getScrollableNode?.();
      if (scrollableNode == null) { resolve(null); return; }
      try {
        view.measureInWindow((_vx, vy) => {
          UIManager.measure(scrollableNode, (_x, _y, _w, _h, _spx, spy) => {
            const viewportRelative = vy - spy;
            resolve(scrollOffsetY.current + viewportRelative);
          });
        });
      } catch {
        resolve(null);
      }
    });
  };
  const [workoutNameError, setWorkoutNameError] = React.useState(false);
  const [typeModalVisible, setTypeModalVisible] = React.useState(false);
  const [categoryModalPhase, setCategoryModalPhase] = React.useState<'warmup' | 'cooldown' | null>(null);

  const {
    workoutName,
    showWarmUp,
    showCooldown,
    sections,
    warmUpRows,
    cooldownRows,
    isEditing,
    setWorkoutName,
    setShowWarmUp,
    setShowCooldown,
    setWarmUpRows,
    setCooldownRows,
    addSection,
    updateSectionRows,
    updateSectionName,
    updateSectionRestTimer,
    updateSectionExerciseMode,
    deleteSection,
    toggleSectionLink,
    onSave,
    handleDelete,
  } = useCreateWorkout();


  const handleSave = async () => {
    let valid = true;
    const failingViews: (View | null)[] = [];

    if (!workoutName || workoutName.trim() === '') {
      setWorkoutNameError(true);
      valid = false;
      failingViews.push(nameSectionViewRef.current);
    } else {
      setWorkoutNameError(false);
    }

    sections.forEach((sec) => {
      const ref = sectionRefs.current.get(sec.id);
      if (ref && !ref.validate()) {
        valid = false;
        failingViews.push(
          ref.getFirstErrorView() ?? sectionViewRefs.current.get(sec.id) ?? null
        );
      }
    });

    if (showWarmUp && warmUpRef.current && !warmUpRef.current.validate()) {
      valid = false;
      failingViews.push(warmUpRef.current.getFirstErrorView() ?? warmUpViewRef.current);
    }
    if (showCooldown && cooldownRef.current && !cooldownRef.current.validate()) {
      valid = false;
      failingViews.push(cooldownRef.current.getFirstErrorView() ?? cooldownViewRef.current);
    }

    if (!valid) {
      const ys = (await Promise.all(failingViews.map(measureYInScroll)))
        .filter((y): y is number => y !== null);
      if (ys.length > 0) {
        const target = Math.max(0, Math.min(...ys) - 180);
        scrollRef.current?.scrollTo({ y: target, animated: true });
      }
      return;
    }
    onSave();
  };

  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        {isEditing && (
          <View style={styles.topBar}>
            <Pressable onPress={handleDelete} style={styles.trashButton}>
              <Feather name="trash-2" size={22} color="#FF6B6B" />
            </Pressable>
          </View>
        )}

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          onScroll={(e) => { scrollOffsetY.current = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={32}
        >
          {/* Workout Name Picker */}
          <View
            ref={nameSectionViewRef}
            style={styles.nameSection}
          >
            <Pressable
              style={styles.nameTitleRow}
              onPress={() => setTypeModalVisible(true)}
            >
              <Text
                style={[
                  styles.nameTitle,
                  !workoutName && styles.nameTitlePlaceholder,
                  workoutNameError && { color: '#FF6B6B' },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {(workoutName ?? 'Choose workout type').toUpperCase()}
              </Text>
              {workoutName ? (
                <Pressable
                  style={styles.nameTitleAction}
                  onPress={() => setTypeModalVisible(true)}
                  hitSlop={10}
                >
                  <Feather name="edit-2" size={20} color={colors.titleText} />
                </Pressable>
              ) : (
                <Feather
                  name="chevron-down"
                  size={20}
                  color={colors.titleText}
                  style={styles.nameTitleAction}
                />
              )}
            </Pressable>
            {workoutNameError && (
              <Text style={styles.errorText}>Workout name is required</Text>
            )}
          </View>

          <Pressable onPress={Platform.OS === 'web' ? undefined : () => Keyboard.dismiss()}>
            <View style={styles.inlineButtons}>
              {!showWarmUp && <AddWarmUpButton onPress={() => setCategoryModalPhase('warmup')} />}
              {!showCooldown && <CooldownButton onPress={() => setCategoryModalPhase('cooldown')} />}
            </View>

          {showWarmUp && (
            <View ref={warmUpViewRef}>
              <PhaseSection
                ref={warmUpRef}
                phase="warmup"
                value={warmUpRows}
                onChange={setWarmUpRows}
                onDelete={() => setShowWarmUp(false)}
              />
            </View>
          )}

          {sections.map((sec, idx) => {
            const prevLinked = idx > 0 && sections[idx - 1].linkedToNext === true;
            const isLastSection = idx === sections.length - 1;
            return (
              <View
                key={sec.id}
                ref={(node) => {
                  if (node) sectionViewRefs.current.set(sec.id, node);
                  else sectionViewRefs.current.delete(sec.id);
                }}
              >
                <WorkoutSection
                  ref={(handle) => {
                    if (handle) sectionRefs.current.set(sec.id, handle);
                    else sectionRefs.current.delete(sec.id);
                  }}
                  value={sec.rows}
                  workoutName={sec.exerciseName}
                  workoutTitle={workoutName ?? undefined}
                  exerciseMode={sec.exerciseMode}
                  linkedFromPrev={prevLinked}
                  linkedToNext={sec.linkedToNext === true}
                  onChange={(rows) => updateSectionRows(sec.id, rows)}
                  onWorkoutNameChange={(name) => updateSectionName(sec.id, name)}
                  onExerciseModeChange={(mode) => updateSectionExerciseMode(sec.id, mode)}
                  onDelete={() => deleteSection(sec.id)}
                />

                {sec.linkedToNext ? (
                  <Pressable
                    style={[styles.supersetPill, { borderColor: accent }]}
                    onPress={() => toggleSectionLink(sec.id)}
                  >
                    <Feather name="link" size={13} color={accent} />
                    <Text style={[styles.supersetPillText, { color: accent }]}>Superset · tap to unlink</Text>
                  </Pressable>
                ) : (
                  <AddRestTimerButton
                    value={sec.restTimer}
                    onChange={(seconds) => updateSectionRestTimer(sec.id, seconds)}
                    onRemove={() => updateSectionRestTimer(sec.id, undefined)}
                  />
                )}

                {!isLastSection && !sec.linkedToNext && (
                  <Pressable
                    style={({ pressed }) => [styles.linkSupersetButton, pressed && { opacity: 0.6 }]}
                    onPress={() => toggleSectionLink(sec.id)}
                  >
                    <Feather name="link" size={12} color={colors.button1} />
                    <Text style={styles.linkSupersetText}>Link as superset</Text>
                  </Pressable>
                )}
              </View>
            );
          })}

          <View style={styles.sectionButtonWrapper}>
            <AddSection onPress={addSection} />
          </View>

          {showCooldown && (
            <View ref={cooldownViewRef}>
              <PhaseSection
                ref={cooldownRef}
                phase="cooldown"
                value={cooldownRows}
                onChange={setCooldownRows}
                onDelete={() => setShowCooldown(false)}
              />
            </View>
          )}
          </Pressable>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <CancelButton onPress={() => navigation.goBack()} />
          <SaveButton onPress={handleSave} />
        </View>
      </View>

      <PhaseCategoryModal
        visible={categoryModalPhase !== null}
        phase={categoryModalPhase ?? 'warmup'}
        onSelect={(category) => {
          const seedRow = getDefaultRowForCategory(category ?? undefined);
          if (categoryModalPhase === 'warmup') {
            setWarmUpRows([seedRow]);
            setShowWarmUp(true);
          } else {
            setCooldownRows([seedRow]);
            setShowCooldown(true);
          }
          setCategoryModalPhase(null);
        }}
        onClose={() => setCategoryModalPhase(null)}
      />

      <WorkoutTypePickerModal
        visible={typeModalVisible}
        currentValue={workoutName}
        onChange={(next) => {
          setWorkoutName(next);
          if (next && next.trim().length > 0) setWorkoutNameError(false);
        }}
        onClose={() => setTypeModalVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    marginTop: 20,
    backgroundColor: colors.container,
    borderRadius: 40,
  },
  topBar: {
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  trashButton: {
    padding: 8,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  nameSection: {
    marginVertical: 12,
    paddingHorizontal: 4,
  },
  nameTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  nameTitle: {
    fontSize: 33,
    fontWeight: 'bold',
    color: colors.titleText,
    textTransform: 'uppercase',
    textAlign: 'center',
    flexShrink: 1,
  },
  nameTitlePlaceholder: {
    color: colors.button2,
    letterSpacing: 1,
  },
  nameTitleAction: {
    marginLeft: 10,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  sectionButtonWrapper: {
    marginVertical: 10,
    alignItems: 'center',
  },
  inlineButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 5,
    borderTopWidth: 1,
    borderTopColor: colors.button2,
  },
  linkSupersetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: colors.button2,
    backgroundColor: colors.button3,
    marginTop: 4,
    marginBottom: 8,
  },
  linkSupersetText: {
    color: colors.button1,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  supersetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 50,
    borderWidth: 1,
    backgroundColor: colors.button3,
    marginTop: 6,
    marginBottom: 8,
  },
  supersetPillText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});

