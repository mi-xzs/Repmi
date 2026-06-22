import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo } from 'react-native';
import Animated, {
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../services/AuthContext';
import { useAccent } from '../../services/SettingsContext';
import { loadAllSessions } from '../../services/sessionService';
import { dayKey } from '../../utils/analyticsHelpers';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getWeekStart(): Date {
  const today = new Date();
  const dow = today.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getCurrentWeekDays(): Date[] {
  const monday = getWeekStart();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function TodayDot({ reduceMotion }: { reduceMotion: boolean }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [reduceMotion, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.dot, styles.dotToday, animatedStyle]} />;
}

export function WeekStreakBar() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [trainedKeys, setTrainedKeys] = useState<Set<string>>(new Set());
  const [reduceMotion, setReduceMotion] = useState(false);

  const { accent } = useAccent();
  const weekDays = getCurrentWeekDays();
  const todayKey = dayKey(new Date());

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => {
      if (mounted) setReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', v => setReduceMotion(v));
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useFocusEffect(useCallback(() => {
    if (!userId) {
      setTrainedKeys(new Set());
      return;
    }
    let cancelled = false;
    loadAllSessions(userId)
      .then(sessions => {
        if (cancelled) return;
        const trained = new Set<string>();
        for (const s of sessions) trained.add(dayKey(new Date(s.date)));
        setTrainedKeys(trained);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [userId]));

  return (
    <View style={styles.container}>
      {weekDays.map((day, i) => {
        const key = dayKey(day);
        const isToday = key === todayKey;
        const trained = trainedKeys.has(key);

        const enteringAnim = reduceMotion
          ? undefined
          : ZoomIn.springify().damping(14).stiffness(180).delay(i * 50);

        return (
          <Animated.View
            key={key}
            entering={enteringAnim}
            style={styles.dayCol}
          >
            <Text style={[styles.label, isToday && styles.labelToday]}>
              {DAY_LABELS[i]}
            </Text>
            {isToday && !trained ? (
              <TodayDot reduceMotion={reduceMotion} />
            ) : (
              <View
                style={[
                  styles.dot,
                  trained && { backgroundColor: accent },
                ]}
              />
            )}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 18,
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: colors.button1,
  },
  labelToday: {
    color: colors.highlight,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.button2,
  },
  dotTrained: {
    backgroundColor: colors.RadarChart,
  },
  dotToday: {
    backgroundColor: colors.button1,
  },
});

