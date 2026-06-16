

import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { styles } from '../../screens/Analytics.Styles';
import { colors } from '../../theme/colors';
import { useAccent } from '../../services/SettingsContext';
import { WorkoutData } from '../../types/exercise';
import { WorkoutSession } from '../../screens/WorkoutScreen';
import {
  computeOverall,
  fmtDuration,
  fmtVolume,
  getCurrentStreak,
  getLongestStreak,
  muscleForExercise,
} from '../../utils/analyticsHelpers';
import { useProfile } from '../../services/ProfileContext';
import { useResponsive } from '../../hooks/useResponsive';
import StatCard from './StatCard';
import RadarChart from './RadarChart';
import StreakCalendar from './StreakCalendar';
import MuscleVolumeChart from './MuscleVolumeChart';
import AnimatedBar from './AnimatedBar';

function computeTopMuscles(
  sessions: WorkoutSession[],
): { name: string; sets: number; kg: number; reps: number }[] {
  const muscleSets: Record<string, number> = {};
  const muscleKg: Record<string, number> = {};
  const muscleReps: Record<string, number> = {};
  for (const session of sessions) {
    for (const ex of session.exercises) {
      if (ex.name === 'Warm-up' || ex.name === 'Cooldown') continue;
      const muscle = muscleForExercise(ex.name);
      if (!muscle) continue;
      for (const set of ex.sets) {
        if (set.label !== 'W') {
          muscleSets[muscle] = (muscleSets[muscle] ?? 0) + 1;
          muscleKg[muscle] = (muscleKg[muscle] ?? 0) + (set.kg ?? 0) * (set.reps ?? 0);
          muscleReps[muscle] = (muscleReps[muscle] ?? 0) + (set.reps ?? 0);
        }
      }
    }
  }
  return Object.entries(muscleSets)
    .sort((a, b) => b[1] - a[1])
    .map(([name, sets]) => ({
      name,
      sets,
      kg: Math.round(muscleKg[name] ?? 0),
      reps: muscleReps[name] ?? 0,
    }));
}

function getConsistencyScore(sessions: WorkoutSession[], weeklyTarget: number): number {
  if (sessions.length === 0) return 0;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const recent = sessions.filter((s) => new Date(s.date) >= cutoff);
  const expected = weeklyTarget * (90 / 7);
  return Math.min(100, Math.round((recent.length / expected) * 100));
}

// types 

interface Props {
  workouts: WorkoutData[];
  allSessions: WorkoutSession[];
}

// component

const OverallStats: React.FC<Props> = ({ workouts, allSessions }) => {
  const { accent } = useAccent();
  const { isWide, isMobile } = useResponsive();
  const isMobileWeb = Platform.OS === 'web' && isMobile;
  const { profile } = useProfile();
  const data = useMemo(() => computeOverall(workouts, allSessions), [workouts, allSessions]);
  const weeklyTarget = profile?.weekly_target ?? 3;
  const currentStreak = useMemo(() => getCurrentStreak(allSessions), [allSessions]);
  const longestStreak = useMemo(() => getLongestStreak(allSessions), [allSessions]);
  const consistency = useMemo(
    () => getConsistencyScore(allSessions, weeklyTarget),
    [allSessions, weeklyTarget],
  );
  const [showConsistencyInfo, setShowConsistencyInfo] = useState(false);
  const topMuscles = useMemo(() => computeTopMuscles(allSessions), [allSessions]);
  const muscleVolume = useMemo(() => {
    const sets: Record<string, number> = {};
    const kg: Record<string, number> = {};
    for (const m of topMuscles) {
      sets[m.name] = m.sets;
      kg[m.name] = m.kg;
    }
    return { sets, kg };
  }, [topMuscles]);

  const maxVol = data.topExercisesByVolume[0]?.volume ?? 1;

  if (Platform.OS !== 'web') {
    return (
      <View style={{ gap: 16 }}>

        {/* summary stat cards*/}
        <View style={localStyles.statGrid}>
          <View style={[styles.cardRow, localStyles.statRow]}>
            <StatCard label="Sessions"   value={`${data.totalSessions}`}              icon="activity"    />
            <StatCard label="Total Time" value={fmtDuration(data.totalDuration)}      icon="clock"       />
          </View>
          <View style={[styles.cardRow, localStyles.statRow]}>
            <StatCard label="Per Week"   value={`${data.weeklyFrequency}`}            icon="calendar"    />
            <StatCard label="Weight"     value={fmtVolume(data.totalVolume)}          icon="trending-up" />
          </View>
          <View style={[styles.cardRow, localStyles.statRow]}>
            <StatCard label="Total Reps" value={`${data.totalReps.toLocaleString()}`} icon="repeat"      />
            <StatCard label="Total Sets" value={`${data.totalSets.toLocaleString()}`} icon="layers"      />
          </View>
        </View>

        {/* top - volume */}
        {data.topExercisesByVolume.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Exercises by Volume</Text>
            <View style={styles.weightLog}>
              {data.topExercisesByVolume.map((ex, i) => (
                <View key={`overall-${ex.name}`} style={styles.weightLogRow}>
                  <View style={styles.weightLogNameRow}>
                    <Text style={styles.weightLogDate} numberOfLines={2}>
                      {ex.name}
                    </Text>
                    <Text style={styles.weightLogKg} numberOfLines={1}>
                      {fmtVolume(ex.volume)}
                    </Text>
                  </View>
                  <AnimatedBar
                    percent={Math.round((ex.volume / maxVol) * 100)}
                    delay={Math.min(i, 6) * 60}
                    trackStyle={styles.weightLogBarTrack}
                    fillStyle={[styles.weightLogBarFill, { backgroundColor: accent }]}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* radar chart */}
        <View style={{ flex: 1 }}>
          <RadarChart
            data={data.topExercisesByFreq}
            title="Exercises"
            color="accent"
            emptyMessage="No exercises logged"
          />
        </View>

        {/* top muscle trained */}
        {topMuscles.length > 0 && (() => {
          const { name, sets, kg, reps } = topMuscles[0];
          return (
            <View style={muscleStyles.card}>
              <View style={muscleStyles.cardHeader}>
                <Feather name="target" size={14} color={accent} />
                <Text style={muscleStyles.cardTitle}>  Top Muscle</Text>
              </View>
              <Text style={muscleStyles.muscleName}>{name}</Text>
              <Text style={muscleStyles.muscleSub}>Most trained muscle overall</Text>
              <View style={muscleStyles.statStrip}>
                {kg > 0 && (
                  <>
                    <View style={muscleStyles.statItem}>
                      <Text style={[muscleStyles.statValue, { color: accent }]}>{kg.toLocaleString()}</Text>
                      <Text style={muscleStyles.statLabel}>kg</Text>
                    </View>
                    <View style={muscleStyles.divider} />
                  </>
                )}
                <View style={muscleStyles.statItem}>
                  <Text style={[muscleStyles.statValue, { color: accent }]}>{sets}</Text>
                  <Text style={muscleStyles.statLabel}>sets</Text>
                </View>
                {reps > 0 && (
                  <>
                    <View style={muscleStyles.divider} />
                    <View style={muscleStyles.statItem}>
                      <Text style={[muscleStyles.statValue, { color: accent }]}>{reps.toLocaleString()}</Text>
                      <Text style={muscleStyles.statLabel}>reps</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          );
        })()}

        {/*muscle distribution*/}
        {topMuscles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Muscle Distribution</Text>
            <MuscleVolumeChart
              volumeByGroup={muscleVolume.sets}
              kgByGroup={muscleVolume.kg}
            />
          </View>
        )}

        {/*consistency*/}
        <View style={styles.section}>
          <View style={localStyles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Consistency</Text>
            <TouchableOpacity
              onPress={() => setShowConsistencyInfo(v => !v)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="info" size={14} color={colors.titleText} />
            </TouchableOpacity>
          </View>
          {showConsistencyInfo && (
            <View style={localStyles.infoBox}>
              <Text style={localStyles.infoText}>
                Based on your last 90 days. Expected sessions = your weekly target × (90 ÷ 7). Consistency = actual ÷ expected, capped at 100%.
              </Text>
            </View>
          )}
          <View style={styles.cardRow}>
            <StatCard label="Streak" value={`${currentStreak}d`} icon="zap"      compact />
            <StatCard label="Best"   value={`${longestStreak}d`} icon="award"    compact />
            <StatCard label="90-day" value={`${consistency}%`}   icon="calendar" compact />
          </View>
          <AnimatedBar
            percent={consistency}
            delay={120}
            trackStyle={consistencyStyles.barTrack}
            fillStyle={[consistencyStyles.barFill, { backgroundColor: accent }]}
          />
          <Text style={consistencyStyles.hint}>
            {consistency >= 80 ? 'Exceptional consistency'
              : consistency >= 50 ? 'Keep building the habit'
              : consistency > 0  ? 'Every session counts'
              : 'Start your journey'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session History</Text>
          <StreakCalendar sessions={allSessions} />
        </View>

      </View>
    );
  }

  return (
    <View style={{ gap: 16 }}>
      <View
        style={
          isWide
            ? { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'stretch' }
            : isMobileWeb
              ? { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' }
              : { gap: 12 }
        }
      >
        <View
          style={
            isWide
              ? {
                  flexGrow: 1,
                  flexBasis: '30%',
                  minWidth: 180,
                  minHeight: 220,
                  flexDirection: 'row',
                }
              : isMobileWeb
                ? { flexGrow: 1, flexBasis: '47%', flexDirection: 'row' }
                : { flexDirection: 'row' }
          }
        >
          <StatCard label="Sessions" value={`${data.totalSessions}`} icon="activity" />
        </View>
        <View
          style={
            isWide
              ? {
                  flexGrow: 1,
                  flexBasis: '30%',
                  minWidth: 180,
                  minHeight: 220,
                  flexDirection: 'row',
                }
              : isMobileWeb
                ? { flexGrow: 1, flexBasis: '47%', flexDirection: 'row' }
                : { flexDirection: 'row' }
          }
        >
          <StatCard label="Total Time" value={fmtDuration(data.totalDuration)} icon="clock" />
        </View>
        <View
          style={
            isWide
              ? {
                  flexGrow: 1,
                  flexBasis: '30%',
                  minWidth: 180,
                  minHeight: 220,
                  flexDirection: 'row',
                }
              : isMobileWeb
                ? { flexGrow: 1, flexBasis: '47%', flexDirection: 'row' }
                : { flexDirection: 'row' }
          }
        >
          <StatCard label="Per Week" value={`${data.weeklyFrequency}`} icon="calendar" />
        </View>
        <View
          style={
            isWide
              ? {
                  flexGrow: 1,
                  flexBasis: '30%',
                  minWidth: 180,
                  minHeight: 220,
                  flexDirection: 'row',
                }
              : isMobileWeb
                ? { flexGrow: 1, flexBasis: '47%', flexDirection: 'row' }
                : { flexDirection: 'row' }
          }
        >
          <StatCard label="Weight" value={fmtVolume(data.totalVolume)} icon="trending-up" />
        </View>
        <View
          style={
            isWide
              ? {
                  flexGrow: 1,
                  flexBasis: '30%',
                  minWidth: 180,
                  minHeight: 220,
                  flexDirection: 'row',
                }
              : isMobileWeb
                ? { flexGrow: 1, flexBasis: '47%', flexDirection: 'row' }
                : { flexDirection: 'row' }
          }
        >
          <StatCard label="Total Reps" value={`${data.totalReps.toLocaleString()}`} icon="repeat" />
        </View>
        <View
          style={
            isWide
              ? {
                  flexGrow: 1,
                  flexBasis: '30%',
                  minWidth: 180,
                  minHeight: 220,
                  flexDirection: 'row',
                }
              : isMobileWeb
                ? { flexGrow: 1, flexBasis: '47%', flexDirection: 'row' }
                : { flexDirection: 'row' }
          }
        >
          <StatCard label="Total Sets" value={`${data.totalSets.toLocaleString()}`} icon="layers" />
        </View>
      </View>

      {/* Side-by-side row: Top Exercises by Volume + Muscle Distribution */}
      <View style={isWide ? { flexDirection: 'row', gap: 14, alignItems: 'stretch' } : { gap: 16 }}>
        {data.topExercisesByVolume.length > 0 && (
          <View style={isWide ? { flex: 1 } : undefined}>
            <View style={[styles.section, isWide && { flex: 1, minHeight: 300 }]}>
              <Text style={styles.sectionTitle}>Top Exercises by Volume</Text>
              <View
                style={[styles.weightLog, isWide && { flex: 1, justifyContent: 'space-between' }]}
              >
                {data.topExercisesByVolume.map((ex, i) => (
                  <View key={`overall-${ex.name}`} style={styles.weightLogRow}>
                    <View style={styles.weightLogNameRow}>
                      <Text style={styles.weightLogDate} numberOfLines={2}>
                        {ex.name}
                      </Text>
                      <Text style={styles.weightLogKg} numberOfLines={1}>
                        {fmtVolume(ex.volume)}
                      </Text>
                    </View>
                    <AnimatedBar
                      percent={Math.round((ex.volume / maxVol) * 100)}
                      delay={Math.min(i, 6) * 60}
                      trackStyle={styles.weightLogBarTrack}
                      fillStyle={[styles.weightLogBarFill, { backgroundColor: accent }]}
                    />
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {topMuscles.length > 0 && (
          <View style={isWide ? { flex: 1 } : undefined}>
            <View style={[styles.section, isWide && { flex: 1, minHeight: 300 }]}>
              <Text style={styles.sectionTitle}>Muscle Distribution</Text>
              <View style={isWide ? { flex: 1 } : undefined}>
                <MuscleVolumeChart volumeByGroup={muscleVolume.sets} kgByGroup={muscleVolume.kg} />
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Top muscle trained */}
      {topMuscles.length > 0 &&
        (() => {
          const { name, sets, kg, reps } = topMuscles[0];
          return (
            <View style={muscleStyles.card}>
              <View style={muscleStyles.cardHeader}>
                <Feather name="target" size={14} color={accent} />
                <Text style={muscleStyles.cardTitle}> Top Muscle</Text>
              </View>
              <Text style={muscleStyles.muscleName}>{name}</Text>
              <Text style={muscleStyles.muscleSub}>Most trained muscle overall</Text>
              <View style={muscleStyles.statStrip}>
                {kg > 0 && (
                  <>
                    <View style={muscleStyles.statItem}>
                      <Text style={[muscleStyles.statValue, { color: accent }]}>
                        {kg.toLocaleString()}
                      </Text>
                      <Text style={muscleStyles.statLabel}>kg</Text>
                    </View>
                    <View style={muscleStyles.divider} />
                  </>
                )}
                <View style={muscleStyles.statItem}>
                  <Text style={[muscleStyles.statValue, { color: accent }]}>{sets}</Text>
                  <Text style={muscleStyles.statLabel}>sets</Text>
                </View>
                {reps > 0 && (
                  <>
                    <View style={muscleStyles.divider} />
                    <View style={muscleStyles.statItem}>
                      <Text style={[muscleStyles.statValue, { color: accent }]}>
                        {reps.toLocaleString()}
                      </Text>
                      <Text style={muscleStyles.statLabel}>reps</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          );
        })()}

      {/* consistency */}
      <View style={styles.section}>
        <View style={localStyles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Consistency</Text>
          <TouchableOpacity
            onPress={() => setShowConsistencyInfo((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="info" size={14} color={colors.titleText} />
          </TouchableOpacity>
        </View>
        {showConsistencyInfo && (
          <View style={localStyles.infoBox}>
            <Text style={localStyles.infoText}>
              Based on your last 90 days. Expected sessions = your weekly target × (90 ÷ 7).
              Consistency = actual ÷ expected, capped at 100%.
            </Text>
          </View>
        )}
        <View style={styles.cardRow}>
          <StatCard label="Streak" value={`${currentStreak}d`} icon="zap" compact />
          <StatCard label="Best" value={`${longestStreak}d`} icon="award" compact />
          <StatCard label="90-day" value={`${consistency}%`} icon="calendar" compact />
        </View>
        <AnimatedBar
          percent={consistency}
          delay={120}
          trackStyle={consistencyStyles.barTrack}
          fillStyle={[consistencyStyles.barFill, { backgroundColor: accent }]}
        />
        <Text style={consistencyStyles.hint}>
          {consistency >= 80
            ? 'Exceptional consistency'
            : consistency >= 50
              ? 'Keep building the habit'
              : consistency > 0
                ? 'Every session counts'
                : 'Start your journey'}
        </Text>
      </View>

      <View style={isWide ? { flexDirection: 'row', gap: 14, alignItems: 'stretch' } : { gap: 16 }}>
        <View style={isWide ? { flex: 1 } : undefined}>
          <View
            style={[
              styles.section,
              isWide && {
                flex: 1,
                height: 420,
                backgroundColor: colors.container,
                borderRadius: 10,
                padding: 12,
                overflow: 'hidden',
              },
            ]}
          >
            <View style={isWide ? { flex: 1 } : undefined}>
              <RadarChart
                data={data.topExercisesByFreq}
                title="Exercises"
                color="accent"
                emptyMessage="No exercises logged"
              />
            </View>
          </View>
        </View>

        <View style={isWide ? { flex: 1 } : undefined}>
          <View
            style={[
              styles.section,
              isWide && {
                flex: 1,
                height: 420,
                backgroundColor: colors.container,
                borderRadius: 10,
                padding: 12,
                overflow: 'hidden',
              },
            ]}
          >
            <Text style={styles.sectionTitle}>Session History</Text>
            <View style={isWide ? { flex: 1 } : undefined}>
              <StreakCalendar sessions={allSessions} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default OverallStats;

const localStyles = StyleSheet.create({
  statGrid: {
    gap: 10, 
  },
  statRow: {
    marginBottom: 0, 
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoBox: {
    backgroundColor: colors.button3,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  infoText: {
    color: colors.titleText,
    fontSize: 12,
    lineHeight: 18,
  },
});

const muscleStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.container,
    borderRadius: 18,
    padding: 16,
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
  muscleName: {
    color: colors.titleText,
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  muscleSub: {
    color: colors.titleText,
    fontSize: 12,
  },
  statStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.button3,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.titleText,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: colors.button2,
  },
});

const consistencyStyles = StyleSheet.create({
  barTrack: {
    height: 3,
    backgroundColor: colors.button3,
    borderRadius: 2,
  },
  barFill: {
    height: 3,
    borderRadius: 2,
  },
  hint: {
    fontSize: 11,
    color: colors.titleText,
    textAlign: 'center',
    marginTop: 12,
  },
});
