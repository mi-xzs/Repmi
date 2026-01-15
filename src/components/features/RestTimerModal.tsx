// src/components/features/RestTimerModal.tsx
//
// Background-safe rest timer.
//
// Three independent mechanisms work together:
//   1. Wall-clock anchor (endAtRef).  Remaining time is computed from
//      Date.now() rather than decremented per tick, so the foreground UI
//      stays correct even after the JS thread was suspended.
//   2. Local notification scheduled at endAt.  Fires regardless of app
//      state, so the user gets a sound + buzz even with the screen locked
//      or the app backgrounded.  Cancelled when the user dismisses early
//      or when the foreground tick completes the timer first.
//   3. AppState listener.  When the app returns to foreground we recompute
//      remaining from the anchor and either resume ticking or fire the
//      completion path (if the timer already ended while we were away).
//
// We keep the existing JS setInterval — it's still the source of truth for
// the smooth countdown ring while the user is looking at the modal.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  AppState,
  AppStateStatus,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { colors } from '../../theme/colors';
import { useAccent } from '../../services/SettingsContext';
import { ensureNotificationPermission } from '../../services/notifications';

interface RestTimerModalProps {
  visible: boolean;
  durationSeconds: number;
  onDismiss: () => void;
  // Fires exactly once when the timer hits 0 naturally, *before* the 800ms
  // celebration delay + fade-out. The phase auto-advance uses this to mark the
  // current row done so the next-row highlight is already in place by the
  // time `onDismiss` closes the modal.
  onComplete?: () => void;
  title?: string;
}

const SIZE = 128;
const STROKE = 6;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const KEEP_AWAKE_TAG = 'rest-timer';

// Wrap Circle so we can drive strokeDashoffset with Animated.Value
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function RestTimerModal({
  visible,
  durationSeconds,
  onDismiss,
  onComplete,
  title = 'REST',
}: RestTimerModalProps) {
  const { accent, accentDim } = useAccent();
  const [remaining, setRemaining] = useState(durationSeconds);
  const [paused, setPaused] = useState(false);

  // Wall-clock anchor.  Updated when the timer opens, and rolled forward on resume.
  const endAtRef = useRef<number>(0);
  // While paused, snapshot the remaining seconds so resume can re-anchor.
  const pausedRemainingRef = useRef<number | null>(null);
  // The scheduled notification's identifier (so we can cancel it).
  const notifIdRef = useRef<string | null>(null);
  // Guards against double-fire of the completion path (foreground + AppState).
  const completedRef = useRef(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tracks how much of the ring is left: CIRCUMFERENCE (full) → 0 (empty)
  const progressAnim = useRef(new Animated.Value(CIRCUMFERENCE)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Cancel any pending notification ────────────────────────────────────────
  const cancelNotification = useCallback(async () => {
    const id = notifIdRef.current;
    if (!id) return;
    notifIdRef.current = null;
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (e) {
      console.warn('RestTimer: failed to cancel notification', e);
    }
  }, []);

  // ── Schedule the fallback notification ─────────────────────────────────────
  const scheduleNotification = useCallback(
    async (secondsFromNow: number) => {
      // Always cancel a previous one first — no overlap.
      await cancelNotification();
      if (secondsFromNow <= 0) return;

      const ok = await ensureNotificationPermission();
      if (!ok) return; // Gracefully degrade: foreground-only timer.

      try {
        notifIdRef.current = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Rest complete',
            body: 'Time for your next set.',
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: Math.max(1, Math.ceil(secondsFromNow)),
            channelId: 'rest-timer', // Android — set up in App.tsx
          },
        });
      } catch (e) {
        console.warn('RestTimer: failed to schedule notification', e);
        notifIdRef.current = null;
      }
    },
    [cancelNotification]
  );

  // ── Completion in foreground: cancel notif, haptic, fade out ───────────────
  // Defined as a ref so AppState/interval callbacks always call the same
  // function without recreating the AppState subscription.
  const completionRef = useRef<() => void>(() => {});
  completionRef.current = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    cancelNotification();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onComplete?.();
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => onDismiss());
    }, 800);
  };

  // ── Reset on open / teardown on close ──────────────────────────────────────
  useEffect(() => {
    if (visible) {
      const now = Date.now();
      endAtRef.current = now + durationSeconds * 1000;
      pausedRemainingRef.current = null;
      completedRef.current = false;
      setRemaining(durationSeconds);
      setPaused(false);
      progressAnim.setValue(CIRCUMFERENCE);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      scheduleNotification(durationSeconds);
      activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    } else {
      fadeAnim.setValue(0);
      cancelNotification();
      deactivateKeepAwake(KEEP_AWAKE_TAG);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    // We intentionally omit cancel/schedule from the dep array — those are
    // stable callbacks and re-running this effect on every render would
    // reschedule the notification.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, durationSeconds]);

  // ── Resync when the app returns to foreground ──────────────────────────────
  useEffect(() => {
    if (!visible) return;
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state !== 'active') return;
      if (paused) return;
      const remainingMs = endAtRef.current - Date.now();
      const next = Math.max(0, Math.round(remainingMs / 1000));
      setRemaining(next);
      progressAnim.setValue((next / durationSeconds) * CIRCUMFERENCE);
      if (next <= 0) completionRef.current();
    });
    return () => sub.remove();
  }, [visible, paused, durationSeconds, progressAnim]);

  // ── Foreground tick (drives the smooth UI) ─────────────────────────────────
  useEffect(() => {
    if (!visible || paused) return;

    intervalRef.current = setInterval(() => {
      const remainingMs = endAtRef.current - Date.now();
      const next = Math.max(0, Math.round(remainingMs / 1000));

      Animated.timing(progressAnim, {
        toValue: (next / durationSeconds) * CIRCUMFERENCE,
        duration: 950,
        useNativeDriver: false,
      }).start();

      setRemaining(next);

      if (next <= 0) completionRef.current();
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [visible, paused, durationSeconds, progressAnim]);

  // ── Pause / Resume ─────────────────────────────────────────────────────────
  const togglePause = useCallback(() => {
    setPaused((wasPaused) => {
      if (wasPaused) {
        // Resuming: roll endAt forward by however long we were paused.
        const resumingWith = pausedRemainingRef.current ?? remaining;
        endAtRef.current = Date.now() + resumingWith * 1000;
        pausedRemainingRef.current = null;
        scheduleNotification(resumingWith);
      } else {
        // Pausing: snapshot remaining, cancel the notification.
        pausedRemainingRef.current = remaining;
        cancelNotification();
      }
      return !wasPaused;
    });
  }, [remaining, scheduleNotification, cancelNotification]);

  // ── Skip (user dismisses early) ────────────────────────────────────────────
  const handleSkip = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    await cancelNotification();
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onDismiss());
  }, [cancelNotification, onDismiss, fadeAnim]);

  const minutes = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // strokeDashoffset: 0 = full ring drawn, CIRCUMFERENCE = nothing drawn.
  // progressAnim drives CIRCUMFERENCE→0 as time runs out, so dashoffset 0→CIRCUMFERENCE (ring drains).
  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, CIRCUMFERENCE],
    outputRange: [CIRCUMFERENCE, 0],
  });

  // Ring colour: accent when full, muted when almost empty
  const ringColor = progressAnim.interpolate({
    inputRange: [0, CIRCUMFERENCE * 0.3, CIRCUMFERENCE],
    outputRange: [colors.button1, accentDim, accent],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleSkip}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleSkip} />

        <View style={styles.card}>
          <Text style={styles.label}>{title}</Text>

          <View style={styles.ringWrapper}>
            <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
              {/* Background track */}
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                stroke={colors.button2}
                strokeWidth={STROKE}
                fill="none"
              />
              {/* Animated progress arc — rotated so it starts at 12 o'clock */}
              <AnimatedCircle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                stroke={ringColor as any}
                strokeWidth={STROKE}
                fill="none"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={strokeDashoffset as any}
                strokeLinecap="round"
                rotation={-90}
                origin={`${SIZE / 2}, ${SIZE / 2}`}
              />
            </Svg>

            <View style={styles.ringCenter}>
              <Text style={styles.timerText}>{timeStr}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
              onPress={togglePause}
            >
              <Feather
                name={paused ? 'play' : 'pause'}
                size={22}
                color={colors.highlight}
              />
              <Text style={styles.actionLabel}>{paused ? 'Resume' : 'Pause'}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.actionBtn, styles.skipBtn, pressed && styles.pressed]}
              onPress={handleSkip}
            >
              <Feather name="skip-forward" size={22} color={colors.button1} />
              <Text style={[styles.actionLabel, { color: colors.button1 }]}>Skip</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.container,
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.button2,
    minWidth: 240,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  label: {
    color: colors.button1,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  ringWrapper: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    color: colors.highlight,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 50,
    backgroundColor: colors.button3,
    borderWidth: 1,
    borderColor: colors.button2,
  },
  skipBtn: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.65,
  },
  actionLabel: {
    color: colors.highlight,
    fontSize: 14,
    fontWeight: '600',
  },
});
