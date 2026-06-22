import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
  DimensionValue,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const BASE = 'rgba(255,255,255,0.04)';
const HIGHLIGHT = 'rgba(255,255,255,0.08)';
const SHIMMER_COLORS: readonly [string, string, string] = ['transparent', HIGHLIGHT, 'transparent'] as const;
const SHIMMER_DURATION_MS = 1400;

type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function useDelayedShow(_delayMs: number = 0): boolean {
  return true;
}

export function useStableLoading(isLoading: boolean, minMs: number = 500): boolean {
  const [visible, setVisible] = useState(isLoading);
  const startedAt = useRef<number | null>(isLoading ? Date.now() : null);

  useEffect(() => {
    if (isLoading) {
      if (startedAt.current == null) startedAt.current = Date.now();
      if (!visible) setVisible(true);
      return;
    }
    if (!visible) return;
    const elapsed = startedAt.current == null ? minMs : Date.now() - startedAt.current;
    const remaining = Math.max(0, minMs - elapsed);
    const handle = setTimeout(() => {
      setVisible(false);
      startedAt.current = null;
    }, remaining);
    return () => clearTimeout(handle);
  }, [isLoading, minMs, visible]);

  return visible;
}

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduce(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      mounted = false;
      sub?.remove();
    };
  }, []);
  return reduce;
}

export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  style,
}: SkeletonProps) {
  const reduceMotion = useReduceMotion();
  const [boxW, setBoxW] = useState(0);
  const x = useSharedValue(-1);

  useEffect(() => {
    if (reduceMotion) return;
    x.value = -1;
    x.value = withRepeat(
      withTiming(1, { duration: SHIMMER_DURATION_MS, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
  }, [reduceMotion]);

  const sweepStyle = useAnimatedStyle(() => {
    const range = Math.max(boxW, 1);
    return { transform: [{ translateX: x.value * range }] };
  });

  return (
    <View
      onLayout={(e) => setBoxW(e.nativeEvent.layout.width)}
      style={[
        { width, height, borderRadius: radius, backgroundColor: BASE, overflow: 'hidden' },
        style,
      ]}
    >
      {!reduceMotion && boxW > 0 && (
        <Animated.View style={[StyleSheet.absoluteFillObject, sweepStyle]}>
          <LinearGradient
            colors={SHIMMER_COLORS as unknown as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      )}
    </View>
  );
}

// ── Composed presets ────────────────────────────────────────

const CARD_BORDER_RADIUS = 18;

export function SkeletonWorkoutCard() {
  return (
    <View style={presetStyles.workoutCard}>
      <View style={presetStyles.workoutCardContent}>
        <Skeleton width="65%" height={20} radius={4} />
        <View style={presetStyles.tagsRow}>
          <Skeleton width={64} height={18} radius={4} />
          <Skeleton width={48} height={18} radius={4} />
          <Skeleton width={56} height={18} radius={4} />
        </View>
        <View style={presetStyles.statsRow}>
          <Skeleton width={70} height={11} radius={3} />
          <Skeleton width={70} height={11} radius={3} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonSectionLabel() {
  return (
    <View style={presetStyles.sectionLabelRow}>
      <Skeleton width={120} height={13} radius={3} />
      <View style={presetStyles.sectionLabelLine} />
    </View>
  );
}

export function SkeletonStatRow() {
  return (
    <View style={presetStyles.statCardRow}>
      <Skeleton height={78} radius={12} style={{ flex: 1 }} />
      <Skeleton height={78} radius={12} style={{ flex: 1 }} />
    </View>
  );
}

export function SkeletonChartCard({ height = 220 }: { height?: number }) {
  return <Skeleton height={height} radius={14} />;
}

export function SkeletonHexCard({ size }: { size: number }) {
  return (
    <View style={[presetStyles.hexCard, { width: size }]}>
      <Skeleton width={44} height={44} radius={22} />
      <Skeleton width={48} height={8} radius={3} style={{ marginTop: 6 }} />
      <Skeleton width="90%" height={12} radius={3} style={{ marginTop: 6 }} />
      <Skeleton width={56} height={13} radius={3} style={{ marginTop: 4 }} />
    </View>
  );
}

const presetStyles = StyleSheet.create({
  // workout card silhouette
  workoutCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 12,
    marginHorizontal: 5,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.03)',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutCardContent: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },

  // section label row
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    marginTop: 8,
  },
  sectionLabelLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(181, 181, 181, 0.12)',
  },

  // stat card row (analytics)
  statCardRow: {
    flexDirection: 'row',
    gap: 10,
  },

  // hex card (achievements)
  hexCard: {
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
  },
});

export { CARD_BORDER_RADIUS };
