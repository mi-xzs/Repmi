// src/screens/WorkoutScreen.tsx
import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  View,
  Pressable,
  Alert,
  UIManager,
} from 'react-native';
import {
  useRoute,
  RouteProp,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/HomeStackNavigator';
import { colors } from '../theme/colors';
import WorkoutSection from '../components/features/workout/MainWorkout';
import PhaseSection from '../components/features/workout/PhaseSection';
import Screen from '../components/ui/Screen';
import { useWorkouts } from '../services/WorkoutContext';
import { useSettings, useAccent } from '../services/SettingsContext';
import { Feather } from '@expo/vector-icons';
import { WorkoutRowData, WarmUpRowData, CooldownRowData, WorkoutData } from '../types/exercise';
import RPEPrompt from '../components/features/workout/Shared/RPEPrompt';
import { RPEEntry, saveSession, loadSessionsForWorkout, loadDurationsForWorkout, loadRPEEntries as sbLoadRPEEntries, saveRPEEntry as sbSaveRPEEntry, loadAllSessions as sbLoadAllSessions, queuePendingSession, flushPendingSessions } from '../services/sessionService';
import { useAuth } from '../services/AuthContext';
import RestTimerModal from '../components/features/RestTimerModal';
import XPSummaryModal from '../components/features/workout/XPSummaryModal';
import { useXP } from '../services/XPContext';
import { useCoins } from '../services/CoinContext';
import { computeSessionXP, getStreakMultiplier, getLevelFromXP, getLevelTitle, XPLogEntry } from '../services/xpService';
import { computeSessionCoins } from '../services/coinService';
import { findPRDeltas, PRDelta } from '../utils/prDetection';
import { logError } from '../services/logger';

type WorkoutScreenRouteProp = RouteProp<HomeStackParamList, 'WorkoutScreen'>;
type WorkoutScreenNavProp = NativeStackNavigationProp<HomeStackParamList, 'WorkoutScreen'>;

// ─── session types ────────────────────────────────────────────────────────────

export interface SessionSet {
  label: string;
  kg?: number;
  reps?: number;
  minutes?: number;
  seconds?: number;
  meters?: number;
}

export interface SessionExercise {
  name: string;
  sets: SessionSet[];
}

export interface WorkoutSession {
  date: string;
  duration: number;
  exercises: SessionExercise[];
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const sectionRowsToSets = (rows: WorkoutRowData[]): SessionSet[] => {
  let workingCounter = 0;
  return rows.reduce<SessionSet[]>((acc, row) => {
    if (!row.done) return acc;
    const isWarmUp = row.sets === 0;
    if (!isWarmUp) workingCounter++;
    const set: SessionSet = { label: isWarmUp ? 'W' : String(workingCounter) };
    if (row.kg              > 0) set.kg      = row.kg;
    if (row.reps            > 0) set.reps    = row.reps;
    if ((row.minutes ?? 0)  > 0) set.minutes = row.minutes;
    if ((row.seconds ?? 0)  > 0) set.seconds = row.seconds;
    if ((row.meters  ?? 0)  > 0) set.meters  = row.meters;
    acc.push(set);
    return acc;
  }, []);
};

const timedRowsToSets = (
  rows: WarmUpRowData[] | CooldownRowData[],
  prefix: 'W' | 'C'
): SessionSet[] => {
  let counter = 0;
  return rows.reduce<SessionSet[]>((acc, row) => {
    if (!row.done) return acc;
    counter++;
    const set: SessionSet = { label: `${prefix}${counter}` };
    if (row.minutes > 0) set.minutes = row.minutes;
    if (row.seconds > 0) set.seconds = row.seconds;
    if (row.reps    > 0) set.reps    = row.reps;
    acc.push(set);
    return acc;
  }, []);
};

// ─── RPE helpers (RPE data now lives in Supabase) ─────────────────────────────

const getRPESummaryFromEntries = (
  entries: RPEEntry[]
): { last: number; delta: number | null } | null => {
  if (entries.length === 0) return null;
  const last  = entries[entries.length - 1].rating;
  const delta = entries.length >= 2
    ? last - entries[entries.length - 2].rating
    : null;
  return { last, delta };
};

// ─── component ────────────────────────────────────────────────────────────────

export default function WorkoutScreen() {
  const route      = useRoute<WorkoutScreenRouteProp>();
  const navigation = useNavigation<WorkoutScreenNavProp>();
  const { accent } = useAccent();
  const { workouts, updateWorkout } = useWorkouts();
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id ?? '';
  const { workoutIndex } = route.params;

  const workoutData = workouts[workoutIndex];

  const workoutId         = workoutData?.id ?? String(workoutIndex);

  const [lastDuration, setLastDuration] = useState<number | null>(null);
  const [avgDuration,  setAvgDuration]  = useState<number | null>(null);
  const [allDurations, setAllDurations] = useState<number[]>([]);
  const [isActive,  setIsActive]  = useState(false);
  const [elapsed,   setElapsed]   = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef      = useRef<ScrollView>(null);

  // Scroll-to-first-row tracking, mirrors the CreateWorkoutScreen error flow.
  // We compute target content y via measureInWindow + UIManager.measure on
  // the scrollable node, plus a live scroll offset.
  const scrollOffsetY        = useRef<number>(0);
  const warmupCardRef        = useRef<View | null>(null);
  const firstWorkingViewRef  = useRef<View | null>(null);

  const measureYInScroll = (view: View | null): Promise<number | null> => {
    return new Promise(resolve => {
      if (!view || !scrollRef.current) { resolve(null); return; }
      const scrollableNode = (scrollRef.current as any).getScrollableNode?.();
      if (scrollableNode == null) { resolve(null); return; }
      try {
        view.measureInWindow((_vx, vy) => {
          UIManager.measure(scrollableNode, (_x, _y, _w, _h, _spx, spy) => {
            resolve(scrollOffsetY.current + (vy - spy));
          });
        });
      } catch {
        resolve(null);
      }
    });
  };

  const [restTimer, setRestTimer] = useState<{ visible: boolean; duration: number }>(
    { visible: false, duration: 0 }
  );
  const openRestTimer  = (seconds: number) => setRestTimer({ visible: true, duration: seconds });
  const closeRestTimer = () => setRestTimer(prev => ({ ...prev, visible: false }));

  // ── RPE state ──────────────────────────────────────────────────────────────
  const [showRPE,    setShowRPE]    = useState(false);
  const [rpeSummary, setRpeSummary] = useState<{ last: number; delta: number | null } | null>(null);

  // ── XP state ──────────────────────────────────────────────────────────────
  const { totalXP, levelInfo, addXPEntry } = useXP();
  const { refreshCoins } = useCoins();
  const [showXPSummary, setShowXPSummary] = useState(false);
  const [lastXPEntry, setLastXPEntry] = useState<XPLogEntry | null>(null);
  const [lastSession, setLastSession] = useState<WorkoutSession | null>(null);
  const [lastSessionCoins, setLastSessionCoins] = useState<number | null>(null);
  const [lastPRDeltas, setLastPRDeltas] = useState<ReadonlyMap<string, PRDelta>>(new Map());
  const [levelBeforeWorkout, setLevelBeforeWorkout] = useState(levelInfo);


  // ── favorites (driven by SettingsContext — syncs to Supabase) ─────────────
  const { isFavorite, toggleFavorite: toggleFavoriteSetting } = useSettings();
  const isFavorited = isFavorite(workoutId);

  // ── previous session sets (keyed by exercise name) ────────────────────────
  const [prevSetsMap, setPrevSetsMap] = useState<Record<string, SessionSet[]>>({});
  const [prevSessionDate, setPrevSessionDate] = useState<string | null>(null);

  // ── active session row state ───────────────────────────────────────────────
  const [activeWarmUp,   setActiveWarmUp]   = useState<WarmUpRowData[]>([]);
  const [activeSections, setActiveSections] = useState<WorkoutRowData[][]>([]);
  const [activeCooldown, setActiveCooldown] = useState<CooldownRowData[]>([]);

  const loadDurations = useCallback(async () => {
    if (!userId) return;
    try {
      const durations = await loadDurationsForWorkout(userId, workoutId);
      setAllDurations(durations);
      if (durations.length > 0) {
        setLastDuration(durations[durations.length - 1]);
        setAvgDuration(Math.round(durations.reduce((a, b) => a + b, 0) / durations.length));
      } else {
        setLastDuration(null);
        setAvgDuration(null);
      }
    } catch (e) {
      logError('workout.durations.load.failed', { name: (e as Error)?.name });
    }
  }, [userId, workoutId]);

  const loadPreviousSets = useCallback(async () => {
    if (!userId) return;
    try {
      const sessions = await loadSessionsForWorkout(userId, workoutId);
      if (sessions.length === 0) return;
      const last = sessions[sessions.length - 1];
      const map: Record<string, SessionSet[]> = {};
      last.exercises.forEach((ex) => { map[ex.name] = ex.sets; });
      setPrevSetsMap(map);
      setPrevSessionDate(last.date);
    } catch (e) {
      logError('workout.prevSets.load.failed', { name: (e as Error)?.name });
    }
  }, [userId, workoutId]);

  const toggleFavorite = useCallback(() => {
    toggleFavoriteSetting(workoutId);
  }, [workoutId, toggleFavoriteSetting]);

  const loadRPESummary = useCallback(async () => {
    if (!userId) return;
    const entries = await sbLoadRPEEntries(userId, workoutId);
    setRpeSummary(getRPESummaryFromEntries(entries));
  }, [userId, workoutId]);

  useFocusEffect(useCallback(() => {
    loadDurations();
    loadRPESummary();
    loadPreviousSets();
  }, [loadDurations, loadRPESummary, loadPreviousSets]));

  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  useFocusEffect(useCallback(() => { forceUpdate(); }, []));

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isActive]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (!workoutData) return;
    setElapsed(0);
    // If the user edited the template after the last session, their edit
    // should override the "previous set" seeding.
    const templateOverrides =
      !!workoutData.editedAt &&
      !!prevSessionDate &&
      new Date(workoutData.editedAt).getTime() > new Date(prevSessionDate).getTime();
    setActiveWarmUp(
      (workoutData.warmUp ?? []).map(r => ({ ...r, done: false }))
    );
    setActiveSections(
      workoutData.sections.map(sec => {
        // Seed each row's kg / reps from the previous session when available,
        // falling back to the template's planned values otherwise.
        // Positional matching keeps this in sync with the "Prev" column,
        // which renders previousSets?.[index] in MainWorkout.
        const prev = templateOverrides ? undefined : prevSetsMap[sec.exerciseName];
        return sec.rows.map((r, i) => {
          const prevSet = prev?.[i];
          const seededKg   = prevSet?.kg   && prevSet.kg   > 0 ? prevSet.kg   : r.kg;
          const seededReps = prevSet?.reps && prevSet.reps > 0 ? prevSet.reps : r.reps;
          return { ...r, kg: seededKg, reps: seededReps, done: false };
        });
      })
    );
    setActiveCooldown(
      (workoutData.cooldown ?? []).map(r => ({ ...r, done: false }))
    );
    setLevelBeforeWorkout(getLevelFromXP(totalXP));
    setIsActive(true);
    // Auto-scroll to the first interactive section (warm-up if present,
    // otherwise the first working section) so the first Done button is in
    // view rather than the Start button at the bottom of the screen.
    // requestAnimationFrame waits for the active layout to render so
    // measureInWindow returns post-layout coordinates.
    requestAnimationFrame(async () => {
      const target = (workoutData.showWarmUp ? warmupCardRef.current : null)
        ?? firstWorkingViewRef.current;
      const y = await measureYInScroll(target);
      if (y !== null) {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 30), animated: true });
      }
    });
  };

  const handleFinish = async () => {
    if (!workoutData) return;

    // Cooldown reminder: only nag when the plan includes a cooldown and the
    // user hasn't ticked any of it. Destructive label on "Finish anyway" makes
    // it deliberately easier to back out than to push through.
    if (workoutData.showCooldown && activeCooldown.length > 0) {
      const anyDone = activeCooldown.some(r => r.done);
      if (!anyDone) {
        Alert.alert(
          'Skip cooldown?',
          "You haven't checked off any cooldown rows. Take a minute to cool down, or finish anyway.",
          [
            { text: 'Go cool down', style: 'cancel' },
            { text: 'Finish anyway', style: 'destructive', onPress: () => { finishNow(); } },
          ],
        );
        return;
      }
    }

    await finishNow();
  };

  const finishNow = async () => {
    if (!workoutData) return;

    const updated = [...allDurations, elapsed];
    setAllDurations(updated);
    setLastDuration(elapsed);
    setAvgDuration(Math.round(updated.reduce((a, b) => a + b, 0) / updated.length));
    setIsActive(false);

    const exercises: SessionExercise[] = [];

    if (workoutData.showWarmUp && activeWarmUp.length > 0) {
      const sets = timedRowsToSets(activeWarmUp, 'W');
      if (sets.length > 0) exercises.push({ name: 'Warm-up', sets });
    }

    workoutData.sections.forEach((sec, i) => {
      const rows = activeSections[i] ?? [];
      const sets = sectionRowsToSets(rows);
      if (sets.length > 0) exercises.push({ name: sec.exerciseName ?? 'Unknown', sets });
    });

    if (workoutData.showCooldown && activeCooldown.length > 0) {
      const sets = timedRowsToSets(activeCooldown, 'C');
      if (sets.length > 0) exercises.push({ name: 'Cooldown', sets });
    }

    const session: WorkoutSession = {
      date:     new Date().toISOString(),
      duration: elapsed,
      exercises,
    };

    // PR detection: load prior history before saving so the just-completed
    // session isn't in the comparison set.
    if (userId) {
      try {
        const prior = await sbLoadAllSessions(userId);
        setLastPRDeltas(findPRDeltas(session, prior));
      } catch (e) {
        logError('workout.prDetect.failed', { name: (e as Error)?.name });
        setLastPRDeltas(new Map());
      }
    } else {
      setLastPRDeltas(new Map());
    }

    if (userId) {
      try {
        await saveSession(userId, workoutId, session);
        // Opportunistic drain of any sessions that previously failed to push.
        flushPendingSessions(userId).catch(e =>
          logError('workout.pendingFlush.failed', { name: (e as Error)?.name }),
        );
      } catch (e) {
        logError('workout.saveSession.failed', { name: (e as Error)?.name });
        await queuePendingSession(workoutId, session);
      }
    }

    const newMap: Record<string, SessionSet[]> = {};
    exercises.forEach((ex) => { newMap[ex.name] = ex.sets; });
    setPrevSetsMap(newMap);

    // Persist any kg/reps the user adjusted mid-session back into the workout
    // template, so view/edit mode reflects what was actually performed.
    const cleanWorkout: WorkoutData = {
      ...workoutData,
      warmUp:   (workoutData.warmUp   ?? []).map(r => ({ ...r, done: false })),
      cooldown: (workoutData.cooldown ?? []).map(r => ({ ...r, done: false })),
      sections: workoutData.sections.map((sec, i) => ({
        ...sec,
        rows: (activeSections[i] ?? sec.rows).map(r => ({ ...r, done: false })),
      })),
    };
    updateWorkout(workoutIndex, cleanWorkout);

    setShowRPE(true);
  };

  const computeAndShowXP = async (hadRPE: boolean) => {
    const xpExercises: SessionExercise[] = [];
    if (workoutData!.showWarmUp && activeWarmUp.length > 0) {
      const sets = timedRowsToSets(activeWarmUp, 'W');
      if (sets.length > 0) xpExercises.push({ name: 'Warm-up', sets });
    }
    workoutData!.sections.forEach((sec, i) => {
      const rows = activeSections[i] ?? [];
      const sets = sectionRowsToSets(rows);
      if (sets.length > 0) xpExercises.push({ name: sec.exerciseName ?? 'Unknown', sets });
    });
    if (workoutData!.showCooldown && activeCooldown.length > 0) {
      const sets = timedRowsToSets(activeCooldown, 'C');
      if (sets.length > 0) xpExercises.push({ name: 'Cooldown', sets });
    }

    const xpSession: WorkoutSession = {
      date: new Date().toISOString(),
      duration: elapsed,
      exercises: xpExercises,
    };

    // Compute current streak from all sessions in Supabase. Also surface
    // whether the just-saved session is the FIRST of today, used to gate
    // per-workout coin earning (anti-grind soft cap).
    let streak = 0;
    let isFirstOfDay = true;
    if (userId) {
      try {
        const allSessions = await sbLoadAllSessions(userId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const daySet = new Set<string>();
        let todayCount = 0;
        for (const s of allSessions) {
          const d = new Date(s.date);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          daySet.add(key);
          if (key === todayKey) todayCount++;
        }
        // The just-saved session is in allSessions; only "first" if it's alone today.
        isFirstOfDay = todayCount <= 1;

        const check = new Date();
        check.setHours(0, 0, 0, 0);
        while (daySet.has(`${check.getFullYear()}-${String(check.getMonth() + 1).padStart(2, '0')}-${String(check.getDate()).padStart(2, '0')}`)) {
          streak++;
          check.setDate(check.getDate() - 1);
        }
      } catch (e) {
        logError('workout.streak.compute.failed', { name: (e as Error)?.name });
      }
    }

    const { baseXP, breakdown } = computeSessionXP(xpSession, hadRPE);
    const { multiplier } = getStreakMultiplier(streak);
    const xpEntry: XPLogEntry = {
      date: new Date().toISOString(),
      workoutId,
      baseXP,
      streakMultiplier: multiplier,
      totalXP: Math.round(baseXP * multiplier),
      breakdown,
    };

    // Coins are gated on a real workout (matches XP — 0 working sets = 0 XP).
    const sessionCoinBreakdown = baseXP > 0
      ? computeSessionCoins(multiplier, lastPRDeltas.size > 0, isFirstOfDay)
      : { base: 0, streakBonus: 0, prBonus: 0, total: 0 };

    await addXPEntry(xpEntry);
    await refreshCoins();
    setLastXPEntry(xpEntry);
    setLastSession(xpSession);
    setLastSessionCoins(sessionCoinBreakdown.total);
    setShowXPSummary(true);
  };

  const handleRPESubmit = async (entry: RPEEntry) => {
    if (userId) {
      try {
        await sbSaveRPEEntry(userId, entry.workoutId, entry.rating, entry.recordedAt);
        const entries = await sbLoadRPEEntries(userId, workoutId);
        setRpeSummary(getRPESummaryFromEntries(entries));
      } catch (e) {
        logError('workout.rpe.save.failed', { name: (e as Error)?.name });
      }
    }
    setShowRPE(false);
    await computeAndShowXP(true);
  };

  const handleRPESkip = async () => {
    setShowRPE(false);
    await computeAndShowXP(false);
  };

  if (!workoutData) return null;

  const handleEdit = () => {
    navigation.navigate('CreateWorkout', { existingWorkout: workoutData, workoutIndex });
  };

  const rpeDeltaLabel = (delta: number | null): string => {
    if (delta === null) return '';
    if (delta > 0) return ` +${delta}`;
    if (delta < 0) return ` ${delta}`;
    return ' →';
  };

  // ── superset turn helper ──────────────────────────────────────────────────
  const getHighlightNextSet = (i: number): boolean => {
    if (!isActive) return false;

    // Build sequential groups (standalone = [i], superset = [i, i+1, ...])
    const groups: number[][] = [];
    let j = 0;
    while (j < workoutData.sections.length) {
      const group: number[] = [j];
      while (workoutData.sections[j].linkedToNext ?? false) {
        j++;
        group.push(j);
      }
      groups.push(group);
      j++;
    }

    const isGroupComplete = (group: number[]) =>
      group.every(idx => {
        const rows = activeSections[idx] ?? workoutData.sections[idx].rows;
        return rows.every(r => r.done);
      });

    // Only the first incomplete group gets a highlight
    const activeGroup = groups.find(g => !isGroupComplete(g));
    if (!activeGroup || !activeGroup.includes(i)) return false;

    // Standalone exercise — always highlight its next row
    if (activeGroup.length === 1) return true;

    // Superset — alternate: whoever has fewest done sets goes next
    const doneCounts = activeGroup.map(idx => {
      const rows = activeSections[idx] ?? workoutData.sections[idx].rows;
      return rows.filter(r => r.done).length;
    });
    const myDone = doneCounts[activeGroup.indexOf(i)];
    const minDone = Math.min(...doneCounts);
    if (myDone > minDone) return false;
    const firstWithMin = activeGroup[doneCounts.findIndex(c => c === minDone)];
    return firstWithMin === i;
  };

  // ── rest timer button label helper ────────────────────────────────────────
  const formatRestDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Feather name="arrow-left" size={22} color={colors.titleText} />
          </Pressable>
          {!isActive && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {workoutData.id && (
                <Pressable onPress={toggleFavorite} style={styles.iconButton}>
                  <Feather
                    name="star"
                    size={22}
                    color={isFavorited ? colors.fav : colors.titleText}
                    fill={isFavorited ? colors.fav : 'none'}
                  />
                </Pressable>
              )}
              <Pressable onPress={handleEdit} style={styles.iconButton}>
                <Feather name="edit-2" size={22} color={colors.titleText} />
              </Pressable>
            </View>
          )}
        </View>

        <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            onScroll={(e) => { scrollOffsetY.current = e.nativeEvent.contentOffset.y; }}
            scrollEventThrottle={32}
          >
          <Text style={[styles.title, { color: accent }]}>
            {workoutData.workoutName.includes(' - ')
              ? <>
                  {workoutData.workoutName.split(' - ')[0].toUpperCase()}
                  <Text style={styles.titleUsername}>
                    {' - ' + workoutData.workoutName.split(' - ').slice(1).join(' - ').toUpperCase()}
                  </Text>
                </>
              : workoutData.workoutName.toUpperCase()
            }
          </Text>

          {workoutData.showWarmUp && workoutData.warmUp && (
            <View ref={warmupCardRef} style={styles.sectionCard}>
              <PhaseSection
                phase="warmup"
                value={isActive ? activeWarmUp : workoutData.warmUp}
                onChange={isActive ? setActiveWarmUp : undefined}
                readonly={!isActive}
                active={isActive}
              />
            </View>
          )}

          {workoutData.sections.map((section, i) => {
            const linkedFromPrev = i > 0 && (workoutData.sections[i - 1].linkedToNext ?? false);
            const linkedToNext = section.linkedToNext ?? false;
            const highlightNextSet = getHighlightNextSet(i);

            return (
              <View
                key={section.id}
                ref={i === 0 ? firstWorkingViewRef : undefined}
              >
                <View style={[
                  styles.sectionCard,
                  linkedToNext && { marginBottom: 2 },
                ]}>
                  <WorkoutSection
                    value={isActive ? (activeSections[i] ?? section.rows) : section.rows}
                    onChange={
                      isActive
                        ? (updated) => {
                            setActiveSections(prev => {
                              const copy = [...prev];
                              copy[i] = updated;
                              return copy;
                            });
                            // Persist immediately so kg/reps edits and Done
                            // toggles survive navigation-away / app-kill.
                            updateWorkout(workoutIndex, {
                              ...workoutData,
                              sections: workoutData.sections.map((sec, idx) =>
                                idx === i
                                  ? { ...sec, rows: updated.map(r => ({ ...r, done: false })) }
                                  : sec
                              ),
                            });
                          }
                        : undefined
                    }
                    onSwap={
                      isActive
                        ? (name, newMode) => {
                            updateWorkout(workoutIndex, {
                              ...workoutData,
                              sections: workoutData.sections.map((sec, idx) =>
                                idx === i
                                  ? { ...sec, exerciseName: name, exerciseMode: newMode }
                                  : sec
                              ),
                            });
                          }
                        : undefined
                    }
                    workoutName={section.exerciseName}
                    exerciseMode={section.exerciseMode}
                    readonly={!isActive}
                    active={isActive}
                    previousSets={prevSetsMap[section.exerciseName] ?? []}
                    linkedFromPrev={linkedFromPrev}
                    linkedToNext={linkedToNext}
                    highlightNextSet={highlightNextSet}
                  />
                </View>

                {/* ── Superset connector between linked exercises ── */}
                {linkedToNext && (
                  <View style={styles.supersetConnector}>
                    <View style={[styles.supersetConnectorLine, { backgroundColor: accent }]} />
                    <Feather name="link" size={11} color={accent} />
                    <Text style={[styles.supersetConnectorText, { color: accent }]}>SUPERSET</Text>
                    <View style={[styles.supersetConnectorLine, { backgroundColor: accent }]} />
                  </View>
                )}

                {/* ── Rest timer button — only shown when active and timer is set ── */}
                {isActive && section.restTimer !== undefined && (
                  <Pressable
                    style={({ pressed }) => [
                      styles.restTimerBtn,
                      { borderColor: accent + '99' },
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => openRestTimer(section.restTimer!)}
                  >
                    <Feather name="clock" size={14} color={accent} />
                    <Text style={[styles.restTimerBtnText, { color: accent }]}>
                      Rest  {formatRestDuration(section.restTimer)}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}

          {workoutData.showCooldown && workoutData.cooldown && (
            <View style={styles.sectionCard}>
              <PhaseSection
                phase="cooldown"
                value={isActive ? activeCooldown : workoutData.cooldown}
                onChange={isActive ? setActiveCooldown : undefined}
                readonly={!isActive}
                active={isActive}
              />
            </View>
          )}

          {/* ── RPE badge (view mode only) ──────────────────────────────── */}
          {!isActive && rpeSummary !== null && (
            <View style={styles.rpeBadge}>
              <Feather name="activity" size={12} color={colors.titleText} style={{ opacity: 0.5 }} />
              <Text style={styles.rpeBadgeText}>
                Last perceived exertion:{' '}
                <Text style={styles.rpeBadgeValue}>{rpeSummary.last}</Text>
                {rpeSummary.delta !== null && (
                  <Text style={[
                    styles.rpeBadgeDelta,
                    rpeSummary.delta > 0 && styles.rpeDeltaUp,
                    rpeSummary.delta < 0 && styles.rpeDeltaDown,
                    rpeSummary.delta === 0 && styles.rpeDeltaFlat,
                  ]}>
                    {rpeDeltaLabel(rpeSummary.delta)}
                  </Text>
                )}
              </Text>
            </View>
          )}

          {/* Last / Avg duration — flows with content rather than sticking */}
          {(lastDuration !== null || avgDuration !== null) && (
            <View style={styles.statsRow}>
              {lastDuration !== null && (
                <View style={styles.lastDurationBadge}>
                  <Feather name="clock" size={12} color={colors.titleText} />
                  <Text style={styles.lastDurationText}>LAST: {formatTime(lastDuration)}</Text>
                </View>
              )}
              {avgDuration !== null && (
                <View style={styles.lastDurationBadge}>
                  <Feather name="bar-chart-2" size={12} color={colors.titleText} />
                  <Text style={styles.lastDurationText}>AVG: {formatTime(avgDuration)}</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.bottomBar}>
          {!isActive ? (
            <View style={styles.bottomRow}>
              <Pressable
                onPress={handleStart}
                style={({ pressed }) => [styles.startButton, { backgroundColor: accent }, pressed && styles.buttonPressed]}
              >
                <Feather name="play" size={18} color={colors.container} />
                <Text style={styles.bottomButtonText}>Start Workout</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.bottomRow}>
              <View style={styles.elapsedContainer}>
                <Text style={styles.elapsedLabel}>Duration</Text>
                <Text style={styles.elapsedTime}>{formatTime(elapsed)}</Text>
              </View>
              <Pressable
                onPress={handleFinish}
                style={({ pressed }) => [styles.finishButton, { backgroundColor: accent }, pressed && styles.buttonPressed]}
              >
                <Text style={styles.bottomButtonText}>Finish</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* ── RPE Prompt modal ─────────────────────────────────────────────────── */}
      <RPEPrompt
        visible={showRPE}
        workoutId={workoutId}
        workoutName={workoutData.workoutName}
        onSubmit={handleRPESubmit}
        onSkip={handleRPESkip}
      />

      {/* ── Rest Timer modal ──────────────────────────────────────────────────── */}
      <RestTimerModal
        visible={restTimer.visible}
        durationSeconds={restTimer.duration}
        onDismiss={closeRestTimer}
      />

      {/* ── XP Summary modal ──────────────────────────────────────────────── */}
      <XPSummaryModal
        visible={showXPSummary}
        entry={lastXPEntry}
        levelBefore={levelBeforeWorkout}
        levelAfter={getLevelFromXP(totalXP)}
        titleAfter={getLevelTitle(getLevelFromXP(totalXP).level)}
        workoutName={workoutData.workoutName}
        session={lastSession}
        prDeltas={lastPRDeltas}
        sessionCoins={lastSessionCoins}
        onDismiss={() => { setShowXPSummary(false); navigation.goBack(); }}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  iconButton: { padding: 8 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 4,
  },
  lastDurationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  lastDurationText: {
    color: colors.titleText,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  scrollContent: { paddingBottom: 20 },
  title: {
    fontSize: 33,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  titleUsername: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.button2,
    letterSpacing: 1,
  },
  sectionCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    marginBottom: 12,
    padding: 8,
  },
  restTimerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 50,
    borderWidth: 1,
    backgroundColor: colors.button3,
    marginTop: -4,   // tucks up slightly under the section card
    marginBottom: 10,
  },
  restTimerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  bottomBar: {
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editButton: {
    padding: 14,
    backgroundColor: colors.button2,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 16,
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 8,
    padding: 14,
    borderRadius: 16,
  },
  elapsedContainer: { flex: 1, alignItems: 'center' },
  elapsedLabel: {
    fontSize: 11,
    color: colors.titleText,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  elapsedTime: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.highlight,
    letterSpacing: 2,
  },
  buttonPressed: { opacity: 0.7 },
  bottomButtonText: {
    color: colors.container,
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  rpeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  rpeBadgeText: {
    fontSize: 12,
    color: colors.titleText,
    opacity: 0.5,
  },
  rpeBadgeValue: {
    fontWeight: '700',
    opacity: 1,
  },
  rpeBadgeDelta: {
    fontWeight: '600',
    fontSize: 12,
  },
  rpeDeltaUp:   { color: '#ef4444' },
  rpeDeltaDown: { color: '#34d399' },
  rpeDeltaFlat: { color: colors.titleText, opacity: 0.4 },
  supersetConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginTop: -2,
    marginBottom: 2,
  },
  supersetConnectorLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    opacity: 0.4,
  },
  supersetConnectorText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
});