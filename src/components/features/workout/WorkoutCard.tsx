import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { colors } from '../../../theme/colors';
import { useAccent } from '../../../services/SettingsContext';
import { WorkoutData } from '../../../types/exercise';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../../services/AuthContext';
import { loadDurationsForWorkout } from '../../../services/sessionService';
import { logError } from '../../../services/logger';

type Props = {
  workout: WorkoutData;
  onPress: () => void;
  workoutIndex: number;
  refreshKey?: number;
};

export default function WorkoutCard({ workout, onPress, workoutIndex, refreshKey }: Props) {
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id;
  const { accent, accentSubtle } = useAccent();

  const [lastDuration, setLastDuration] = useState<number | null>(null);
  const [avgDuration, setAvgDuration] = useState<number | null>(null);

  useEffect(() => {
    if (!userId || !workout.id) return;

    let cancelled = false;

    const load = async () => {
      try {
        const durations = await loadDurationsForWorkout(userId, workout.id!);
        if (cancelled || durations.length === 0) return;
        const last = durations[durations.length - 1];
        const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
        setLastDuration(last);
        setAvgDuration(avg);
      } catch (e) {
        logError('workoutCard.durations.load.failed', { name: (e as Error)?.name });
      }
    };

    load();
    return () => { cancelled = true; };
  }, [userId, workout.id, refreshKey]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalExercises = workout.sections.length;
  const totalSets = workout.sections.reduce(
    (acc, section) => acc + section.rows.length, 0
  );

  const tags = [
    `${totalExercises} exercise${totalExercises !== 1 ? 's' : ''}`,
    `${totalSets} set${totalSets !== 1 ? 's' : ''}`,
    workout.showWarmUp && 'Warm up',
    workout.showCooldown && 'Cooldown',
  ].filter(Boolean) as string[];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {workout.workoutName.includes(' - ')
            ? <>
                {workout.workoutName.split(' - ')[0].toUpperCase()}
                <Text style={styles.titleUsername}>
                  {' - ' + workout.workoutName.split(' - ').slice(1).join(' - ')}
                </Text>
              </>
            : workout.workoutName.toUpperCase()
          }
        </Text>

        <View style={styles.tagsRow}>
          {tags.map((tag, i) => (
            <View key={i} style={[styles.tag, { backgroundColor: accentSubtle }]}>
              <Text style={[styles.tagText, { color: accent }]}>{tag}</Text>
            </View>
          ))}
        </View>

        {(lastDuration !== null || avgDuration !== null) && (
          <View style={styles.statsRow}>
            {lastDuration !== null && (
              <View style={styles.statItem}>
                <Feather name="clock" size={11} color={colors.titleText} />
                <Text style={styles.statText}>LAST {formatTime(lastDuration)}</Text>
              </View>
            )}
            {avgDuration !== null && (
              <View style={styles.statItem}>
                <Feather name="bar-chart-2" size={11} color={colors.titleText} />
                <Text style={styles.statText}>AVG {formatTime(avgDuration)}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.container,
    borderRadius: 12,
    marginHorizontal: 5,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.button3,
    padding: 8,
  },
  content: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.highlight,
    letterSpacing: 1.5,
  },
  titleUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.button2,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    color: colors.titleText,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  arrow: {
    fontSize: 28,
    color: colors.button2,
    paddingHorizontal: 14,
    fontWeight: '300',
  },
});