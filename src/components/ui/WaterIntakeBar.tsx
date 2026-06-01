// src/components/ui/WaterIntakeBar.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Switch,
  AppState,
  AppStateStatus,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureGet, secureSet } from '../../services/secureUserCache';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../services/AuthContext';
import { useSettings, useAccent } from '../../services/SettingsContext';
import { dayKey } from '../../utils/analyticsHelpers';

const CUP_COUNT = 8;
const DAILY_GOAL_ML = 2000;
const CUP_ML = DAILY_GOAL_ML / CUP_COUNT;
const SIZES = [250, 500, 750] as const;
const MAX_ML = DAILY_GOAL_ML * 2;

const WATER_COLOR = '#4FC3F7';

const DIAL_SIZE = 86;
const RADIUS = 38;
const STROKE = 6;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const storageKey = (userId: string | undefined, date: string) =>
  `water-ml:${userId ?? 'anon'}:${date}`;

export function WaterIntakeBar() {
  const { session } = useAuth();
  const { waterTrackerEnabled, setWaterTrackerEnabled } = useSettings();
  const { accent, accentDim } = useAccent();
  const userId = session?.user.id;
  const [totalMl, setTotalMl] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [todayKey, setTodayKey] = useState(() => dayKey(new Date()));
  const [infoOpen, setInfoOpen] = useState(false);
  const prevMlRef = useRef(0);

  const pulse = useSharedValue(1);
  const fillFrac = useSharedValue(0);

  // --- ReduceMotion ---
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

  // --- Day-rollover: AppState 'active' + 60s tick ---
  useEffect(() => {
    const checkDay = () => {
      const k = dayKey(new Date());
      setTodayKey(curr => (curr === k ? curr : k));
    };
    const interval = setInterval(checkDay, 60_000);
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') checkDay();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, []);

  // --- Load on focus / when day changes ---
  // SECURITY (H3): hydration counts are stored in SecureStore. Falls
  // back to the legacy AsyncStorage entry once per upgraded build, then
  // migrates the value and removes the plaintext copy.
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    (async () => {
      const key = storageKey(userId, todayKey);
      try {
        let v = await secureGet(key);
        if (v === null) {
          const legacy = await AsyncStorage.getItem(key);
          if (legacy) {
            v = legacy;
            await secureSet(key, legacy);
            await AsyncStorage.removeItem(key).catch(() => {});
          }
        }
        if (cancelled) return;
        const n = v ? parseInt(v, 10) : 0;
        const clamped = Number.isFinite(n) ? Math.max(0, Math.min(MAX_ML, n)) : 0;
        setTotalMl(clamped);
        prevMlRef.current = clamped;
      } catch {
        /* non-critical */
      }
    })();
    return () => { cancelled = true; };
  }, [userId, todayKey]));

  // --- Smooth arc fill ---
  useEffect(() => {
    const target = Math.min(1, totalMl / DAILY_GOAL_ML);
    if (reduceMotion) {
      fillFrac.value = target;
    } else {
      fillFrac.value = withSpring(target, { damping: 18, stiffness: 140, mass: 0.6 });
    }
  }, [totalMl, reduceMotion, fillFrac]);

  // --- Goal celebration on transition past 2000ml ---
  useEffect(() => {
    if (prevMlRef.current < DAILY_GOAL_ML && totalMl >= DAILY_GOAL_ML) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (!reduceMotion) {
        pulse.value = withSequence(
          withSpring(1.08, { damping: 12, stiffness: 280, mass: 0.4 }),
          withSpring(1, { damping: 14, stiffness: 220 }),
        );
      }
    }
    prevMlRef.current = totalMl;
  }, [totalMl, reduceMotion, pulse]);

  const persist = (n: number) => {
    // SECURITY (H3): writes go to SecureStore now.
    secureSet(storageKey(userId, todayKey), String(n)).catch(() => {});
  };

  const setTotal = (n: number, haptic: Haptics.ImpactFeedbackStyle) => {
    const clamped = Math.max(0, Math.min(MAX_ML, n));
    if (clamped === totalMl) return;
    setTotalMl(clamped);
    persist(clamped);
    Haptics.impactAsync(haptic).catch(() => {});
  };

  // Tap dial → add one cup, long-press → remove one cup
  const handleDialPress = () => {
    setTotal(totalMl + CUP_ML, Haptics.ImpactFeedbackStyle.Light);
  };
  const handleDialLongPress = () => {
    setTotal(totalMl - CUP_ML, Haptics.ImpactFeedbackStyle.Medium);
  };

  // Tap a size button → add that amount
  const handleSizeAdd = (ml: number) => {
    setTotal(totalMl + ml, Haptics.ImpactFeedbackStyle.Light);
  };

  // Long-press a size button → remove that amount
  const handleSizeRemove = (ml: number) => {
    setTotal(totalMl - ml, Haptics.ImpactFeedbackStyle.Medium);
  };

  const goalMet = totalMl >= DAILY_GOAL_ML;
  const arcColor = goalMet ? accent : WATER_COLOR;
  const pct = Math.round((totalMl / DAILY_GOAL_ML) * 100);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - fillFrac.value),
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  // If user has disabled the tracker, render nothing — UNLESS the info
  // modal is still open (so the user can read the "re-enable in Settings"
  // hint and tap Done before the bar unmounts).
  if (!waterTrackerEnabled && !infoOpen) return null;

  return (
    <>
      {waterTrackerEnabled && (
        <Animated.View style={[styles.card, cardStyle]}>
          <View style={styles.row}>
            <Pressable
              onPress={handleDialPress}
              onLongPress={handleDialLongPress}
              delayLongPress={400}
              style={styles.dialWrap}
              accessibilityRole="adjustable"
              accessibilityLabel={`Water intake, ${totalMl} of ${DAILY_GOAL_ML} milliliters`}
              accessibilityHint="Tap to add a cup. Long-press to remove a cup."
              accessibilityValue={{ min: 0, max: MAX_ML, now: totalMl }}
            >
              <Svg width={DIAL_SIZE} height={DIAL_SIZE}>
                <Circle
                  cx={DIAL_SIZE / 2}
                  cy={DIAL_SIZE / 2}
                  r={RADIUS}
                  stroke={colors.button2}
                  strokeWidth={STROKE}
                  fill="none"
                />
                <AnimatedCircle
                  cx={DIAL_SIZE / 2}
                  cy={DIAL_SIZE / 2}
                  r={RADIUS}
                  stroke={arcColor}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={CIRCUMFERENCE}
                  animatedProps={arcProps}
                  transform={`rotate(-90 ${DIAL_SIZE / 2} ${DIAL_SIZE / 2})`}
                />
              </Svg>
              <View style={styles.dialCenter} pointerEvents="none">
                <Text style={[styles.dialPct, goalMet && { color: accent }]}>
                  {pct}%
                </Text>
                <Text style={styles.dialSub}>{totalMl}ml</Text>
              </View>
            </Pressable>

            <View style={styles.right}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>WATER</Text>
                <Pressable
                  onPress={() => setInfoOpen(true)}
                  hitSlop={8}
                  style={styles.infoBtn}
                  accessibilityRole="button"
                  accessibilityLabel="About water tracker"
                >
                  <Feather name="info" size={12} color={colors.button1} />
                </Pressable>
              </View>
              <Text style={[styles.count, goalMet && styles.countGoalMet, goalMet && { color: accent }]}>
                {totalMl}
                <Text style={styles.countSub}>  / {DAILY_GOAL_ML} ml</Text>
              </Text>
              <View style={styles.sizes}>
                {SIZES.map(size => (
                  <Pressable
                    key={size}
                    onPress={() => handleSizeAdd(size)}
                    onLongPress={() => handleSizeRemove(size)}
                    delayLongPress={400}
                    style={({ pressed }) => [
                      styles.sizeBtn,
                      { borderColor: accent + '59', backgroundColor: accent + '14' },
                      pressed && { backgroundColor: accent + '2E' },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${size} milliliters`}
                    accessibilityHint="Long-press to remove this amount"
                  >
                    <Text style={[styles.sizeText, { color: accent }]}>+{size}ml</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      <Modal
        visible={infoOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setInfoOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setInfoOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => { /* swallow */ }}>
            <Text style={styles.modalTitle}>Water tracker</Text>

            <View style={styles.tipRow}>
              <Feather name="droplet" size={16} color={accent} style={styles.tipIcon} />
              <Text style={styles.tipText}>
                Tap the <Text style={styles.tipBold}>dial</Text> to log a cup (250 ml).
              </Text>
            </View>

            <View style={styles.tipRow}>
              <Feather name="plus-circle" size={16} color={accent} style={styles.tipIcon} />
              <Text style={styles.tipText}>
                Use <Text style={styles.tipBold}>+250 / +500 / +750</Text> for specific amounts.
              </Text>
            </View>

            <View style={styles.tipRow}>
              <Feather name="rotate-ccw" size={16} color={accent} style={styles.tipIcon} />
              <Text style={styles.tipText}>
                <Text style={styles.tipBold}>Long-press</Text> any control to remove that amount.
              </Text>
            </View>

            <Text style={styles.goalLine}>
              Daily goal  ·  <Text style={styles.goalLineBold}>2000 ml</Text>
            </Text>

            <View style={styles.modalToggleRow}>
              <Text style={styles.modalToggleLabel}>Show water tracker</Text>
              <Switch
                value={waterTrackerEnabled}
                onValueChange={setWaterTrackerEnabled}
                trackColor={{ false: colors.button2, true: accentDim }}
                thumbColor={waterTrackerEnabled ? accent : colors.highlight}
              />
            </View>

            {!waterTrackerEnabled && (
              <Text style={styles.modalHint}>
                You can turn this back on in Settings.
              </Text>
            )}

            <Pressable
              onPress={() => setInfoOpen(false)}
              accessibilityLabel="Close info"
              style={({ pressed }) => [
                styles.modalCloseBtn,
                { backgroundColor: accent },
                pressed && styles.modalCloseBtnPressed,
                pressed && { backgroundColor: accentDim },
              ]}
            >
              <Text style={styles.modalCloseText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 8,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.container,
    borderRadius: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dialWrap: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    position: 'relative',
  },
  dialCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialPct: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.titleText,
  },
  dialSub: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.button1,
    marginTop: 1,
  },
  right: {
    flex: 1,
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.button1,
  },
  infoBtn: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.titleText,
  },
  countGoalMet: {
    // color applied inline via accent hook
  },
  countSub: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.button1,
  },
  sizes: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  sizeBtn: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  sizeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: 280,
    backgroundColor: colors.container,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  modalTitle: {
    color: colors.titleText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    opacity: 0.55,
    marginBottom: 14,
    textAlign: 'center',
  },
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
  tipBold: {
    color: colors.titleText,
    fontWeight: '700',
  },
  goalLine: {
    fontSize: 11,
    color: colors.button1,
    textAlign: 'center',
    letterSpacing: 0.6,
    marginTop: -2,
    marginBottom: 12,
  },
  goalLineBold: {
    color: colors.titleText,
    fontWeight: '700',
  },
  modalToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  modalToggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.highlight,
  },
  modalHint: {
    fontSize: 11,
    color: colors.button1,
    fontStyle: 'italic',
    marginTop: 6,
  },
  modalCloseBtn: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    // backgroundColor applied inline via accent hook
  },
  modalCloseBtnPressed: {
    // backgroundColor applied inline via accentDim hook
  },
  modalCloseText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
