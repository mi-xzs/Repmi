// src/components/analytics/WeeklyDigest.tsx

import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, Text, View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { WorkoutData } from '../../types/exercise';
import { WorkoutSession } from '../../screens/WorkoutScreen';
import { colors } from '../../theme/colors';
import { useAccent } from '../../services/SettingsContext';
import { dayKey, fmtDuration } from '../../utils/analyticsHelpers';
import { useProfile } from '../../services/ProfileContext';
import { useAuth } from '../../services/AuthContext';
import { loadAllSessions as sbLoadAllSessions } from '../../services/sessionService';
import { styles as analyticsStyles } from '../../screens/Analytics.Styles';
import { useResponsive } from '../../hooks/useResponsive';
import MuscleVolumeChart from './MuscleVolumeChart';

// ─── types ────────────────────────────────────────────────────────────────────

interface Props {
  workouts: WorkoutData[];
}

interface WeekSummary {
  totalSessions: number;
  totalDuration: number; // seconds
  totalVolume: number; // kg·reps
  totalSets: number;
  topExercise: string | null;
  topMuscles: { name: string; sets: number; kg: number; reps: number }[];
  muscleSets: Record<string, number>;
  muscleKg: Record<string, number>;
  workoutBreakdown: { name: string; count: number }[];
  trainedDays: Set<string>;
  prevWeekVolume: number;
  prevWeekSessions: number;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday-based
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function sessionVolume(session: WorkoutSession): number {
  return session.exercises.reduce(
    (total, ex) =>
      total +
      ex.sets.reduce((s, set) => s + (set.label === 'W' ? 0 : (set.kg ?? 0) * (set.reps ?? 0)), 0),
    0,
  );
}

// keyword → muscle group; order matters — specific phrases before short keywords
const MUSCLE_KEYWORDS: [string, string][] = [
  ['bench press', 'Chest'],
  ['chest press', 'Chest'],
  ['chest fly', 'Chest'],
  ['pec deck', 'Chest'],
  ['cable crossover', 'Chest'],
  ['push-up', 'Chest'],
  ['push up', 'Chest'],
  ['flye', 'Chest'],
  ['lat pulldown', 'Back'],
  ['lat pull', 'Back'],
  ['pull-up', 'Back'],
  ['pullup', 'Back'],
  ['pull up', 'Back'],
  ['chin-up', 'Back'],
  ['chin up', 'Back'],
  ['cable row', 'Back'],
  ['barbell row', 'Back'],
  ['dumbbell row', 'Back'],
  ['t-bar row', 'Back'],
  ['seated row', 'Back'],
  ['pullover', 'Back'],
  ['shoulder press', 'Shoulders'],
  ['overhead press', 'Shoulders'],
  ['military press', 'Shoulders'],
  ['lateral raise', 'Shoulders'],
  ['front raise', 'Shoulders'],
  ['rear delt', 'Shoulders'],
  ['arnold press', 'Shoulders'],
  ['leg curl', 'Hamstrings'],
  ['nordic curl', 'Hamstrings'],
  ['hamstring', 'Hamstrings'],
  ['romanian deadlift', 'Hamstrings'],
  ['stiff leg', 'Hamstrings'],
  ['rdl', 'Hamstrings'],
  ['curl', 'Biceps'],
  ['bicep', 'Biceps'],
  ['tricep', 'Triceps'],
  ['skull crusher', 'Triceps'],
  ['pushdown', 'Triceps'],
  ['close grip bench', 'Triceps'],
  ['deadlift', 'Back'],
  ['hip thrust', 'Glutes'],
  ['glute bridge', 'Glutes'],
  ['glute', 'Glutes'],
  ['kickback', 'Glutes'],
  ['sumo squat', 'Glutes'],
  ['leg press', 'Quads'],
  ['leg extension', 'Quads'],
  ['hack squat', 'Quads'],
  ['front squat', 'Quads'],
  ['bulgarian split', 'Quads'],
  ['lunge', 'Quads'],
  ['squat', 'Quads'],
  ['calf raise', 'Calves'],
  ['calf', 'Calves'],
  ['plank', 'Core'],
  ['crunch', 'Core'],
  ['sit-up', 'Core'],
  ['sit up', 'Core'],
  ['ab rollout', 'Core'],
  ['russian twist', 'Core'],
  ['leg raise', 'Core'],
  ['hollow hold', 'Core'],
  ['cable crunch', 'Core'],
];

function muscleForExercise(name: string): string | null {
  const lower = name.toLowerCase();
  for (const [keyword, muscle] of MUSCLE_KEYWORDS) {
    if (lower.includes(keyword)) return muscle;
  }
  return null;
}

function buildSummary(allSessions: WorkoutSession[], workouts: WorkoutData[]): WeekSummary {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const thisSessions: WorkoutSession[] = [];
  const prevSessions: WorkoutSession[] = [];

  for (const s of allSessions) {
    const d = new Date(s.date);
    if (d >= weekStart) thisSessions.push(s);
    else if (d >= prevWeekStart) prevSessions.push(s);
  }

  // exercise volume map for top exercise
  const exerciseVol: Record<string, number> = {};
  const muscleSets: Record<string, number> = {};
  const muscleKg: Record<string, number> = {};
  const muscleReps: Record<string, number> = {};
  const workoutCounts: Record<string, number> = {};
  let totalVolume = 0;
  let totalSets = 0;
  const trainedDays = new Set<string>();

  for (const s of thisSessions) {
    trainedDays.add(dayKey(new Date(s.date)));
    totalVolume += sessionVolume(s);
    for (const ex of s.exercises) {
      if (ex.name === 'Warm-up' || ex.name === 'Cooldown') continue;
      const muscle = muscleForExercise(ex.name);
      let workingSetCount = 0;
      for (const set of ex.sets) {
        if (set.label !== 'W') {
          totalSets++;
          workingSetCount++;
          if (muscle) {
            muscleKg[muscle] = (muscleKg[muscle] ?? 0) + (set.kg ?? 0) * (set.reps ?? 0);
            muscleReps[muscle] = (muscleReps[muscle] ?? 0) + (set.reps ?? 0);
          }
        }
      }
      exerciseVol[ex.name] =
        (exerciseVol[ex.name] ?? 0) +
        ex.sets.reduce(
          (s2, set) => s2 + (set.label === 'W' ? 0 : (set.kg ?? 0) * (set.reps ?? 0)),
          0,
        );
      if (muscle) muscleSets[muscle] = (muscleSets[muscle] ?? 0) + workingSetCount;
    }
    // workout name
    const w = workouts.find((w) =>
      s.exercises.some((e) => w.sections.some((sec) => sec.exerciseName === e.name)),
    );
    const name = w?.workoutName ?? 'Workout';
    workoutCounts[name] = (workoutCounts[name] ?? 0) + 1;
  }

  const topExercise = Object.entries(exerciseVol).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const topMuscles = Object.entries(muscleSets)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, sets]) => ({
      name,
      sets,
      kg: Math.round(muscleKg[name] ?? 0),
      reps: muscleReps[name] ?? 0,
    }));
  const workoutBreakdown = Object.entries(workoutCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalSessions: thisSessions.length,
    totalDuration: thisSessions.reduce((s, sess) => s + (sess.duration ?? 0), 0),
    totalVolume,
    totalSets,
    topExercise,
    topMuscles,
    muscleSets,
    muscleKg,
    workoutBreakdown,
    trainedDays,
    prevWeekVolume: prevSessions.reduce((s, sess) => s + sessionVolume(sess), 0),
    prevWeekSessions: prevSessions.length,
  };
}

// ─── delta badge ──────────────────────────────────────────────────────────────

const DeltaBadge: React.FC<{ current: number; prev: number; unit?: string }> = ({
  current,
  prev,
  unit = '',
}) => {
  const { accent } = useAccent();
  if (prev === 0 && current === 0) return null;
  const diff = current - prev;
  const pct = prev > 0 ? Math.round((diff / prev) * 100) : null;
  const isUp = diff >= 0;
  const label =
    pct !== null
      ? `${isUp ? '+' : ''}${pct}%`
      : diff > 0
        ? `+${Math.round(diff)}${unit}`
        : `${Math.round(diff)}${unit}`;

  return (
    <View
      style={[
        styles.deltaBadge,
        { backgroundColor: isUp ? accent + '1F' : 'rgba(180,60,60,0.12)' },
      ]}
    >
      <Feather
        name={isUp ? 'trending-up' : 'trending-down'}
        size={10}
        color={isUp ? accent : '#E05C5C'}
      />
      <Text
        style={[styles.deltaText, { color: isUp ? accent : '#E05C5C' }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {' '}
        {label} vs last week
      </Text>
    </View>
  );
};

// ─── day dots ─────────────────────────────────────────────────────────────────

const WeekDots: React.FC<{ trainedDays: Set<string> }> = ({ trainedDays }) => {
  const { accent } = useAccent();
  const now = new Date();
  const weekStart = startOfWeek(now);
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <View style={styles.dotsRow}>
      {days.map((d, i) => {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + i);
        const key = dayKey(day);
        const trained = trainedDays.has(key);
        const isToday = dayKey(now) === key;
        return (
          <View key={i} style={styles.dotCell}>
            <View
              style={[
                styles.dot,
                trained && { backgroundColor: accent },
                isToday && !trained && styles.dotToday,
              ]}
            />
            <Text style={[styles.dotLabel, isToday && styles.dotLabelToday]}>{d}</Text>
          </View>
        );
      })}
    </View>
  );
};

// ─── main component ───────────────────────────────────────────────────────────

const WeeklyDigest: React.FC<Props> = ({ workouts }) => {
  const { accent } = useAccent();
  const { isWide, isMobile } = useResponsive();
  // Pair the stat cards two-per-row only on mobile web (narrow browser <768px);
  // native phones keep their single-column layout.
  const isMobileWeb = Platform.OS === 'web' && isMobile;
  const { profile } = useProfile();
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id ?? '';
  const weeklyTarget = profile?.weekly_target ?? 3;
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const all = await sbLoadAllSessions(userId);
      setSummary(buildSummary(all, workouts));
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [userId, workouts]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.highlight} />
      </View>
    );
  }

  if (!summary || summary.totalSessions === 0) {
    return (
      <View style={analyticsStyles.emptyPane}>
        <Feather name="calendar" size={40} color={colors.button1} />
        <Text style={analyticsStyles.emptyTitle}>A quiet week</Text>
        <Text style={analyticsStyles.emptySub}>Log a session to fill your weekly digest</Text>
      </View>
    );
  }

  const {
    totalSessions,
    totalDuration,
    totalVolume,
    totalSets,
    topExercise,
    topMuscles,
    muscleSets,
    muscleKg,
    workoutBreakdown,
    trainedDays,
    prevWeekVolume,
    prevWeekSessions,
  } = summary;

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Week heading */}
      <Text style={styles.weekTitle}>This Week</Text>
      <WeekDots trainedDays={trainedDays} />

      {/* Top row: 7 stat-like cards spread evenly across the full width */}
      <View
        style={
          isWide
            ? { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'stretch', marginBottom: 14 }
            : isMobileWeb
              ? { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'stretch', marginBottom: 14 }
              : { gap: 12, marginBottom: 14 }
        }
      >
        {/* 1. Sessions */}
        <View style={[styles.gridCard, isWide && { flexGrow: 1, flexBasis: '30%', width: undefined, minWidth: 180, minHeight: 220 }]}>
          <Feather name="activity" size={16} color={accent} />
          <Text style={styles.gridValue} numberOfLines={1} adjustsFontSizeToFit>
            {totalSessions}
          </Text>
          <DeltaBadge current={totalSessions} prev={prevWeekSessions} />
          <View style={styles.gridSpacer} />
          <Text style={styles.gridLabel} numberOfLines={1} adjustsFontSizeToFit>
            Sessions
          </Text>
        </View>

        {/* 2. Total Time */}
        <View style={[styles.gridCard, isWide && { flexGrow: 1, flexBasis: '30%', width: undefined, minWidth: 180, minHeight: 220 }]}>
          <Feather name="clock" size={16} color={accent} />
          <Text style={styles.gridValue} numberOfLines={1} adjustsFontSizeToFit>
            {fmtDuration(totalDuration)}
          </Text>
          <View style={styles.gridSpacer} />
          <Text style={styles.gridLabel} numberOfLines={1} adjustsFontSizeToFit>
            Total Time
          </Text>
        </View>

        {/* 3. Total Sets */}
        <View style={[styles.gridCard, isWide && { flexGrow: 1, flexBasis: '30%', width: undefined, minWidth: 180, minHeight: 220 }]}>
          <Feather name="layers" size={16} color={accent} />
          <Text style={styles.gridValue} numberOfLines={1} adjustsFontSizeToFit>
            {totalSets}
          </Text>
          <View style={styles.gridSpacer} />
          <Text style={styles.gridLabel} numberOfLines={1} adjustsFontSizeToFit>
            Total Sets
          </Text>
        </View>

        {/* 4. Volume */}
        <View style={[styles.gridCard, isWide && { flexGrow: 1, flexBasis: '30%', width: undefined, minWidth: 180, minHeight: 220 }]}>
          <Feather name="trending-up" size={16} color={accent} />
          <Text style={styles.gridValue} numberOfLines={1} adjustsFontSizeToFit>
            {`${Math.round(totalVolume).toLocaleString()}kg`}
          </Text>
          <DeltaBadge current={totalVolume} prev={prevWeekVolume} unit="kg" />
          <View style={styles.gridSpacer} />
          <Text style={styles.gridLabel} numberOfLines={1} adjustsFontSizeToFit>
            Volume
          </Text>
        </View>

        {/* 5. Top Exercise */}
        {topExercise && (
          <View style={[styles.gridCard, isWide && { flexGrow: 1, flexBasis: '30%', width: undefined, minWidth: 180, minHeight: 220 }]}>
            <Feather name="star" size={16} color={accent} />
            <Text style={styles.gridValue} numberOfLines={1} adjustsFontSizeToFit>
              {topExercise}
            </Text>
            <View style={styles.gridSpacer} />
            <Text style={styles.gridLabel} numberOfLines={1} adjustsFontSizeToFit>
              Top Exercise
            </Text>
          </View>
        )}

        {/* 6. Top Muscle */}
        {topMuscles.length > 0 && (
          <View style={[styles.gridCard, isWide && { flexGrow: 1, flexBasis: '30%', width: undefined, minWidth: 180, minHeight: 220 }]}>
            <Feather name="target" size={16} color={accent} />
            <Text style={styles.gridValue} numberOfLines={1} adjustsFontSizeToFit>
              {topMuscles[0].name}
            </Text>
            <View style={styles.gridSpacer} />
            <Text style={styles.gridLabel} numberOfLines={1} adjustsFontSizeToFit>
              Top Muscle · {topMuscles[0].sets} sets
            </Text>
          </View>
        )}

        {/* 7. Consistency */}
        <View style={[styles.gridCard, isWide && { flexGrow: 1, flexBasis: '30%', width: undefined, minWidth: 180, minHeight: 220 }]}>
          <Feather name="zap" size={16} color={accent} />
          <Text style={styles.gridValue} numberOfLines={1} adjustsFontSizeToFit>
            {totalSessions}/{weeklyTarget}
          </Text>
          <View style={styles.gridSpacer} />
          <Text style={styles.gridLabel} numberOfLines={1} adjustsFontSizeToFit>
            Consistency
          </Text>
        </View>
      </View>

      {/* Bottom row: Muscle Distribution + Breakdown side by side (like Exercise Progression + RPE) */}
      <View
        style={
          isWide
            ? { flexDirection: 'row', gap: 14, alignItems: 'stretch' }
            : { gap: 12 }
        }
      >
        {Object.keys(muscleSets).length > 0 && (
          <View style={isWide ? { flex: 1 } : undefined}>
            <View style={[styles.card, { marginBottom: 0 }, isWide && { flex: 1 }]}>
              <View style={styles.cardHeader}>
                <Feather name="bar-chart" size={14} color={accent} />
                <Text style={styles.cardTitle}> Muscle Distribution</Text>
              </View>
              <View style={isWide ? { flex: 1 } : undefined}>
                <MuscleVolumeChart volumeByGroup={muscleSets} kgByGroup={muscleKg} />
              </View>
            </View>
          </View>
        )}

        {workoutBreakdown.length > 0 &&
          (() => {
            const counts: Record<string, number> = {};
            for (const w of workoutBreakdown) counts[w.name] = w.count;
            return (
              <View style={isWide ? { flex: 1 } : undefined}>
                <View style={[styles.card, { marginBottom: 0 }, isWide && { flex: 1, minHeight: 300 }]}>
                  <View style={styles.cardHeader}>
                    <Feather name="bar-chart-2" size={14} color={accent} />
                    <Text style={styles.cardTitle}> Breakdown</Text>
                  </View>
                  <View style={isWide ? { flex: 1 } : undefined}>
                    <MuscleVolumeChart volumeByGroup={counts} unit="times" modalTitle="Breakdown" />
                  </View>
                </View>
              </View>
            );
          })()}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

export default WeeklyDigest;

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  weekTitle: {
    color: colors.titleText,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 14,
  },

  // Day dots
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  dotCell: {
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.button3,
  },
  // dotTrained backgroundColor now applied inline via the accent hook.
  dotToday: {
    borderWidth: 1.5,
    borderColor: colors.highlight,
  },
  dotLabel: {
    color: colors.titleText,
    fontSize: 10,
    fontWeight: '600',
  },
  dotLabelToday: {
    color: colors.titleText,
  },

  // Stats grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: 10,
    marginBottom: 16,
  },
  gridCard: {
    backgroundColor: colors.container,
    borderRadius: 14,
    padding: 14,
    width: '47.5%',
    minHeight: 130,
    gap: 4,
  },
  gridSpacer: {
    flex: 1,
  },
  gridValue: {
    color: colors.titleText,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gridLabel: {
    color: colors.titleText,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Delta badge
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginTop: 4,
  },
  deltaText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    flexShrink: 1,
  },

  // Card
  card: {
    backgroundColor: colors.container,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    color: colors.titleText,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  // Top exercise
  topExerciseName: {
    color: colors.titleText,
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  topExerciseSub: {
    color: colors.titleText,
    fontSize: 12,
  },

  // Top muscle stat strip
  muscleStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.button3,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  muscleStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  muscleStatValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  muscleStatLabel: {
    color: colors.titleText,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  muscleStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.button2,
  },

  // Consistency
  consistencyText: {
    color: colors.titleText,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});
