// src/screens/AnalyticsScreen.tsx

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  ScrollView,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../services/AuthContext";
import { loadAllSessions as sbLoadAllSessions, loadSessionsForWorkout, loadDurationsForWorkout } from "../services/sessionService";
import { useFocusEffect, useRoute, type RouteProp } from "@react-navigation/native";
import type { RootTabParamList } from "../navigation/types";
import { useWorkouts } from "../services/WorkoutContext";
import { colors } from "../theme/colors";
import { useResponsive, getContentWidth } from "../hooks/useResponsive";
import { useAccent } from "../services/SettingsContext";
import { styles } from "./Analytics.Styles";
import { WorkoutSession } from "./WorkoutScreen";
import { avg, best, fmtDuration, muscleSetsFromTemplate } from "../utils/analyticsHelpers";
import SwipeTabs from "../components/ui/SwipeTabs";
import StatCard from "../components/analytics/StatCard";
import WorkoutPicker from "../components/analytics/WorkoutPicker";
import ExerciseProgression from "../components/analytics/ExerciseProgression";
import RPEProgression from "../components/analytics/RPEProgression";
import OverallStats from "../components/analytics/OverallStats";
import WeeklyDigest from "../components/analytics/WeeklyDigest";
import MuscleVolumeChart from "../components/analytics/MuscleVolumeChart";
import {
  Skeleton,
  SkeletonStatRow,
  SkeletonChartCard,
  useStableLoading,
} from "../components/ui/Skeleton";

// ─── constants ────────────────────────────────────────────────────────────────

type TabId = "workout" | "weekly" | "overall";
const TABS: { id: TabId; label: string }[] = [
  { id: "workout", label: "Workout" },
  { id: "weekly",  label: "Weekly"  },
  { id: "overall", label: "Overall" },
];
const TAB_COUNT = TABS.length;
// Cap to the content column on wide web so the charts + horizontal pager
// fit the same centered max-width column as the rest of the web app.
const SCREEN_W = getContentWidth(Dimensions.get("window").width);
const SWIPE_VELOCITY_THRESHOLD = 0.3;
const SWIPE_DISTANCE_THRESHOLD = SCREEN_W * 0.35;

// ─── relative date formatter ──────────────────────────────────────────────────

function formatRelativeDate(date: Date): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

// ─── exercise mode detection ──────────────────────────────────────────────────

type AnalyticsMode = 'weight' | 'bodyweight' | 'timed' | 'distance';

function getExerciseModes(sessions: WorkoutSession[]): Record<string, AnalyticsMode> {
  const modeMap: Record<string, AnalyticsMode> = {};
  for (const session of sessions) {
    for (const ex of session.exercises) {
      if (ex.name === 'Warm-up' || ex.name === 'Cooldown') continue;
      const working = ex.sets.filter(s => s.label !== 'W');
      if (working.some(s => (s.kg ?? 0) > 0))                                        modeMap[ex.name] = 'weight';
      else if (working.some(s => (s.meters ?? 0) > 0))                                modeMap[ex.name] = 'distance';
      else if (working.some(s => (s.minutes ?? 0) > 0 || (s.seconds ?? 0) > 0))      modeMap[ex.name] = 'timed';
      else                                                                             modeMap[ex.name] = 'bodyweight';
    }
  }
  return modeMap;
}

// ─── warm-up / cooldown stats helper ─────────────────────────────────────────

function computeSectionStats(sessions: WorkoutSession[], sectionName: string) {
  const present = sessions.filter((s) =>
    s.exercises.some((e) => e.name === sectionName)
  );
  const consistency = sessions.length > 0
    ? Math.round((present.length / sessions.length) * 100)
    : 0;
  const durations = present
    .map((s) => {
      const ex = s.exercises.find((e) => e.name === sectionName);
      if (!ex) return 0;
      return ex.sets.reduce((sum, set) => {
        const secs = (set.minutes ?? 0) * 60 + (set.seconds ?? 0);
        if (secs === 0) return sum;
        return sum + secs * Math.max(set.reps ?? 1, 1);
      }, 0);
    })
    .filter((d) => d > 0);
  const last = durations[durations.length - 1] ?? 0;
  const avgVal = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;
  return { consistency, last, avg: avgVal, count: present.length };
}

// ─── component ────────────────────────────────────────────────────────────────

const AnalyticsScreen: React.FC = () => {
  const { contentMaxWidth, isWide } = useResponsive();
  const rootWideStyle = contentMaxWidth
    ? { maxWidth: contentMaxWidth, alignSelf: "center" as const, width: "100%" as const }
    : null;
  // On wide web the sub-tabs live in the side rail; this screen reads the
  // selected one from the `tab` route param instead of the in-screen pill.
  const route = useRoute<RouteProp<RootTabParamList, "Analytics">>();
  const { workouts, isLoading } = useWorkouts();
  const { session: authSession } = useAuth();
  const { accent } = useAccent();
  const userId = authSession?.user.id ?? '';

  // tab
  const [tabIndex,     setTabIndex]     = useState(0);
  const [visitedTabs,  setVisitedTabs]  = useState<Set<number>>(new Set([0]));
  const tabIndexRef = useRef(0);

  // workout tab data
  const [selectedIndex,           setSelectedIndex]           = useState(0);
  const [durations,               setDurations]               = useState<number[]>([]);
  const [sessions,                setSessions]                = useState<WorkoutSession[]>([]);
  const [allSessions,             setAllSessions]             = useState<WorkoutSession[]>([]);
  const [pickerVisible,           setPickerVisible]           = useState(false);
  const [loadingData,             setLoadingData]             = useState(false);

  // ── animation ────────────────────────────────────────────────────────────────
  // Single Animated.Value representing the full pager offset.
  // Rest position for tab i = -i * SCREEN_W
  const translateX = useRef(new Animated.Value(0)).current;

  const snapToIndex = useCallback(
    (index: number, velocityX = 0) => {
      tabIndexRef.current = index;
      setTabIndex(index);
      setVisitedTabs(prev => new Set([...prev, index]));

      Animated.spring(translateX, {
        toValue: -index * SCREEN_W,
        useNativeDriver: true,
        velocity:  -velocityX,  // pass flick velocity through
        tension:   68,
        friction:  11,
        overshootClamping: false,
      }).start();
    },
    [translateX],
  );

  // Drive the pager from the side-rail sub-tab param on wide web.
  const railTab = route.params?.tab;
  useEffect(() => {
    if (isWide && typeof railTab === "number") snapToIndex(railTab);
  }, [railTab, isWide, snapToIndex]);

  // ── swipe gesture ────────────────────────────────────────────────────────────
  const dragStartValue = useRef(0);
  const isHorizontal   = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, gs) => {
        const horizontal = Math.abs(gs.dx) > Math.abs(gs.dy) * 1.8 && Math.abs(gs.dx) > 8;
        isHorizontal.current = horizontal;
        return horizontal;
      },
      onPanResponderGrant: () => {
        // Capture current animated value so we can offset from it
        translateX.stopAnimation(value => { dragStartValue.current = value; });
        isHorizontal.current = false;
      },
      onPanResponderMove: (_e, gs) => {
        if (!isHorizontal.current) return;
        const idx = tabIndexRef.current;
        let dx = gs.dx;

        // Rubber-band at edges
        if ((idx === 0 && dx > 0) || (idx === TAB_COUNT - 1 && dx < 0)) {
          dx *= 0.15;
        }
        translateX.setValue(dragStartValue.current + dx);
      },
      onPanResponderRelease: (_e, gs) => {
        const dx  = gs.dx;
        const vx  = gs.vx;
        const idx = tabIndexRef.current;

        const goNext = dx < -SWIPE_DISTANCE_THRESHOLD || vx < -SWIPE_VELOCITY_THRESHOLD;
        const goPrev = dx >  SWIPE_DISTANCE_THRESHOLD || vx >  SWIPE_VELOCITY_THRESHOLD;

        if      (goNext && idx < TAB_COUNT - 1) snapToIndex(idx + 1, vx);
        else if (goPrev && idx > 0)             snapToIndex(idx - 1, vx);
        else                                    snapToIndex(idx, vx);
      },
      onPanResponderTerminate: () => {
        snapToIndex(tabIndexRef.current, 0);
      },
    }),
  ).current;

  // ── data loading ─────────────────────────────────────────────────────────────

  const loadAllSessions = useCallback(async () => {
    if (!userId) return;
    try {
      const combined = await sbLoadAllSessions(userId);
      setAllSessions(combined);
    } catch { setAllSessions([]); }
  }, [userId]);

  const loadData = useCallback(async (index: number) => {
    if (!userId) return;
    setLoadingData(true);
    try {
      const workoutId = workouts[index]?.id ?? String(index);
      const [durations, sessions] = await Promise.all([
        loadDurationsForWorkout(userId, workoutId),
        loadSessionsForWorkout(userId, workoutId),
      ]);
      setDurations(durations);
      setSessions(sessions);
    } catch {
      setDurations([]); setSessions([]);
    } finally { setLoadingData(false); }
  }, [userId, workouts]);

  useFocusEffect(
    useCallback(() => {
      if (workouts.length > 0) {
        const safe = Math.min(selectedIndex, workouts.length - 1);
        setSelectedIndex(safe);
        loadData(safe);
      }
    }, [workouts, selectedIndex, loadData]),
  );

  // While the Analytics tab is focused, force every <Text> to render uppercase.
  // Restored on blur so other screens are unaffected.
  useFocusEffect(
    useCallback(() => {
      const TextAny = Text as unknown as { defaultProps?: { style?: TextStyle | TextStyle[] } };
      const original = TextAny.defaultProps;
      const baseStyle = original?.style;
      const overlay: TextStyle = { textTransform: "uppercase" };
      TextAny.defaultProps = {
        ...(original ?? {}),
        style: baseStyle ? ([] as TextStyle[]).concat(baseStyle, overlay) : overlay,
      };
      return () => {
        TextAny.defaultProps = original;
      };
    }, []),
  );

  useEffect(() => { loadData(selectedIndex); }, [selectedIndex]);
  useEffect(() => {
    if (visitedTabs.has(1) || visitedTabs.has(2)) loadAllSessions();
  }, [visitedTabs, loadAllSessions]);

  // ── guard states ─────────────────────────────────────────────────────────────

  const showBootSkeleton = useStableLoading(isLoading);
  const showTabSkeleton = useStableLoading(loadingData);
  if (showBootSkeleton) return <AnalyticsSkeleton />;

  // ── derived ──────────────────────────────────────────────────────────────────

  const hasWorkouts  = workouts.length > 0;
  const workout      = hasWorkouts ? workouts[selectedIndex] : null;
  const sessionCount = durations.length;
  const lastDur      = durations.length ? durations[durations.length - 1] : 0;
  const totalSets    = workout ? workout.sections.reduce((acc, s) => acc + s.rows.length, 0) : 0;
  const lastPerformedLabel = sessions.length > 0
    ? formatRelativeDate(new Date(sessions[sessions.length - 1].date))
    : "—";
  const muscleSets = muscleSetsFromTemplate(workout);
  const hasMuscleSets = Object.keys(muscleSets).length > 0;
  const sessionExerciseNames = Array.from(new Set(
    sessions.flatMap(s =>
      s.exercises.filter(e => e.name !== "Warm-up" && e.name !== "Cooldown").map(e => e.name)
    ),
  ));

  const exerciseModeMap = getExerciseModes(sessions);
  const weightExercises     = sessionExerciseNames.filter(n => exerciseModeMap[n] === 'weight');
  const bodyweightExercises = sessionExerciseNames.filter(n => exerciseModeMap[n] === 'bodyweight');
  const timedExercises      = sessionExerciseNames.filter(n => exerciseModeMap[n] === 'timed');
  const distanceExercises   = sessionExerciseNames.filter(n => exerciseModeMap[n] === 'distance');

  const warmUpStats   = workout?.showWarmUp   ? computeSectionStats(sessions, "Warm-up")  : null;
  const cooldownStats = workout?.showCooldown ? computeSectionStats(sessions, "Cooldown") : null;

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.screen, rootWideStyle]}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      {/* On wide web the sub-tabs live in the side rail, so the in-screen
          pill bar is hidden. */}
      {!isWide && (
        <View style={styles.header}>
          {/* Tab bar + dots */}
          <SwipeTabs
            tabs={TABS.map(t => t.label)}
            translateX={translateX}
            screenWidth={SCREEN_W}
            activeIndex={tabIndex}
            onTabPress={snapToIndex}
          />
        </View>
      )}

      {/* ── Pager ──────────────────────────────────────────────────────────── */}
      {/* Swipe is disabled on wide web — the rail drives the sub-tab. */}
      <View style={{ flex: 1, overflow: "hidden" }} {...(isWide ? {} : panResponder.panHandlers)}>
        <Animated.View
          style={{
            flex:           1,
            flexDirection:  "row",
            width:          SCREEN_W * TAB_COUNT,
            transform:      [{ translateX }],
          }}
        >

          {/* ── WORKOUT PAGE ─────────────────────────────────────────────── */}
          <View style={{ width: SCREEN_W, flex: 1 }}>
            {!hasWorkouts || !workout ? (
              <View style={styles.emptyPane}>
                <Feather name="bar-chart-2" size={40} color={colors.button1} />
                <Text style={styles.emptyTitle}>No workout to analyze</Text>
                <Text style={styles.emptySub}>Create a workout to track per-session progress</Text>
              </View>
            ) : (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.selectorLabel}>SELECT A WORKOUT</Text>
              <TouchableOpacity
                style={styles.selectorRow}
                onPress={() => setPickerVisible(true)}
                activeOpacity={0.75}
              >
                <Text style={styles.selectorText} numberOfLines={1}>
                  {workout.workoutName || `Workout ${selectedIndex + 1}`}
                </Text>
                <Feather name="chevron-down" size={16} color={accent} />
              </TouchableOpacity>

              {showTabSkeleton ? (
                <AnalyticsTabSkeleton />
              ) : (
                <>
                  <View style={{ gap: 10 }}>
                    <View style={[styles.cardRow, { marginBottom: 0 }]}>
                      <StatCard label="Sessions" value={sessionCount > 0 ? `${sessionCount}` : "—"} icon="activity"    />
                      <StatCard label="Last"     value={fmtDuration(lastDur)}                       icon="clock"       />
                    </View>
                    <View style={[styles.cardRow, { marginBottom: 0 }]}>
                      <StatCard label="Average"  value={fmtDuration(avg(durations))}                icon="trending-up" />
                      <StatCard label="Best"     value={fmtDuration(best(durations))}               icon="award"       />
                    </View>
                  </View>

                  {warmUpStats && warmUpStats.count > 0 && (
                    <View style={[styles.section, { paddingTop: 12 }]}>
                      <View style={[styles.cardHeader, { marginBottom: 8 }]}>
                        <Feather name="sunrise" size={14} color={accent} />
                        <Text style={[styles.cardTitle, { marginLeft: 6 }]}>Warm-up</Text>
                      </View>
                      <View style={styles.cardRow}>
                        <StatCard label="Last"        value={warmUpStats.last > 0 ? fmtDuration(warmUpStats.last) : "—"} icon="sunrise"      compact />
                        <StatCard label="Avg"         value={warmUpStats.avg  > 0 ? fmtDuration(warmUpStats.avg)  : "—"} icon="bar-chart-2"  compact />
                        <StatCard label="Consistency" value={`${warmUpStats.consistency}%`}                               icon="check-circle" compact />
                      </View>
                    </View>
                  )}

                  {cooldownStats && cooldownStats.count > 0 && (
                    <View style={styles.section}>
                      <View style={[styles.cardHeader, { marginBottom: 8 }]}>
                        <Feather name="sunset" size={14} color={accent} />
                        <Text style={[styles.cardTitle, { marginLeft: 6 }]}>Cooldown</Text>
                      </View>
                      <View style={styles.cardRow}>
                        <StatCard label="Last"        value={cooldownStats.last > 0 ? fmtDuration(cooldownStats.last) : "—"} icon="sunset"       compact />
                        <StatCard label="Avg"         value={cooldownStats.avg  > 0 ? fmtDuration(cooldownStats.avg)  : "—"} icon="bar-chart-2"  compact />
                        <StatCard label="Consistency" value={`${cooldownStats.consistency}%`}                                 icon="check-circle" compact />
                      </View>
                    </View>
                  )}

                  {/* {sessions.length >= 2 && Object.keys(weightDeltas).length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>vs Last Session</Text>
                      <View style={deltaStyles.container}>
                        {Object.entries(weightDeltas).map(([name, delta]) => {
                          const isUp   = delta > 0;
                          const isDown = delta < 0;
                          return (
                            <View key={`delta-${name}`} style={deltaStyles.row}>
                              <Text style={deltaStyles.name} numberOfLines={1}>{name}</Text>
                              <View style={[deltaStyles.badge, isUp && deltaStyles.badgeUp, isDown && deltaStyles.badgeDown]}>
                                <Feather
                                  name={isUp ? "trending-up" : isDown ? "trending-down" : "minus"}
                                  size={11}
                                  color={isUp ? accent : isDown ? "#E05C5C" : colors.button1}
                                />
                                <Text style={[deltaStyles.badgeText, isUp && deltaStyles.badgeTextUp, isDown && deltaStyles.badgeTextDown]}>
                                  {" "}{isUp ? "+" : ""}{delta}kg
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ) */}

                  <View style={styles.section}>
                    <View style={[styles.cardHeader, { marginBottom: 8 }]}>
                      <Feather name="grid" size={14} color={accent} />
                      <Text style={[styles.cardTitle, { marginLeft: 6 }]}>Workout Structure</Text>
                    </View>
                    <View style={[styles.card, { marginBottom: 0 }]}>
                      <View style={styles.structureRow}>
                        <View style={styles.structureItem}>
                          <Text style={styles.structureValue} numberOfLines={1} adjustsFontSizeToFit>{workout.sections.length}</Text>
                          <Text style={styles.structureLabel} numberOfLines={1} adjustsFontSizeToFit>Exercises</Text>
                        </View>
                        <View style={styles.structureDivider} />
                        <View style={styles.structureItem}>
                          <Text style={styles.structureValue} numberOfLines={1} adjustsFontSizeToFit>{totalSets}</Text>
                          <Text style={styles.structureLabel} numberOfLines={1} adjustsFontSizeToFit>Total Sets</Text>
                        </View>
                        <View style={styles.structureDivider} />
                        <View style={styles.structureItem}>
                          <Text style={styles.structureValue} numberOfLines={1} adjustsFontSizeToFit>{sessionCount > 0 ? sessionCount : "—"}</Text>
                          <Text style={styles.structureLabel} numberOfLines={1} adjustsFontSizeToFit>Times Done</Text>
                        </View>
                        <View style={styles.structureDivider} />
                        <View style={styles.structureItem}>
                          <Text style={styles.structureValue} numberOfLines={1} adjustsFontSizeToFit>{lastPerformedLabel}</Text>
                          <Text style={styles.structureLabel} numberOfLines={1} adjustsFontSizeToFit>Last Done</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {hasMuscleSets && (
                    <View style={styles.section}>
                      <View style={[styles.cardHeader, { marginBottom: 8 }]}>
                        <Feather name="target" size={14} color={accent} />
                        <Text style={[styles.cardTitle, { marginLeft: 6 }]}>Targeted Muscles</Text>
                      </View>
                      <MuscleVolumeChart volumeByGroup={muscleSets} />
                    </View>
                  )}

                  {(weightExercises.length > 0 || bodyweightExercises.length > 0 || timedExercises.length > 0 || distanceExercises.length > 0) && (
                    <View style={styles.section}>
                      <View style={[styles.cardHeader, { marginBottom: 8 }]}>
                        <Feather name="trending-up" size={14} color={accent} />
                        <Text style={[styles.cardTitle, { marginLeft: 6 }]}>Exercise Progression</Text>
                      </View>
                      <View style={[styles.card, { marginBottom: 0 }]}>
                        <ExerciseProgression
                          sessions={sessions}
                          weightExercises={weightExercises}
                          bodyweightExercises={bodyweightExercises}
                          timedExercises={timedExercises}
                          distanceExercises={distanceExercises}
                        />
                      </View>
                    </View>
                  )}

                  <View style={styles.section}>
                    <View style={[styles.cardHeader, { marginBottom: 8 }]}>
                      <Feather name="activity" size={14} color={accent} />
                      <Text style={[styles.cardTitle, { marginLeft: 6 }]}>RPE Over Time</Text>
                    </View>
                    <View style={[styles.card, { marginBottom: 0 }]}>
                      <RPEProgression workouts={workouts} sessions={sessions} workoutId={workout.id} />
                    </View>
                  </View>
                </>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
            )}
          </View>

          {/* ── WEEKLY PAGE ──────────────────────────────────────────────── */}
          <View style={{ width: SCREEN_W, flex: 1 }}>
            {visitedTabs.has(1) && <WeeklyDigest workouts={workouts} />}
          </View>

          {/* ── OVERALL PAGE ─────────────────────────────────────────────── */}
          <View style={{ width: SCREEN_W, flex: 1 }}>
            {visitedTabs.has(2) && (
              allSessions.length === 0 ? (
                <View style={styles.emptyPane}>
                  <Feather name="trending-up" size={40} color={colors.button1} />
                  <Text style={styles.emptyTitle}>No sessions on record</Text>
                  <Text style={styles.emptySub}>Log a session to unlock all-time analytics</Text>
                </View>
              ) : (
                <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                  <OverallStats
                    workouts={workouts}
                    allSessions={allSessions}
                  />
                  <View style={{ height: 40 }} />
                </ScrollView>
              )
            )}
          </View>

        </Animated.View>
      </View>

      <WorkoutPicker
        visible={pickerVisible}
        workouts={workouts}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
};

// ─── loading silhouettes ──────────────────────────────────────────────────────

function AnalyticsSkeleton() {
  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingHorizontal: 16, gap: 12 }]}>
        <Skeleton height={36} radius={10} />
      </View>
      <View style={[styles.scroll, { paddingTop: 8 }]}>
        <Skeleton width="40%" height={11} radius={3} style={{ marginBottom: 10 }} />
        <Skeleton height={44} radius={10} style={{ marginBottom: 18 }} />
        <View style={{ gap: 10 }}>
          <SkeletonStatRow />
          <SkeletonStatRow />
        </View>
        <View style={{ height: 18 }} />
        <SkeletonChartCard height={200} />
        <View style={{ height: 14 }} />
        <SkeletonChartCard height={220} />
      </View>
    </View>
  );
}

function AnalyticsTabSkeleton() {
  return (
    <View style={{ gap: 10, marginTop: 4 }}>
      <SkeletonStatRow />
      <SkeletonStatRow />
      <View style={{ height: 6 }} />
      <SkeletonChartCard height={180} />
      <SkeletonChartCard height={220} />
    </View>
  );
}

export default AnalyticsScreen;


