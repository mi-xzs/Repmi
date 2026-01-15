import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useWorkouts } from '../services/WorkoutContext';
import { HomeStackParamList } from '../navigation/HomeStackNavigator';
import {
  WorkoutData,
  WorkoutSectionData,
  WorkoutRowData,
  WarmUpRowData,
  CooldownRowData,
  ExerciseMode,
} from '../types/exercise';
import { DEFAULT_WARMUP_ROW, DEFAULT_COOLDOWN_ROW } from '../constants/workoutData';

type CreateWorkoutNavProp = NativeStackNavigationProp<HomeStackParamList, 'CreateWorkout'>;
type CreateWorkoutRouteProp = RouteProp<HomeStackParamList, 'CreateWorkout'>;


export function useCreateWorkout() {
  const navigation = useNavigation<CreateWorkoutNavProp>();
  const route = useRoute<CreateWorkoutRouteProp>();

  const existingWorkout = route.params?.existingWorkout;
  const workoutIndex = route.params?.workoutIndex;
  const isEditing = existingWorkout !== undefined;

  const { workouts, saveWorkout, updateWorkout, deleteWorkout } = useWorkouts();

  // --- State ---
  const [workoutName, setWorkoutName] = useState<string | null>(existingWorkout?.workoutName ?? null);
  const [showWarmUp, setShowWarmUp] = useState(existingWorkout?.showWarmUp ?? false);
  const [showCooldown, setShowCooldown] = useState(existingWorkout?.showCooldown ?? false);
  const [sections, setSections] = useState<WorkoutSectionData[]>(existingWorkout?.sections ?? []);
  const [warmUpRows, setWarmUpRows] = useState<WarmUpRowData[]>(
    existingWorkout?.warmUp?.length ? existingWorkout.warmUp : [DEFAULT_WARMUP_ROW]
  );
  const [cooldownRows, setCooldownRows] = useState<CooldownRowData[]>(
    existingWorkout?.cooldown?.length ? existingWorkout.cooldown : [DEFAULT_COOLDOWN_ROW]
  );

  useEffect(() => {
    if (!isEditing) {
      setWorkoutName(null);
      setShowWarmUp(false);
      setShowCooldown(false);
      setSections([]);
      setWarmUpRows([DEFAULT_WARMUP_ROW]);
      setCooldownRows([DEFAULT_COOLDOWN_ROW]);
    }
  }, []);

  // --- Section handlers ---
  const addSection = () => {
    const newSection: WorkoutSectionData = {
      id: Date.now().toString(),
      exerciseName: '',
      rows: [{ sets: 1, kg: 0, reps: 0, done: false }],
    };
    setSections((prev) => [...prev, newSection]);
  };

  const updateSectionRows = (id: string, rows: WorkoutRowData[]) => {
    setSections((prev) => prev.map((sec) => (sec.id === id ? { ...sec, rows } : sec)));
  };

  const updateSectionName = (id: string, exerciseName: string) => {
    setSections((prev) => prev.map((sec) => (sec.id === id ? { ...sec, exerciseName } : sec)));
  };

  const updateSectionRestTimer = (id: string, seconds: number | undefined) => {
    setSections((prev) =>
      prev.map((sec) => (sec.id === id ? { ...sec, restTimer: seconds } : sec))
    );
  };

  const updateSectionExerciseMode = (id: string, mode: ExerciseMode) => {
    setSections((prev) =>
      prev.map((sec) => (sec.id === id ? { ...sec, exerciseMode: mode } : sec))
    );
  };

  const deleteSection = (id: string) => {
    setSections((prev) => {
      const idx = prev.findIndex((sec) => sec.id === id);
      if (idx === -1) return prev;
      const next = prev.filter((sec) => sec.id !== id);
      // If a previous section was linked to the deleted one, break that link.
      if (idx > 0 && next[idx - 1]?.linkedToNext) {
        next[idx - 1] = { ...next[idx - 1], linkedToNext: false };
      }
      return next;
    });
  };

  const toggleSectionLink = (id: string) => {
    setSections((prev) =>
      prev.map((sec) => (sec.id === id ? { ...sec, linkedToNext: !sec.linkedToNext } : sec))
    );
  };

  // --- Save / Delete ---
  const toRoman = (num: number): string => {
    const numerals: [number, string][] = [
      [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
    ];
    let result = '';
    for (const [value, symbol] of numerals) {
      while (num >= value) { result += symbol; num -= value; }
    }
    return result;
  };

  const fromRoman = (str: string): number => {
    const map: Record<string, number> = { I: 1, V: 5, X: 10 };
    let result = 0;
    for (let i = 0; i < str.length; i++) {
      const curr = map[str[i]] ?? 0;
      const next = map[str[i + 1]] ?? 0;
      result += curr < next ? -curr : curr;
    }
    return result;
  };

  const ROMAN_SUFFIX = /\s+(I{1,3}|IV|V|VI{0,3}|IX|X{0,3})$/i;

  const getBaseName = (name: string): string => {
    return name.replace(ROMAN_SUFFIX, '').trim();
  };

  const getNextRomanName = (name: string): string => {
    const base = getBaseName(name).toLowerCase();
    let highest = 1;

    for (const w of workouts) {
      const wName = w.workoutName.trim();
      const wBase = getBaseName(wName).toLowerCase();
      if (wBase !== base) continue;

      const suffixMatch = wName.match(ROMAN_SUFFIX);
      if (suffixMatch) {
        const num = fromRoman(suffixMatch[1].toUpperCase());
        if (num > highest) highest = num;
      }
    }

    return `${getBaseName(name)} ${toRoman(highest + 1)}`;
  };

  const performSave = (finalName?: string) => {
    const workoutData = {
      workoutName: finalName ?? workoutName!,
      showWarmUp,
      showCooldown,
      warmUp: showWarmUp ? warmUpRows : [],
      cooldown: showCooldown ? cooldownRows : [],
      sections,
      editedAt: new Date().toISOString(),
    } as WorkoutData;

    if (isEditing && workoutIndex !== undefined) {
      updateWorkout(workoutIndex, workoutData);
    } else {
      saveWorkout(workoutData);
    }

    navigation.goBack();
  };

  const onSave = () => {
    if (!workoutName) return alert('Please enter a workout name!');

    const duplicate = workouts.some(
      (w, i) =>
        w.workoutName.toLowerCase() === workoutName.toLowerCase() &&
        !(isEditing && i === workoutIndex)
    );

    if (duplicate) {
      const renamedName = getNextRomanName(workoutName);
      Alert.alert(
        'Duplicate Name',
        `You already have a workout named "${workoutName}". It will be saved as "${renamedName}" to keep them distinct.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'OK', onPress: () => performSave(renamedName) },
        ]
      );
      return;
    }

    performSave();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Workout',
      `Are you sure you want to delete "${workoutName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteWorkout(workoutIndex!);
            navigation.pop(2);
          },
        },
      ]
    );
  };

  return {
    // State
    workoutName,
    showWarmUp,
    showCooldown,
    sections,
    warmUpRows,
    cooldownRows,
    isEditing,
    // Setters
    setWorkoutName,
    setShowWarmUp,
    setShowCooldown,
    setWarmUpRows,
    setCooldownRows,
    // Handlers
    addSection,
    updateSectionRows,
    updateSectionName,
    updateSectionRestTimer,
    updateSectionExerciseMode,
    deleteSection,
    toggleSectionLink,
    onSave,
    handleDelete,
  };
}
