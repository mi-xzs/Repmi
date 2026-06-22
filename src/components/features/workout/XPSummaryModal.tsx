import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { XPLogEntry, LevelInfo, LevelTitle } from '../../../services/xpService';
import { WorkoutSession } from '../../../screens/WorkoutScreen';
import { colors } from '../../../theme/colors';
import { useAccent } from '../../../services/SettingsContext';
import ShareCard from './ShareCard';
import { useShareWorkoutCard } from '../../../hooks/useShareWorkoutCard';
import { PRDelta } from '../../../utils/prDetection';
import { useProfile } from '../../../services/ProfileContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface XPSummaryModalProps {
  visible: boolean;
  entry: XPLogEntry | null;
  levelBefore: LevelInfo;
  levelAfter: LevelInfo;
  titleAfter: LevelTitle;
  workoutName: string;
  session: WorkoutSession | null;
  prDeltas?: ReadonlyMap<string, PRDelta>;
  sessionCoins?: number | null;
  onDismiss: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RING_SIZE = 72;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const COIN_GOLD = colors.fav;
const COIN_SUBTLE = 'rgba(255,215,0,0.12)';

// ─── Breakdown Row Config ─────────────────────────────────────────────────────

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

interface BreakdownRowConfig {
  key: keyof XPLogEntry['breakdown'];
  icon: FeatherIconName;
  label: string;
}

const BREAKDOWN_ROWS: readonly BreakdownRowConfig[] = [
  { key: 'showUp',   icon: 'check-circle', label: 'Showing up'    },
  { key: 'volume',   icon: 'trending-up',  label: 'Volume lifted' },
  { key: 'sets',     icon: 'layers',       label: 'Working sets'  },
  { key: 'duration', icon: 'clock',        label: 'Session time'  },
  { key: 'rpe',      icon: 'activity',     label: 'RPE logged'    },
] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

interface LevelRingProps {
  levelInfo: LevelInfo;
  titleInfo: LevelTitle;
  didLevelUp: boolean;
  flashAnim: Animated.Value;
}

function LevelRing({ levelInfo, titleInfo, didLevelUp, flashAnim }: LevelRingProps) {
  const { accent } = useAccent();
  const dashOffset = RING_CIRCUMFERENCE * (1 - levelInfo.progress);

  return (
    <View style={styles.ringContainer}>
      {/* SVG ring — rotated so arc starts at top */}
      <View style={styles.ringSvgWrapper}>
        <Svg
          width={RING_SIZE}
          height={RING_SIZE}
          style={{ transform: [{ rotate: '-90deg' }] }}
        >
          {/* Background track */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={colors.button3}
            strokeWidth={RING_STROKE}
            fill="transparent"
          />
          {/* Progress arc */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke={titleInfo.color}
            strokeWidth={RING_STROKE}
            fill="transparent"
            strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </Svg>

        {/* Level number overlay */}
        <View style={styles.ringCenter}>
          <Text style={styles.ringLevel}>{levelInfo.level}</Text>
        </View>
      </View>

      {/* Title label below ring */}
      <Text style={[styles.ringTitle, { color: titleInfo.color }]}>
        {titleInfo.title}
      </Text>

      {/* Level-up flash overlay + text */}
      {didLevelUp && (
        <>
          <Animated.View
            style={[
              styles.levelUpFlash,
              { backgroundColor: accent + '4D', opacity: flashAnim },
            ]}
            pointerEvents="none"
          />
          <Text style={[styles.levelUpText, { color: accent }]}>LEVEL UP!</Text>
        </>
      )}
    </View>
  );
}

interface BreakdownSectionProps {
  entry: XPLogEntry;
}

function BreakdownSection({ entry }: BreakdownSectionProps) {
  const { accent } = useAccent();
  const streakBonus = Math.round(entry.totalXP - entry.baseXP);
  const hasAnyBreakdown =
    BREAKDOWN_ROWS.some(({ key }) => entry.breakdown[key] > 0) || streakBonus > 0;

  if (!hasAnyBreakdown) {
    return (
      <View style={styles.breakdownContainer}>
        <View style={styles.breakdownEmpty}>
          <Feather name="info" size={16} color={colors.button1} style={styles.breakdownIcon} />
          <Text style={styles.breakdownEmptyText}>
            No working sets logged. Mark at least one working set as done to earn XP.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.breakdownContainer}>
      {BREAKDOWN_ROWS.map(({ key, icon, label }) => {
        const value = entry.breakdown[key];
        if (value === 0) return null;
        return (
          <View key={key} style={styles.breakdownRow}>
            <Feather name={icon} size={16} color={colors.titleText} style={styles.breakdownIcon} />
            <Text style={styles.breakdownLabel}>{label}</Text>
            <Text style={styles.breakdownValue}>+{value}</Text>
          </View>
        );
      })}

      {streakBonus > 0 && (
        <View style={styles.breakdownRow}>
          <Feather name="zap" size={16} color={accent} style={styles.breakdownIcon} />
          <Text style={styles.breakdownLabel}>Streak bonus</Text>
          <Text style={[styles.breakdownValue, { color: accent }]}>+{streakBonus}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function XPSummaryModal({
  visible,
  entry,
  levelBefore,
  levelAfter,
  titleAfter,
  workoutName,
  session,
  prDeltas,
  sessionCoins,
  onDismiss,
}: XPSummaryModalProps) {
  const { accent, accentSubtle } = useAccent();
  const backdropAnim  = useRef(new Animated.Value(0)).current;
  const sheetAnim     = useRef(new Animated.Value(80)).current;
  const sheetOpacity  = useRef(new Animated.Value(0)).current;
  const flashAnim     = useRef(new Animated.Value(0)).current;
  const shareCardRef  = useRef<View>(null);

  const { share, loading: shareLoading } = useShareWorkoutCard(shareCardRef);
  const { profile } = useProfile();
  const username = profile?.username ?? null;
  const avatarUrl = profile?.avatar_url ?? null;

  const [avatarReady, setAvatarReady] = useState(!avatarUrl);
  useEffect(() => {
    if (!visible) return;
    if (!avatarUrl) {
      setAvatarReady(true);
      return;
    }
    setAvatarReady(false);
    let cancelled = false;
    const timer = setTimeout(() => { if (!cancelled) setAvatarReady(true); }, 1500);
    Image.prefetch(avatarUrl)
      .then(() => { if (!cancelled) setAvatarReady(true); })
      .catch(() => { if (!cancelled) setAvatarReady(true); });
    return () => { cancelled = true; clearTimeout(timer); };
  }, [visible, avatarUrl]);

  const didLevelUp = levelAfter.level > levelBefore.level;
  const canShare = entry !== null && session !== null && avatarReady;

  // ── Enter / exit animation ──────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      flashAnim.setValue(0);

      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(sheetAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(sheetOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (didLevelUp) {
          Animated.sequence([
            Animated.timing(flashAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(flashAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
          ]).start();
        }
      });
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!entry) return null;

  const hasStreakMultiplier = entry.streakMultiplier > 1;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}
        pointerEvents="box-only"
      />

      {/* Sheet */}
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: sheetAnim }],
              opacity: sheetOpacity,
            },
          ]}
        >
          {/* Pill handle */}
          <View style={styles.pill} />

          {/* Eyebrow */}
          <Text style={styles.eyebrow}>XP EARNED</Text>

          {/* Main row: XP amount (left) + Level ring (right) */}
          <View style={styles.mainRow}>
            {/* Left: total XP + streak badge */}
            <View style={styles.xpLeft}>
              <Text style={[styles.xpAmount, { color: accent }]}>+{entry.totalXP}</Text>
              <Text style={[styles.xpLabel, { color: accent }]}>XP</Text>
              {hasStreakMultiplier && (
                <View style={[styles.streakBadge, { backgroundColor: accentSubtle }]}>
                  <Feather name="zap" size={11} color={accent} />
                  <Text style={[styles.streakBadgeText, { color: accent }]}>
                    {entry.streakMultiplier}x streak
                  </Text>
                </View>
              )}
              {sessionCoins !== null && sessionCoins !== undefined && sessionCoins > 0 && (
                <View style={styles.coinBadge}>
                  <MaterialCommunityIcons name="circle" size={10} color={COIN_GOLD} />
                  <Text style={styles.coinBadgeText}>+{sessionCoins} coins</Text>
                </View>
              )}
            </View>

            {/* Right: circular level ring */}
            <LevelRing
              levelInfo={levelAfter}
              titleInfo={titleAfter}
              didLevelUp={didLevelUp}
              flashAnim={flashAnim}
            />
          </View>

          {/* Breakdown */}
          <BreakdownSection entry={entry} />

          {/* Action row */}
          <View style={styles.buttonRow}>
            <Pressable
              onPress={share}
              disabled={!canShare || shareLoading}
              style={({ pressed }) => [
                styles.shareBtn,
                { backgroundColor: accentSubtle },
                (!canShare || shareLoading) && { opacity: 0.5 },
                pressed && { opacity: 0.7 },
              ]}
            >
              {shareLoading ? (
                <ActivityIndicator color={accent} />
              ) : (
                <>
                  <Feather name="share" size={16} color={accent} />
                  <Text style={[styles.shareText, { color: accent }]}>Share</Text>
                </>
              )}
            </Pressable>
            <Pressable
              onPress={onDismiss}
              style={({ pressed }) => [
                styles.dismissBtn,
                { backgroundColor: accent },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.dismissText}>Continue</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>

      {/* Hidden off-screen ShareCard — captured by react-native-view-shot */}
      {canShare && session && (
        <View style={styles.hiddenCardWrap} pointerEvents="none">
          <ShareCard
            ref={shareCardRef}
            workoutName={workoutName}
            session={session}
            entry={entry}
            levelAfter={levelAfter}
            titleAfter={titleAfter}
            prDeltas={prDeltas}
            username={username}
            avatarUrl={avatarUrl}
          />
        </View>
      )}
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    paddingHorizontal: 24,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 24,
  },

  // Pill
  pill: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginTop: 12,
    marginBottom: 24,
  },

  // Eyebrow
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.titleText,
    marginBottom: 16,
  },

  // Main row
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },

  // XP left side
  xpLeft: {
    flex: 1,
    paddingRight: 16,
  },
  xpAmount: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -2,
    lineHeight: 60,
  },
  xpLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 2,
    marginBottom: 8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  streakBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COIN_SUBTLE,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  coinBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COIN_GOLD,
    letterSpacing: 0.3,
  },

  // Ring
  ringContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  ringSvgWrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLevel: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.highlight,
    letterSpacing: -0.5,
  },
  ringTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  levelUpFlash: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 8,
  },
  levelUpText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 4,
    textTransform: 'uppercase',
  },

  // Breakdown
  breakdownContainer: {
    backgroundColor: colors.container,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 20,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  breakdownIcon: {
    marginRight: 12,
  },
  breakdownLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.highlight,
    fontWeight: '500',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.titleText,
  },
  breakdownEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  breakdownEmptyText: {
    flex: 1,
    fontSize: 13,
    color: colors.button1,
    lineHeight: 18,
  },

  // Action row
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    minWidth: 110,
  },
  shareText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // Dismiss button
  dismissBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
    letterSpacing: -0.2,
  },

  // Hidden off-screen ShareCard container
  hiddenCardWrap: {
    position: 'absolute',
    left: -10000,
    top: 0,
    opacity: 0,
  },
});
