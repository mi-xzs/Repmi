// src/screens/AchievementsScreen.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  PanResponder,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Reanimated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInRight,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withRepeat,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
  interpolate,
  Extrapolation,
  cancelAnimation,
} from 'react-native-reanimated';
import SwipeTabs from '../components/ui/SwipeTabs';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Stop,
  G,
  Rect,
  Filter,
  FeGaussianBlur,
} from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { RootTabParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { useResponsive, getContentWidth } from '../hooks/useResponsive';
import { useDemoGuard } from '../services/demoMode';
import { useAuth } from '../services/AuthContext';
import { loadAllSessions as sbLoadAllSessions } from '../services/sessionService';
import { useWorkouts } from '../services/WorkoutContext';
import { useCoins } from '../services/CoinContext';
import {
  searchProfilesByUsername,
  followUser,
  unfollowUser,
  fetchFollowingSet,
  fetchFollowingProfiles,
  ProfileSearchResult,
  FollowedProfile,
} from '../services/profileService';
import { AvatarTile } from '../components/ui/AvatarTile';
import { useXP } from '../services/XPContext';
import { useProfile } from '../services/ProfileContext';
import { XPLogEntry, Rarity, rarityFromXP } from '../services/xpService';
import { getCoinsForAchievement } from '../services/coinService';
import { useSettings, useAccent } from '../services/SettingsContext';
import { Skeleton, SkeletonHexCard, useStableLoading } from '../components/ui/Skeleton';
import { WorkoutSession } from './WorkoutScreen';
import {
  dayKey,
  getCurrentStreak,
  getLongestStreak,
  muscleForExercise,
} from '../utils/analyticsHelpers';

// ─── Rarity tier system ──────────────────────────────────────
//
// Single-hue saturation ladder anchored on the project's brand
// mint (#00FA9A). Rarity progresses from neutral → brand:
// cool gray → warm gray → desaturated mint → accentDim → accent.
// The brand owns the top two tiers. No foreign hues.
//
// Local-only color tokens — theme/colors.ts is NOT modified.
// The Rarity type + rarityFromXP() live in xpService so coinService
// can map achievement payouts off the same thresholds.

interface RarityToken {
  key: Rarity;
  label: string;
  stars: number; // 1–5 star indicator
  color: string; // primary tint
  glow: string; // outer glow color
  gradient: [string, string, ...string[]]; // card backdrop gradient
  borderActive: string;
  borderIdle: string;
  ringOuter: string; // outer halo
  particle: boolean; // floats particles
}

const RARITY: Record<Rarity, RarityToken> = {
  common: {
    key: 'common',
    label: 'COMMON',
    stars: 1,
    color: '#C5FF85',
    glow: 'rgba(197,255,133,0.28)',
    gradient: ['#252A1F', '#1B1F17'],
    borderActive: 'rgba(197,255,133,0.60)',
    borderIdle: 'rgba(197,255,133,0.28)',
    ringOuter: 'rgba(197,255,133,0.13)',
    particle: false,
  },
  uncommon: {
    key: 'uncommon',
    label: 'UNCOMMON',
    stars: 2,
    color: '#88FF80',
    glow: 'rgba(136,255,128,0.32)',
    gradient: ['#1C2A1E', '#142119'],
    borderActive: 'rgba(136,255,128,0.66)',
    borderIdle: 'rgba(136,255,128,0.30)',
    ringOuter: 'rgba(136,255,128,0.14)',
    particle: false,
  },
  rare: {
    key: 'rare',
    label: 'RARE',
    stars: 3,
    color: '#3FFE94',
    glow: 'rgba(63,254,148,0.36)',
    gradient: ['#152D24', '#0D241D'],
    borderActive: 'rgba(63,254,148,0.72)',
    borderIdle: 'rgba(63,254,148,0.32)',
    ringOuter: 'rgba(63,254,148,0.16)',
    particle: false,
  },
  epic: {
    key: 'epic',
    label: 'EPIC',
    stars: 4,
    color: '#19FFBE',
    glow: 'rgba(25,255,190,0.40)',
    gradient: ['#0F2F2C', '#082525'],
    borderActive: 'rgba(25,255,190,0.78)',
    borderIdle: 'rgba(25,255,190,0.34)',
    ringOuter: 'rgba(25,255,190,0.18)',
    particle: false,
  },
  legendary: {
    key: 'legendary',
    label: 'LEGENDARY',
    stars: 5,
    color: '#00FFE0',
    glow: 'rgba(0,255,224,0.44)',
    gradient: ['#0B3535', '#062828'],
    borderActive: 'rgba(0,255,224,0.84)',
    borderIdle: 'rgba(0,255,224,0.38)',
    ringOuter: 'rgba(0,255,224,0.20)',
    particle: true,
  },
};

// Crimson rarity ladder — 5 reds, light pink-red → deep vivid crimson.
// Mirrors the green ladder's brightness/saturation ramp so the visual
// rhythm of the 5-tier system is preserved when Crimson is equipped.
const RARITY_CRIMSON: Record<Rarity, RarityToken> = {
  common: {
    key: 'common',
    label: 'COMMON',
    stars: 1,
    color: '#FFB5B8',
    glow: 'rgba(255,181,184,0.28)',
    gradient: ['#2A1F20', '#1B1517'],
    borderActive: 'rgba(255,181,184,0.60)',
    borderIdle: 'rgba(255,181,184,0.28)',
    ringOuter: 'rgba(255,181,184,0.13)',
    particle: false,
  },
  uncommon: {
    key: 'uncommon',
    label: 'UNCOMMON',
    stars: 2,
    color: '#FF8085',
    glow: 'rgba(255,128,133,0.32)',
    gradient: ['#2A1718', '#21100F'],
    borderActive: 'rgba(255,128,133,0.66)',
    borderIdle: 'rgba(255,128,133,0.30)',
    ringOuter: 'rgba(255,128,133,0.14)',
    particle: false,
  },
  rare: {
    key: 'rare',
    label: 'RARE',
    stars: 3,
    color: '#FE4060',
    glow: 'rgba(254,64,96,0.36)',
    gradient: ['#2D1418', '#240C10'],
    borderActive: 'rgba(254,64,96,0.72)',
    borderIdle: 'rgba(254,64,96,0.32)',
    ringOuter: 'rgba(254,64,96,0.16)',
    particle: false,
  },
  epic: {
    key: 'epic',
    label: 'EPIC',
    stars: 4,
    color: '#FF1944',
    glow: 'rgba(255,25,68,0.40)',
    gradient: ['#310F14', '#270810'],
    borderActive: 'rgba(255,25,68,0.78)',
    borderIdle: 'rgba(255,25,68,0.34)',
    ringOuter: 'rgba(255,25,68,0.18)',
    particle: false,
  },
  legendary: {
    key: 'legendary',
    label: 'LEGENDARY',
    stars: 5,
    color: '#FF0040',
    glow: 'rgba(255,0,64,0.44)',
    gradient: ['#3A0B14', '#28060C'],
    borderActive: 'rgba(255,0,64,0.84)',
    borderIdle: 'rgba(255,0,64,0.38)',
    ringOuter: 'rgba(255,0,64,0.20)',
    particle: true,
  },
};

// Pink rarity ladder — soft pink → neon hot-pink, same ramp shape.
const RARITY_PINK: Record<Rarity, RarityToken> = {
  common: {
    key: 'common',
    label: 'COMMON',
    stars: 1,
    color: '#FFC5E0',
    glow: 'rgba(255,197,224,0.28)',
    gradient: ['#291F26', '#1B141A'],
    borderActive: 'rgba(255,197,224,0.60)',
    borderIdle: 'rgba(255,197,224,0.28)',
    ringOuter: 'rgba(255,197,224,0.13)',
    particle: false,
  },
  uncommon: {
    key: 'uncommon',
    label: 'UNCOMMON',
    stars: 2,
    color: '#FF99CC',
    glow: 'rgba(255,153,204,0.32)',
    gradient: ['#2A1923', '#21111A'],
    borderActive: 'rgba(255,153,204,0.66)',
    borderIdle: 'rgba(255,153,204,0.30)',
    ringOuter: 'rgba(255,153,204,0.14)',
    particle: false,
  },
  rare: {
    key: 'rare',
    label: 'RARE',
    stars: 3,
    color: '#FF66AA',
    glow: 'rgba(255,102,170,0.36)',
    gradient: ['#2D1424', '#240C1C'],
    borderActive: 'rgba(255,102,170,0.72)',
    borderIdle: 'rgba(255,102,170,0.32)',
    ringOuter: 'rgba(255,102,170,0.16)',
    particle: false,
  },
  epic: {
    key: 'epic',
    label: 'EPIC',
    stars: 4,
    color: '#FF3399',
    glow: 'rgba(255,51,153,0.40)',
    gradient: ['#310F26', '#270820'],
    borderActive: 'rgba(255,51,153,0.78)',
    borderIdle: 'rgba(255,51,153,0.34)',
    ringOuter: 'rgba(255,51,153,0.18)',
    particle: false,
  },
  legendary: {
    key: 'legendary',
    label: 'LEGENDARY',
    stars: 5,
    color: '#FF0080',
    glow: 'rgba(255,0,128,0.44)',
    gradient: ['#3A0B24', '#28061C'],
    borderActive: 'rgba(255,0,128,0.84)',
    borderIdle: 'rgba(255,0,128,0.38)',
    ringOuter: 'rgba(255,0,128,0.20)',
    particle: true,
  },
};

// Theme-aware rarity hook. Returns the rarity palette matching the
// equipped cosmetic theme — green by default, crimson reds, or pink.
// Components reading RARITY[xxx] should use this hook instead when
// the visual should swap with the cosmetic theme.
function useThemedRarity(): Record<Rarity, RarityToken> {
  const { equippedThemeId } = useSettings();
  if (equippedThemeId === 'crimson') return RARITY_CRIMSON;
  if (equippedThemeId === 'pink') return RARITY_PINK;
  return RARITY;
}

// ─── types ─────────────────────────────────────────────────

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  unlocked: boolean;
  xp: number;
  progress?: number;
  target?: number;
}

// ─── Star Row ──────────────────────────────────────────────

function StarRow({
  count,
  color,
  dim,
  size = 10,
}: {
  count: number;
  color: string;
  dim?: boolean;
  size?: number;
}) {
  return (
    <View style={cardStyles.starRow}>
      {Array.from({ length: count }).map((_, i) => (
        <Text
          key={i}
          style={{
            color,
            fontSize: size,
            lineHeight: size,
            opacity: dim ? 0.35 : 1,
            marginRight: 1.5,
          }}
        >
          ★
        </Text>
      ))}
    </View>
  );
}

// ─── Floating Particles (legendary halo) ───────────────────

const PARTICLE_OFFSETS = [
  { x: 14, delay: 0 },
  { x: 38, delay: 380 },
  { x: 62, delay: 720 },
  { x: 86, delay: 1100 },
  { x: 110, delay: 1500 },
];

function Particle({ x, delay, color }: { x: number; delay: number; color: string }) {
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(withTiming(-26, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.85, { duration: 600, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 1600, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [delay]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  return (
    <Reanimated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: x,
          bottom: 0,
          width: 3,
          height: 3,
          borderRadius: 1.5,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

function LegendaryParticles({ color }: { color: string }) {
  return (
    <View pointerEvents="none" style={cardStyles.particleLayer}>
      {PARTICLE_OFFSETS.map((p, i) => (
        <Particle key={i} x={p.x} delay={p.delay} color={color} />
      ))}
    </View>
  );
}

// ─── Ambient Glow Halo ─────────────────────────────────────

function GlowHalo({ tier, intense }: { tier: RarityToken; intense: boolean }) {
  const o = useSharedValue(intense ? 0.55 : 0.3);

  useEffect(() => {
    o.value = withRepeat(
      withTiming(intense ? 1 : 0.65, {
        duration: 2400,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );
  }, [intense]);

  const style = useAnimatedStyle(() => ({ opacity: o.value }));

  return (
    <Reanimated.View pointerEvents="none" style={[cardStyles.haloWrap, style]}>
      <LinearGradient
        colors={[tier.glow, 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={cardStyles.haloGradient}
      />
    </Reanimated.View>
  );
}

// ─── Achievement Card (Gacha Tile) ─────────────────────────

interface CardProps {
  achievement: Achievement;
  index: number;
  onPress: (a: Achievement) => void;
}

function AchievementCard({ achievement, index, onPress }: CardProps) {
  const themedRarity = useThemedRarity();
  const tier = themedRarity[rarityFromXP(achievement.xp)];
  const unlocked = achievement.unlocked;
  const progressPercent = achievement.target
    ? Math.min(100, Math.round(((achievement.progress ?? 0) / achievement.target) * 100))
    : 100;

  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = () => {
    scale.value = withSpring(0.965, { stiffness: 320, damping: 14 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { stiffness: 280, damping: 12 });
  };
  const handlePress = () => {
    Haptics.impactAsync(
      unlocked ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => {});
    onPress(achievement);
  };

  // Locked silhouette
  if (!unlocked) {
    return (
      <Reanimated.View
        entering={FadeInDown.delay(index * 50)
          .duration(220)
          .easing(Easing.out(Easing.quad))}
        exiting={FadeOut.duration(150)}
      >
        <Pressable onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
          <Reanimated.View style={[cardStyles.lockedCard, pressStyle]}>
            <View style={cardStyles.lockedIconWrap}>
              <Feather
                name={achievement.icon}
                size={18}
                color={colors.button1}
                style={{ opacity: 0.2 }}
              />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <View style={cardStyles.starRow}>
                {Array.from({ length: tier.stars }).map((_, i) => (
                  <Text
                    key={i}
                    style={{ color: colors.button2, fontSize: 9, lineHeight: 9, marginRight: 1.5 }}
                  >
                    ★
                  </Text>
                ))}
              </View>
              <Text style={cardStyles.lockedTitle}>???</Text>
              <Text style={cardStyles.lockedDesc}>{achievement.description}</Text>
              {achievement.target != null && (
                <View style={cardStyles.progressRow}>
                  <View style={cardStyles.barTrack}>
                    <View
                      style={[
                        cardStyles.barFill,
                        { width: `${progressPercent}%`, backgroundColor: colors.button2 },
                      ]}
                    />
                  </View>
                  <Text style={cardStyles.progressLabel}>
                    {Math.min(achievement.progress ?? 0, achievement.target)}/{achievement.target}
                  </Text>
                </View>
              )}
            </View>
            <View style={cardStyles.lockBadge}>
              <Feather name="lock" size={11} color={colors.button1} />
            </View>
          </Reanimated.View>
        </Pressable>
      </Reanimated.View>
    );
  }

  // Unlocked gacha tile
  return (
    <Reanimated.View
      entering={FadeInDown.delay(index * 60)
        .duration(220)
        .easing(Easing.out(Easing.quad))
        .springify()
        .damping(14)}
      exiting={FadeOut.duration(150)}
    >
      <Pressable onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Reanimated.View style={pressStyle}>
          {/* Outer glow halo */}
          <GlowHalo tier={tier} intense={tier.key === 'legendary' || tier.key === 'epic'} />

          {/* Card body */}
          <View
            style={[cardStyles.card, { borderColor: tier.borderActive, shadowColor: tier.color }]}
          >
            <LinearGradient
              colors={tier.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />

            {/* Rarity ribbon top */}
            <View
              style={[
                cardStyles.rarityRibbon,
                { backgroundColor: tier.color + '22', borderColor: tier.color + '55' },
              ]}
            >
              <Text style={[cardStyles.rarityLabel, { color: tier.color }]} numberOfLines={1}>
                {tier.label}
              </Text>
            </View>

            {/* Particle layer for legendary */}
            {tier.particle && <LegendaryParticles color={tier.color} />}

            <View style={cardStyles.cardRow}>
              {/* Icon orb */}
              <View
                style={[
                  cardStyles.iconWrap,
                  { borderColor: tier.color, backgroundColor: tier.color + '15' },
                ]}
              >
                <Feather name={achievement.icon} size={20} color={tier.color} />
              </View>

              <View style={cardStyles.cardText}>
                <StarRow count={tier.stars} color={tier.color} />
                <Text style={[cardStyles.cardTitle, { color: '#F4F4F4' }]} numberOfLines={1}>
                  {achievement.title}
                </Text>
                <Text style={cardStyles.cardDesc} numberOfLines={2}>
                  {achievement.description}
                </Text>
              </View>

              <View
                style={[
                  cardStyles.xpBadge,
                  { backgroundColor: tier.color + '22', borderColor: tier.color + '88' },
                ]}
              >
                <Text style={[cardStyles.xpText, { color: tier.color }]}>+{achievement.xp}</Text>
                <Text style={[cardStyles.xpLabel, { color: tier.color, opacity: 0.7 }]}>XP</Text>
                <View style={[cardStyles.xpBadgeDivider, { backgroundColor: tier.color + '44' }]} />
                <View style={cardStyles.coinRow}>
                  <MaterialCommunityIcons name="circle" size={8} color={colors.fav} />
                  <Text style={[cardStyles.coinText, { color: colors.fav }]}>
                    +{getCoinsForAchievement(achievement.xp)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Reanimated.View>
      </Pressable>
    </Reanimated.View>
  );
}

// ─── Detail Modal (5-star pull moment) ─────────────────────

function DetailModal({
  achievement,
  onClose,
}: {
  achievement: Achievement | null;
  onClose: () => void;
}) {
  const themedRarity = useThemedRarity();
  const tier = achievement ? themedRarity[rarityFromXP(achievement.xp)] : themedRarity.common;
  const flash = useSharedValue(0);
  const scale = useSharedValue(0.85);

  useEffect(() => {
    if (!achievement) return;
    flash.value = 0;
    scale.value = 0.92;
    flash.value = withSequence(
      withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }),
      withTiming(0.35, { duration: 600, easing: Easing.in(Easing.quad) }),
    );
    scale.value = withSpring(1, { stiffness: 180, damping: 17, mass: 1 });
  }, [achievement]);

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!achievement) return null;
  const unlocked = achievement.unlocked;

  return (
    <Modal visible={!!achievement} transparent animationType="none" onRequestClose={onClose}>
      <Reanimated.View
        entering={FadeIn.duration(340).easing(Easing.out(Easing.cubic))}
        exiting={FadeOut.duration(200).easing(Easing.in(Easing.cubic))}
        style={modalStyles.backdrop}
      >
        <BlurView intensity={32} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Reanimated.View style={[modalStyles.cardWrap, scaleStyle]}>
          {/* Brightness flash */}
          <Reanimated.View
            pointerEvents="none"
            style={[modalStyles.flash, { backgroundColor: tier.color }, flashStyle]}
          />

          <View style={[modalStyles.card, { borderColor: tier.borderActive }]}>
            <LinearGradient
              colors={tier.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />

            {/* Rarity banner */}
            <View
              style={[
                modalStyles.rarityBanner,
                { backgroundColor: tier.color + '22', borderColor: tier.color + '88' },
              ]}
            >
              <Text style={[modalStyles.rarityBannerText, { color: tier.color }]}>
                {tier.label}
              </Text>
            </View>

            {/* Star row */}
            <View style={modalStyles.modalStars}>
              {Array.from({ length: tier.stars }).map((_, i) => (
                <Text
                  key={i}
                  style={{
                    color: tier.color,
                    fontSize: 18,
                    lineHeight: 18,
                    marginHorizontal: 2,
                    opacity: unlocked ? 1 : 0.3,
                  }}
                >
                  ★
                </Text>
              ))}
            </View>

            {/* Icon orb */}
            <View
              style={[
                modalStyles.modalIconWrap,
                {
                  borderColor: tier.color,
                  backgroundColor: tier.color + '18',
                  shadowColor: tier.color,
                },
              ]}
            >
              <Feather
                name={achievement.icon}
                size={48}
                color={tier.color}
                style={{ opacity: unlocked ? 1 : 0.25 }}
              />
            </View>

            {/* Title */}
            <Text style={modalStyles.modalTitle}>{unlocked ? achievement.title : '???'}</Text>
            <Text style={modalStyles.modalDesc}>{achievement.description}</Text>

            {/* Reward — XP + coins */}
            <View
              style={[
                modalStyles.modalReward,
                { backgroundColor: tier.color + '18', borderColor: tier.color + '66' },
              ]}
            >
              <Text style={[modalStyles.modalRewardLabel, { color: tier.color }]}>REWARD</Text>
              <Text style={[modalStyles.modalRewardXP, { color: tier.color }]}>
                +{achievement.xp} XP
              </Text>
              <View style={modalStyles.modalRewardCoinRow}>
                <MaterialCommunityIcons name="circle" size={12} color={colors.fav} />
                <Text style={[modalStyles.modalRewardCoin, { color: colors.fav }]}>
                  +{getCoinsForAchievement(achievement.xp)} COINS
                </Text>
              </View>
            </View>

            {/* Progress (if locked) */}
            {!unlocked && achievement.target != null && (
              <View style={{ width: '100%', marginTop: 14, gap: 6 }}>
                <Text style={modalStyles.modalProgressLabel}>
                  PROGRESS · {Math.min(achievement.progress ?? 0, achievement.target)}/
                  {achievement.target}
                </Text>
                <View style={modalStyles.modalBarTrack}>
                  <LinearGradient
                    colors={[tier.color + '88', tier.color]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      modalStyles.modalBarFill,
                      {
                        width: `${Math.min(100, Math.round(((achievement.progress ?? 0) / achievement.target) * 100))}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>
        </Reanimated.View>
      </Reanimated.View>
    </Modal>
  );
}

// ─── XP Banner Header (diagonal gradient + vignette) ───────

function XPHeader({ equippedTitle }: { equippedTitle: string | null }) {
  const { totalXP, levelInfo, levelTitle } = useXP();
  const pct = Math.round(levelInfo.progress * 100);
  const displayTitle = equippedTitle ?? levelTitle.title;

  // Ambient shimmer on level pill
  const shimmer = useSharedValue(0);
  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, []);
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.4, 0.95], Extrapolation.CLAMP),
  }));

  return (
    <Reanimated.View
      entering={FadeIn.duration(260).easing(Easing.out(Easing.quad))}
      style={bannerStyles.wrap}
    >
      <LinearGradient
        colors={['#1C2521', '#1A1919', '#171716']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={bannerStyles.gradient}
      />

      {/* Edge vignette */}
      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'transparent', 'transparent', 'rgba(0,0,0,0.55)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={bannerStyles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={bannerStyles.kicker}>ADVENTURER PROFILE</Text>
          <Text style={bannerStyles.title} numberOfLines={1}>
            {displayTitle}
          </Text>
          <Text style={bannerStyles.sub}>{totalXP.toLocaleString()} XP earned</Text>
        </View>

        {/* Animated level pill */}
        <View style={[bannerStyles.levelPillWrap, { borderColor: levelTitle.color }]}>
          <Reanimated.View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: levelTitle.color, borderRadius: 14 },
              shimmerStyle,
            ]}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.85)']}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 13, margin: 1.5 }]}
          />
          <Text style={bannerStyles.levelLabel}>LV</Text>
          <Text style={[bannerStyles.levelNum, { color: levelTitle.color }]}>
            {levelInfo.level}
          </Text>
        </View>
      </View>

      {/* XP bar */}
      <View style={bannerStyles.barTrack}>
        <LinearGradient
          colors={[levelTitle.color + '88', levelTitle.color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[bannerStyles.barFill, { width: `${pct}%` }]}
        />
      </View>
      <Text style={bannerStyles.barLabel}>
        {levelInfo.currentLevelXP} / {levelInfo.xpForNextLevel} XP · Next: Lv {levelInfo.level + 1}
      </Text>
    </Reanimated.View>
  );
}

// ─── Rarity Filter Pills ───────────────────────────────────

const FILTER_ORDER: (Rarity | 'all')[] = ['all', 'legendary', 'epic', 'rare', 'uncommon', 'common'];

function RarityFilterBar({
  active,
  onChange,
  counts,
}: {
  active: Rarity | 'all';
  onChange: (r: Rarity | 'all') => void;
  counts: Record<Rarity | 'all', number>;
}) {
  const themedRarity = useThemedRarity();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={filterStyles.row}
    >
      {FILTER_ORDER.map((r) => {
        const isActive = active === r;
        const tier = r === 'all' ? null : themedRarity[r];
        const color = tier?.color ?? '#B5B5B5';
        const label = r === 'all' ? 'ALL' : tier!.label;
        return (
          <TouchableOpacity
            key={r}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(r);
            }}
            activeOpacity={0.8}
            style={[
              filterStyles.chip,
              isActive && { borderColor: color, backgroundColor: color + '18' },
            ]}
          >
            {tier && (
              <View style={filterStyles.starCluster}>
                {Array.from({ length: tier.stars }).map((_, i) => (
                  <Text
                    key={i}
                    style={{
                      color,
                      fontSize: 8,
                      lineHeight: 8,
                      marginRight: 1,
                      opacity: isActive ? 1 : 0.55,
                    }}
                  >
                    ★
                  </Text>
                ))}
              </View>
            )}
            <Text style={[filterStyles.chipText, { color: isActive ? color : colors.button1 }]}>
              {label}
            </Text>
            <Text style={[filterStyles.chipCount, { color: isActive ? color : colors.button1 }]}>
              {counts[r]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Leaderboard ───────────────────────────────────────────
//
// Rarity-driven ranking page. Mirrors the season hub aesthetic:
// muted RPG palette, star-row rarity signals, ceremonial top-3,
// gradient backdrops, optional legendary particles.

// Rank → rarity mapping. Top 3 ceremonial, then taper down.
function rankToRarity(rank: number): Rarity {
  if (rank <= 1) return 'legendary';
  if (rank <= 2) return 'epic';
  if (rank <= 3) return 'rare';
  if (rank <= 10) return 'uncommon';
  return 'common';
}

// ─── Avatar tile (rounded-square, rarity-bordered) ─────────
//
// Square profile tile with rarity color driving the border and
// background tint. Shows the user's avatar image if provided,
// otherwise their name initials in the rarity color.

function formatXP(xp: number): string {
  if (xp >= 10000) return `${(xp / 1000).toFixed(1)}k`;
  if (xp >= 1000) return `${(xp / 1000).toFixed(2)}k`;
  return xp.toLocaleString();
}

// ─── Top three showcase ───────────────────────────────────

interface ShowcaseEntry {
  rank: 1 | 2 | 3;
  name: string;
  xp: number;
  // Tier-of-the-moment for this entry (e.g. "Spartan", "Olympian").
  // Surfaced under the name so the podium tells you WHAT KIND of
  // athlete is up there, not just a number.
  title: string;
  // Whether this entry represents the current user. Drives a
  // small "YOU" pill on the avatar and an accent inset stroke,
  // mirroring how YourStandingCard labels the user elsewhere.
  isYou: boolean;
}

// ─── Slot sub-pieces ──────────────────────────────────────
// Each leaf owns a single visual responsibility so the orchestrator
// (`TopShowcaseSlot`) stays declarative. Per design-taste pass:
// three leaves instead of one 70-line function resists future taste
// drift.

// SlotAvatar — avatar tile + rank-1 ambient shimmer + rank-1 one-shot
// impact glow + isYou inset accent stroke. The depth signal for the
// winner lives entirely on the avatar (the card-level tint wash was
// dropped per taste's "pick one of [wash, ring], not both" rule).
function SlotAvatar({
  size,
  tier,
  avatarUrl,
  name,
  isFirst,
  isYou,
}: {
  size: number;
  tier: RarityToken;
  avatarUrl?: string | null;
  name?: string | null;
  isFirst: boolean;
  isYou: boolean;
}) {
  const { accent } = useAccent();
  const ringSize = size + 14;
  const ringRadius = Math.round(ringSize * 0.25);
  const innerRadius = Math.max(5, Math.round((size - 2) * 0.25));

  // Perpetual shimmer on the rank-1 ring — slowed to 3000ms and
  // widened to scale [0.96, 1.07] so it reads as regal breathing,
  // not a layout glitch.
  const shimmer = useSharedValue(0);
  useEffect(() => {
    if (isFirst) {
      shimmer.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    }
  }, [isFirst]);
  const ringPulse = useAnimatedStyle(() => ({
    opacity: isFirst ? interpolate(shimmer.value, [0, 1], [0.55, 1], Extrapolation.CLAMP) : 1,
    transform: [
      {
        scale: isFirst ? interpolate(shimmer.value, [0, 1], [0.96, 1.07], Extrapolation.CLAMP) : 1,
      },
    ],
  }));

  // One-shot impact glow — fires ~340ms after mount when the rank-1
  // slot has just landed. Layered over the perpetual shimmer so the
  // moment of impact reads as a brighter pop rather than a steady glow.
  const impact = useSharedValue(0);
  useEffect(() => {
    if (!isFirst) return;
    impact.value = withDelay(
      460, // 180 entrance delay + 60 hold + 220 to peak of overshoot
      withSequence(
        withTiming(1, { duration: 120, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 240, easing: Easing.in(Easing.cubic) }),
      ),
    );
  }, [isFirst]);
  const impactStyle = useAnimatedStyle(() => ({ opacity: impact.value }));

  return (
    <View style={[topShowcaseStyles.tileWrap, { height: ringSize }]}>
      {/* Vertical spotlight column behind rank 1 — a thin gradient
          stripe brightest where the avatar covers it, fading above
          and below. Reads as a literal podium spotlight. Painted
          before the avatar so the avatar masks the middle. */}
      {isFirst && (
        <View
          pointerEvents="none"
          style={[topShowcaseStyles.spotlightColumn, { height: ringSize + 28 }]}
        >
          <LinearGradient
            colors={['transparent', tier.glow, tier.glow, 'transparent']}
            locations={[0, 0.25, 0.75, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
      )}
      {isFirst && (
        <Reanimated.View
          style={[
            topShowcaseStyles.glowRing,
            {
              width: ringSize,
              height: ringSize,
              borderRadius: ringRadius,
              borderColor: tier.color,
              shadowColor: tier.color,
            },
            ringPulse,
          ]}
        />
      )}
      {isFirst && (
        <Reanimated.View
          pointerEvents="none"
          style={[
            topShowcaseStyles.impactGlow,
            {
              width: ringSize + 8,
              height: ringSize + 8,
              borderRadius: ringRadius + 4,
              shadowColor: tier.color,
            },
            impactStyle,
          ]}
        />
      )}
      <AvatarTile size={size} color={tier.color} avatarUrl={avatarUrl} name={name} glow={isFirst} />
      {isYou && (
        <View
          pointerEvents="none"
          style={[
            topShowcaseStyles.youInsetRing,
            { width: size - 4, height: size - 4, borderRadius: innerRadius, borderColor: accent },
          ]}
        />
      )}
    </View>
  );
}

// SlotIdentity — rarity ribbon, ordinal label, name, tier title.
// Ranks 2/3 carry the same shape as rank 1 but with reduced ribbon
// emphasis so the gold slot stays unambiguously dominant.
function SlotIdentity({
  rank,
  name,
  title,
  tier,
  isFirst,
  isYou,
}: {
  rank: 1 | 2 | 3;
  name: string;
  title: string;
  tier: RarityToken;
  isFirst: boolean;
  isYou: boolean;
}) {
  const { accent, accentSubtle } = useAccent();
  const ordinal = rank === 1 ? '1ST' : rank === 2 ? '2ND' : '3RD';
  return (
    <View style={topShowcaseStyles.identity}>
      {/* Rarity ribbon — mirrors AchievementCard ribbon vocabulary so
          the podium reads as a sibling of the achievement tiles. */}
      <View
        style={[
          topShowcaseStyles.ribbon,
          {
            backgroundColor: tier.color + (isFirst ? '22' : '14'),
            borderColor: tier.color + (isFirst ? '55' : '33'),
          },
        ]}
      >
        <Text
          style={[topShowcaseStyles.ribbonText, { color: tier.color, opacity: isFirst ? 1 : 0.85 }]}
          numberOfLines={1}
        >
          {tier.label}
        </Text>
      </View>
      <Text style={[topShowcaseStyles.rankLabel, isFirst && { color: tier.color }]}>{ordinal}</Text>
      <Text
        style={[topShowcaseStyles.name, isFirst && topShowcaseStyles.nameFirst]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {name}
      </Text>
      <Text style={topShowcaseStyles.title} numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Text>
      {isYou && (
        <View
          style={[
            topShowcaseStyles.youPill,
            { backgroundColor: accentSubtle, borderColor: accent + '55' },
          ]}
        >
          <Text style={[topShowcaseStyles.youPillText, { color: accent }]}>YOU</Text>
        </View>
      )}
    </View>
  );
}

// SlotXP — XP figure. Rank 1 scrubs 0 → target on mount via the
// AnimatedTextInput trick (mirrors StandingPrimaryStat). Ranks 2/3
// stay static — counter-up on all three would read as casino-busy.
function SlotXP({
  target,
  tier,
  isFirst,
}: {
  target: number;
  tier: RarityToken;
  isFirst: boolean;
}) {
  const count = useSharedValue(0);
  useEffect(() => {
    if (!isFirst) return;
    // Delay until after the rank-1 landing has settled (180 entrance +
    // 60 hold + 280 overshoot ≈ 520ms). The eye sees the avatar land,
    // then the score register — choreography, not race.
    count.value = withDelay(
      520,
      withTiming(target, { duration: 520, easing: Easing.out(Easing.cubic) }),
    );
  }, [isFirst, target]);

  const animatedProps = useAnimatedProps(() => {
    'worklet';
    const raw = Math.max(0, Math.round(count.value));
    let formatted: string;
    if (raw >= 10000) {
      formatted = `${(raw / 1000).toFixed(1)}k`;
    } else if (raw >= 1000) {
      formatted = `${(raw / 1000).toFixed(2)}k`;
    } else {
      formatted = String(raw);
    }
    return { text: formatted } as any;
  });

  if (!isFirst) {
    return (
      <Text style={[topShowcaseStyles.xp, { color: colors.titleText }]}>{formatXP(target)}</Text>
    );
  }

  return (
    <AnimatedTextInput
      editable={false}
      defaultValue={formatXP(0)}
      animatedProps={animatedProps}
      style={[
        topShowcaseStyles.xp,
        topShowcaseStyles.xpFirst,
        topShowcaseStyles.xpInput,
        { color: tier.color },
      ]}
      accessible
      accessibilityLabel={formatXP(target)}
      underlineColorAndroid="transparent"
    />
  );
}

// TopShowcaseSlot — orchestration. Owns the entrance choreography
// (manual landing for rank 1, layout animator for ranks 2/3) and the
// press feedback. Composes the three leaves above.
function TopShowcaseSlot({
  entry,
  avatarUrl,
  displayName,
  delay,
}: {
  entry: ShowcaseEntry;
  avatarUrl?: string | null;
  displayName?: string | null;
  delay: number;
}) {
  const themedRarity = useThemedRarity();
  const tier = themedRarity[rankToRarity(entry.rank)];
  const isFirst = entry.rank === 1;
  const isSecond = entry.rank === 2;
  const size = isFirst ? 72 : 52;
  // Podium step on the 4-grid (16 / 28 instead of the old 18 / 28).
  const podiumOffset = isFirst ? 0 : isSecond ? 16 : 28;

  // Press feedback — same scale + spring spec as AchievementCard so
  // the podium reads as interactive in the same vocabulary as the
  // rest of the rarity family.
  const press = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const onPressIn = useCallback(() => {
    press.value = withSpring(0.965, { stiffness: 320, damping: 14 });
  }, []);
  const onPressOut = useCallback(() => {
    press.value = withSpring(1, { stiffness: 320, damping: 14 });
  }, []);
  const onPress = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
  }, []);

  // Rank-1 manual landing — anticipation → impact → settle.
  // Starts at translateY: -28 above its rest position, holds 60ms
  // (so ranks 2/3 land first), then drops with a bezier overshoot
  // and a spring settle. Paired with a Success haptic at the
  // zero-crossing for a small ceremonial thud.
  const landY = useSharedValue(isFirst ? -28 : 0);
  const landOpacity = useSharedValue(isFirst ? 0 : 1);
  useEffect(() => {
    if (!isFirst) return;
    landOpacity.value = withDelay(
      180,
      withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }),
    );
    landY.value = withDelay(
      180,
      withSequence(
        withTiming(0, { duration: 280, easing: Easing.bezier(0.2, 0.9, 0.25, 1.4) }),
        withSpring(0, { damping: 12, stiffness: 220 }),
      ),
    );
    const t = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }, 460); // entrance delay (180) + hold (60) + 220ms to overshoot peak
    return () => clearTimeout(t);
  }, [isFirst]);
  const landingStyle = useAnimatedStyle(() => ({
    opacity: landOpacity.value,
    transform: [{ translateY: landY.value }],
  }));

  // Rank 1 uses the manual landing style; ranks 2/3 use the layout
  // animator (FadeInDown with the back-overshoot easing).
  const wrapperEntering = isFirst
    ? undefined
    : FadeInDown.delay(delay)
        .duration(340)
        .easing(Easing.out(Easing.back(1.2)));

  return (
    <Reanimated.View
      entering={wrapperEntering}
      style={[topShowcaseStyles.slot, { marginTop: podiumOffset }, isFirst && landingStyle]}
    >
      <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <Reanimated.View style={[topShowcaseStyles.slotInner, pressStyle]}>
          <SlotAvatar
            size={size}
            tier={tier}
            avatarUrl={avatarUrl}
            name={displayName ?? entry.name}
            isFirst={isFirst}
            isYou={entry.isYou}
          />
          <SlotIdentity
            rank={entry.rank}
            name={displayName ?? entry.name}
            title={entry.title}
            tier={tier}
            isFirst={isFirst}
            isYou={entry.isYou}
          />
          <SlotXP target={entry.xp} tier={tier} isFirst={isFirst} />
        </Reanimated.View>
      </Pressable>
    </Reanimated.View>
  );
}

// PodiumShimmer — perpetual shine pass across the podium card.
// Mirrors BannerShimmer (line ~2433) so the podium reads as a
// sibling of the season banner: same skewed band, same gradient,
// same timing. Pure transform + opacity — counts as one perpetual
// loop in the podium region's budget.
function PodiumShimmer() {
  const x = useSharedValue(-1);
  // useFocusEffect + cancelAnimation pattern — restart the loop every
  // time the screen regains focus so animations resume after tab
  // switches, navigation away/back, or any state where Reanimated
  // worklets may have stalled. Cleanup on blur prevents leaks.
  useFocusEffect(
    useCallback(() => {
      x.value = withRepeat(
        withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.quad) }),
        -1,
        false,
      );
      return () => cancelAnimation(x);
    }, []),
  );
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(x.value, [-1, 1], [-260, 260], Extrapolation.CLAMP) },
      { skewX: '-18deg' },
    ],
    opacity: interpolate(
      x.value,
      [-1, -0.5, 0, 0.5, 1],
      [0, 0.45, 0.7, 0.45, 0],
      Extrapolation.CLAMP,
    ),
  }));
  return (
    <Reanimated.View pointerEvents="none" style={[topShowcaseStyles.podiumShimmer, style]}>
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.07)', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />
    </Reanimated.View>
  );
}

// PodiumSectionHeader — section header with a one-shot reveal sweep
// and dot pulse on mount. Sits above the podium card and announces
// the section into existence before the slot stagger fires.
// Total reveal beat is ~520ms, parallel with the slot entries (the
// dot punches at 240ms, the sweep crosses by 520ms, then the
// rank-1 manual landing fires at ~640ms).
function PodiumSectionHeader({
  count,
  mode,
  onModeChange,
  onAddFriend,
}: {
  count: number;
  mode: LeaderboardMode;
  onModeChange: (m: LeaderboardMode) => void;
  onAddFriend: () => void;
}) {
  const themedRarity = useThemedRarity();
  const { accent } = useAccent();
  const sweep = useSharedValue(0);
  const dotPulse = useSharedValue(0);

  useEffect(() => {
    sweep.value = withTiming(1, {
      duration: 520,
      easing: Easing.inOut(Easing.cubic),
    });
    dotPulse.value = withSequence(
      withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 280, easing: Easing.in(Easing.cubic) }),
    );
  }, []);

  // Sweep band traverses from off-left to off-right of the section.
  // Width is approximated from SCREEN_WIDTH minus scroll padding
  // (16 each side) — the section sits inside leaderboardStyles.scroll.
  const SWEEP_BAND_WIDTH = 120;
  const SWEEP_TRAVEL = SCREEN_WIDTH - 32;
  const sweepStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          sweep.value,
          [0, 1],
          [-SWEEP_BAND_WIDTH, SWEEP_TRAVEL],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // Dot punches brighter then settles slightly above its idle opacity
  // so the eye registers "something just happened here" without the
  // section header becoming a perpetual fidget.
  const dotPulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dotPulse.value, [0, 0.5, 1], [0.6, 1, 0.85], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(dotPulse.value, [0, 0.5, 1], [1, 1.4, 1.1], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <View style={topShowcaseStyles.sectionHeaderWrap}>
      <View style={leaderboardStyles.sectionHeader}>
        {/* Dot inherits the legendary-tier color so the section is
            semantically tied to the rarity ladder (same hex as
            colors.accent — no visual change, but loaded with meaning). */}
        <Reanimated.View
          style={[
            leaderboardStyles.sectionDot,
            { backgroundColor: themedRarity.legendary.color },
            dotPulseStyle,
          ]}
        />
        <Text style={leaderboardStyles.sectionLabel}>PODIUM</Text>
        <View style={leaderboardStyles.sectionCountPill}>
          <Text style={leaderboardStyles.sectionCountText}>TOP {count}</Text>
        </View>
        {/* Period toggle — pushed to the far right via marginLeft:'auto'
            so it sits at the row's flex-end. Slide-only animation
            mirrors the top-of-screen SwipeTabs indicator. */}
        <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ModePillBar mode={mode} onChange={onModeChange} />
          {/* Add Friend — user-plus icon next to the period toggle.
              Opens a search modal where the user can find someone
              by username and follow them. Same compact pill height
              as the toggle so the row reads as one cluster. */}
          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onAddFriend();
            }}
            hitSlop={6}
            style={({ pressed }) => [
              leaderboardStyles.addFriendBtn,
              pressed && { backgroundColor: 'rgba(255,255,255,0.08)' },
            ]}
          >
            <Feather name="user-plus" size={13} color={accent} />
          </Pressable>
        </View>
      </View>
      {/* Sweep underline — a slim accent gradient band that crosses
          the section header once on mount and then dies. Clipped by
          the track's overflow:hidden so the band reads as in-bounds. */}
      <View pointerEvents="none" style={topShowcaseStyles.sweepTrack}>
        <Reanimated.View
          style={[topShowcaseStyles.sweepBand, { width: SWEEP_BAND_WIDTH }, sweepStyle]}
        >
          <LinearGradient
            colors={['transparent', accent + 'CC', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Reanimated.View>
      </View>
    </View>
  );
}

function TopThreeShowcase({
  entries,
}: {
  entries: (ShowcaseEntry & { avatarUrl?: string | null; displayName?: string | null })[];
}) {
  const first = entries.find((e) => e.rank === 1);
  const second = entries.find((e) => e.rank === 2);
  const third = entries.find((e) => e.rank === 3);
  if (!first || !second || !third) return null;

  return (
    <View style={topShowcaseStyles.card}>
      {/* Single neutral backdrop — the rank-1 tint wash was dropped
          (taste's depth-collapse argument: the slot-level glow ring
          already carries the winner signal). Border tinted with the
          legendary tier idle stroke so the card itself inherits a
          quiet gold identity. */}
      <LinearGradient
        colors={[colors.container, colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Background shine pass — same shimmer the season banner uses,
          so the podium reads as part of the same surface family. */}
      <PodiumShimmer />
      {/* Podium-step backdrops — three tier-colored zones rising from
          the card's bottom edge, ordered [silver, gold, bronze] to
          match the slot row above. Heights step like a real podium
          (1st tallest, then 2nd, then 3rd) so the silhouette reads
          even when content fades. */}
      <View style={topShowcaseStyles.podiumSteps} pointerEvents="none">
        {/* Bottom-anchored monochrome-green pedestals. Three shades
            on the same hue (~150°) with progressive lightness so the
            podium reads as 3 distinct steps while staying inside the
            brand mint ladder. Each pedestal is darker than the brand
            mint #00FA9A so the mint content above (ribbons, ring,
            rank-1 XP) keeps contrast against the colored backdrop.
            Heights encoded in gradient start positions: rank 1
            rises tallest (0.5), rank 2 shorter (0.6), rank 3 shortest
            (0.7). */}
        <LinearGradient
          colors={['transparent', '#10704BCC']}
          locations={[0.6, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={topShowcaseStyles.stepBox}
        />
        <LinearGradient
          colors={['transparent', '#1FBE83CC']}
          locations={[0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={topShowcaseStyles.stepBox}
        />
        <LinearGradient
          colors={['transparent', '#054532CC']}
          locations={[0.7, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={topShowcaseStyles.stepBox}
        />
      </View>
      <View style={topShowcaseStyles.row}>
        {/* Rank 2 enters first (left), 3 second (right), 1 lands last (center, manual). */}
        <TopShowcaseSlot
          entry={second}
          avatarUrl={second.avatarUrl}
          displayName={second.displayName}
          delay={40}
        />
        <TopShowcaseSlot
          entry={first}
          avatarUrl={first.avatarUrl}
          displayName={first.displayName}
          delay={180}
        />
        <TopShowcaseSlot
          entry={third}
          avatarUrl={third.avatarUrl}
          displayName={third.displayName}
          delay={100}
        />
      </View>
    </View>
  );
}

// ─── Podium redesign sandbox ───────────────────────────────
//
// New podium components rendered side-by-side with the existing
// podium so we can eyeball them against the reference image before
// committing. All inline; no real-data wiring. When the design is
// approved, this block replaces TopThreeShowcase + its supporting
// pieces; until then the existing podium stays untouched.

// Pentagon / shield rank badge pinned to the top of each pillar.
// Five-sided "home plate" shape with rounded top corners and a
// V-point at the bottom. Rank 1 is taller, brighter, and stroked
// in brand mint; ranks 2/3 are smaller and slightly subdued.
function RankBadgePentagon({ rank, color }: { rank: 1 | 2 | 3; color: string }) {
  const isFirst = rank === 1;
  // Near-square shield: rank 1 ~44×46, ranks 2/3 ~34×36. Shallow V
  // (chevron of 6-8px) for a crisp medal-chip silhouette, not the
  // earlier balloon-pin geometry.
  const w = isFirst ? 38 : 34;
  const h = isFirst ? 46 : 36;
  const vDepth = isFirst ? 8 : 6;
  const r = 8;
  const path = `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${h - vDepth} L ${w / 2} ${h} L 0 ${h - vDepth} L 0 ${r} Q 0 0 ${r} 0 Z`;
  // Per-rank id so the two/three badge gradients don't collide on Defs.
  const strokeGradId = `badge-stroke-${rank}`;

  return (
    <View style={{ width: w, height: h, alignItems: 'center', justifyContent: 'flex-start' }}>
      <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <Defs>
          {/* Vertical fade — mint at the top, background color at the V-tip.
              Rank 2/3 only: the inverted badges look "dipped" into the dark
              surface, with the outline dissolving where it meets the pillar. */}
          <SvgLinearGradient id={strokeGradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={1} />
            <Stop offset="1" stopColor={colors.background} stopOpacity={1} />
          </SvgLinearGradient>
        </Defs>
        <Path
          d={path}
          fill={isFirst ? color : colors.background}
          stroke={isFirst ? color : `url(#${strokeGradId})`}
          strokeWidth={isFirst ? 1.4 : 1}
          strokeOpacity={1}
        />
      </Svg>
      <Text
        style={{
          position: 'absolute',
          top: isFirst ? 10 : 7,
          color: isFirst ? '#0E0E0E' : color,
          fontSize: isFirst ? 22 : 17,
          fontWeight: '900',
          letterSpacing: 0.4,
          fontVariant: ['tabular-nums'],
        }}
      >
        {rank}
      </Text>
    </View>
  );
}

// Galaxy backdrop — subtle starfield inside the clipped pillar frame.
// Deterministic positions (looks random, stable across renders) with a
// per-rank offset so the three pillars don't reveal an identical
// pattern when placed side by side. Mix of small dim white stars
// (cosmic dust) and a few brighter mint accent stars (foreground
// luminaries that tie the field into the brand palette).
const GALAXY_DUST: Array<[number, number, number, number]> = [
  [0.12, 0.06, 0.6, 0.4],
  [0.42, 0.04, 1.2, 0.7],
  [0.78, 0.09, 0.5, 0.32],
  [0.25, 0.14, 0.7, 0.45],
  [0.62, 0.18, 0.5, 0.22],
  [0.05, 0.22, 0.6, 0.3],
  [0.88, 0.26, 1.0, 0.6],
  [0.35, 0.28, 0.5, 0.2],
  [0.58, 0.34, 0.7, 0.4],
  [0.18, 0.4, 0.9, 0.5],
  [0.72, 0.42, 0.6, 0.28],
  [0.45, 0.48, 0.5, 0.2],
  [0.85, 0.52, 0.7, 0.4],
  [0.08, 0.55, 0.6, 0.3],
  [0.55, 0.62, 1.0, 0.5],
  [0.28, 0.66, 0.5, 0.22],
  [0.75, 0.7, 0.5, 0.2],
  [0.15, 0.75, 0.8, 0.35],
  [0.48, 0.8, 0.6, 0.28],
  [0.92, 0.82, 0.7, 0.32],
  [0.32, 0.86, 0.5, 0.18],
  [0.62, 0.9, 0.8, 0.4],
  [0.1, 0.92, 0.6, 0.22],
  [0.78, 0.95, 0.5, 0.18],
];
const GALAXY_ACCENT: Array<[number, number, number, number]> = [
  [0.32, 0.16, 1.0, 0.45],
  [0.68, 0.52, 0.9, 0.38],
  [0.22, 0.58, 0.7, 0.32],
  [0.8, 0.78, 0.8, 0.4],
];
function PillarGalaxyBackground({ rank }: { rank: 1 | 2 | 3 }) {
  const { accent } = useAccent();
  const offsetX = rank * 0.07;
  const offsetY = rank * 0.13;
  const wrap = (n: number) => ((n % 1) + 1) % 1;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <Svg width="100%" height="100%">
        {GALAXY_DUST.map(([x, y, r, op], i) => (
          <Circle
            key={`d-${i}`}
            cx={`${wrap(x + offsetX) * 100}%`}
            cy={`${wrap(y + offsetY) * 100}%`}
            r={r}
            fill="#FFFFFF"
            fillOpacity={op}
          />
        ))}
        {GALAXY_ACCENT.map(([x, y, r, op], i) => (
          <Circle
            key={`a-${i}`}
            cx={`${wrap(x + offsetX) * 100}%`}
            cy={`${wrap(y + offsetY) * 100}%`}
            r={r}
            fill={accent}
            fillOpacity={op}
          />
        ))}
      </Svg>
    </View>
  );
}

// Inner glow rendered inside the clipped pillar frame — transparent
// at mid-pillar fading down to colored at the bottom edge, so the
// pillar appears to glow "from within" toward its base.
function PillarInnerGlow({ color, isFirst }: { color: string; isFirst: boolean }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={['transparent', color + (isFirst ? '66' : '22')]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: '40%',
        bottom: 0,
      }}
    />
  );
}

// Bottom bloom — two layered halos using SVG RadialGradient for true
// elliptical falloff. Two crossed LinearGradients produced a visible
// diamond/plus crosshatch pattern at the edges; a radial fades smoothly
// in all directions from a single center. Stacked tight + wide halos
// approximate inverse-square falloff (close-light is dense, far-light
// is diffuse) the way one gradient can't. `rank` keys unique gradient
// IDs so the three pillars don't collide on Defs.
function PillarBottomBloom({
  color,
  intensity,
  rank,
}: {
  color: string;
  intensity: number;
  rank: 1 | 2 | 3;
}) {
  const tightId = `bloom-tight-${rank}`;
  const wideId = `bloom-wide-${rank}`;
  return (
    <>
      {/* Tight halo — dense, hugs the LED. Aspect ratio of the host
          View stretches the radial into a wide ellipse, matching the
          way a horizontal LED strip actually spreads light. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: '10%',
          right: '10%',
          bottom: -14,
          height: 32,
          opacity: intensity,
        }}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id={tightId} cx="0.5" cy="0.5" rx="0.5" ry="0.5">
              <Stop offset="0" stopColor={color} stopOpacity={1} />
              <Stop offset="0.45" stopColor={color} stopOpacity={0.55} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${tightId})`} />
        </Svg>
      </View>

      {/* Wide diffuse bloom — broader, dimmer. Peak alpha lower and
          falloff longer so the two halos sum cleanly at the LED
          without overexposing. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: -8,
          right: -8,
          bottom: -38,
          height: 76,
          opacity: intensity * 0.75,
        }}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <RadialGradient id={wideId} cx="0.5" cy="0.5" rx="0.5" ry="0.5">
              <Stop offset="0" stopColor={color} stopOpacity={0.7} />
              <Stop offset="0.55" stopColor={color} stopOpacity={0.22} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${wideId})`} />
        </Svg>
      </View>
    </>
  );
}

// Border glow — single SVG rounded-rect stroke run through an
// feGaussianBlur filter. A real continuous Gaussian gradient, not
// layered approximations. The filter region is expanded (-50% to 150%)
// so the blur falloff doesn't get clipped at the SVG's edges.
// Cross-platform: react-native-svg 15 supports feGaussianBlur on iOS,
// Android, and web. Padding around the pillar gives the blur room to
// fall off into transparency before the SVG ends.
const GLOW_PADDING = 60;
function PillarBorderGlow({
  color,
  width,
  height,
}: {
  color: string;
  width: number;
  height: number;
}) {
  const svgW = width + GLOW_PADDING * 2;
  const svgH = height + GLOW_PADDING * 2;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -GLOW_PADDING,
        left: -GLOW_PADDING,
        width: svgW,
        height: svgH,
      }}
    >
      <Svg width={svgW} height={svgH}>
        <Defs>
          <Filter id="pillar-glow" x="-50%" y="-50%" width="200%" height="200%">
            <FeGaussianBlur stdDeviation="14" />
          </Filter>
        </Defs>
        <Rect
          x={GLOW_PADDING}
          y={GLOW_PADDING}
          width={width}
          height={height}
          rx={28}
          ry={28}
          stroke={color}
          strokeWidth={4}
          fill="none"
          filter="url(#pillar-glow)"
        />
      </Svg>
    </View>
  );
}

// Dotted/dashed orbit ring behind the rank-1 avatar. Static, no loop.
function DottedOrbit({ size, color }: { size: number; color: string }) {
  // SVG Circle with strokeDasharray — the only way to get a reliable
  // dotted ring on a curved path in React Native. (View borderStyle:
  // 'dashed' falls back to solid on iOS for rounded borders.)
  // Slow 18s linear rotation so the dashes appear to travel around
  // the ring like an orbital path. Linear easing because rotation
  // velocity should be constant — eased rotation reads as "wobble."
  const r = (size - 1) / 2;
  const spin = useSharedValue(0);
  // useFocusEffect — keeps the orbit rotation alive across focus
  // changes. 18s loops are particularly susceptible to stalling.
  useFocusEffect(
    useCallback(() => {
      spin.value = withRepeat(withTiming(1, { duration: 18000, easing: Easing.linear }), -1, false);
      return () => cancelAnimation(spin);
    }, []),
  );
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(spin.value, [0, 1], [0, 360])}deg` }],
  }));
  return (
    <Reanimated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: size, height: size }, spinStyle]}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color + '66'}
          strokeWidth={1}
          // Mixed pattern: each repeat is one long 40px line + a run
          // of five 2px dashes. Pattern length ~102; for a typical
          // rank-1 avatar (~108 size, ~336 circumference) this fits
          // ~3 times → 3 long connected line segments around the ring,
          // separated by clusters of small dashes.
          strokeDasharray="40 14 2 6 2 6 2 6 2 6 2 14"
          fill="none"
        />
      </Svg>
    </Reanimated.View>
  );
}

// Topographic background curves + sparkle dots scoped to the podium
// section only. Static SVG; no animation.
const SANDBOX_BACKDROP_W = Dimensions.get('window').width;
// White dust stars spread across the full backdrop — paired with the
// existing mint sparkle cluster (upper region) they form the same
// dust+accent galaxy treatment used inside the pillars, scaled to
// the larger surface.
const BACKDROP_GALAXY_DUST: Array<[number, number, number, number]> = [
  [0.04, 0.04, 0.7, 0.4],
  [0.13, 0.02, 0.5, 0.25],
  [0.21, 0.07, 0.9, 0.55],
  [0.38, 0.03, 0.6, 0.3],
  [0.49, 0.06, 1.0, 0.6],
  [0.59, 0.02, 0.5, 0.2],
  [0.71, 0.08, 0.8, 0.48],
  [0.78, 0.04, 0.6, 0.3],
  [0.08, 0.13, 0.6, 0.32],
  [0.25, 0.16, 0.5, 0.2],
  [0.34, 0.12, 0.7, 0.42],
  [0.46, 0.15, 0.5, 0.22],
  [0.63, 0.13, 0.9, 0.52],
  [0.77, 0.17, 0.5, 0.24],
  [0.03, 0.22, 0.6, 0.3],
  [0.15, 0.26, 1.0, 0.55],
  [0.29, 0.22, 0.5, 0.22],
  [0.41, 0.28, 0.6, 0.32],
  [0.55, 0.25, 0.5, 0.2],
  [0.68, 0.29, 0.7, 0.4],
  [0.82, 0.24, 0.5, 0.22],
  [0.92, 0.3, 0.6, 0.3],
  [0.07, 0.36, 0.5, 0.22],
  [0.18, 0.39, 0.7, 0.4],
  [0.32, 0.35, 0.5, 0.2],
  [0.45, 0.42, 0.9, 0.48],
  [0.58, 0.36, 0.5, 0.22],
  [0.74, 0.41, 0.6, 0.3],
  [0.86, 0.38, 0.7, 0.36],
  [0.11, 0.48, 0.5, 0.24],
  [0.24, 0.52, 0.6, 0.3],
  [0.39, 0.49, 0.5, 0.22],
  [0.52, 0.55, 0.7, 0.4],
  [0.64, 0.5, 0.5, 0.22],
  [0.78, 0.53, 0.8, 0.42],
  [0.91, 0.56, 0.5, 0.22],
  [0.06, 0.62, 0.6, 0.28],
  [0.21, 0.65, 0.5, 0.2],
  [0.35, 0.68, 0.8, 0.4],
  [0.48, 0.63, 0.5, 0.22],
  [0.62, 0.66, 0.6, 0.3],
  [0.75, 0.69, 0.5, 0.2],
  [0.89, 0.65, 0.7, 0.36],
  [0.16, 0.1, 0.5, 0.22],
  [0.94, 0.18, 0.6, 0.28],
  // Lower band — populates the area below the pillars that's now
  // inside the backdrop after extending to full card height.
  [0.08, 0.94, 0.6, 0.3],
  [0.23, 0.97, 0.5, 0.22],
  [0.37, 0.95, 0.7, 0.38],
  [0.51, 0.98, 0.5, 0.2],
  [0.64, 0.96, 0.6, 0.3],
  [0.77, 0.94, 0.5, 0.22],
  [0.91, 0.97, 0.7, 0.35],
];
// Partition the dust array once at module load into 3 bands by index
// modulo 3. Each band gets its own crossfade loop with a coprime
// duration, producing a "stars sparkling in turn" effect — bands
// brighten and dim out of phase, never re-syncing.
const BACKDROP_DUST_BANDS: Array<typeof BACKDROP_GALAXY_DUST> = (() => {
  const bands: Array<typeof BACKDROP_GALAXY_DUST> = [[], [], []];
  BACKDROP_GALAXY_DUST.forEach((star, i) => bands[i % 3].push(star));
  return bands;
})();

function PodiumBackdrop({ height }: { height: number }) {
  const { accent } = useAccent();
  // Three coprime crossfade loops. Coprime so the bands never lock
  // back into sync after their respective periods. Range 0.55→1.0
  // keeps stars visible at the dim end (going to 0 reads as broken
  // pixels rather than twinkle).
  const t1 = useSharedValue(0);
  const t2 = useSharedValue(0);
  const t3 = useSharedValue(0);
  // useFocusEffect — restart sparkle bands when the screen regains
  // focus and clean up cleanly on blur.
  useFocusEffect(
    useCallback(() => {
      t1.value = withRepeat(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
      t2.value = withRepeat(
        withTiming(1, { duration: 2700, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
      t3.value = withRepeat(
        withTiming(1, { duration: 3100, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
      return () => {
        cancelAnimation(t1);
        cancelAnimation(t2);
        cancelAnimation(t3);
      };
    }, []),
  );
  // Phase-shift the bands by inverting one of them — so when band 1
  // is brightening, band 2 is dimming, and band 3 is on its own clock.
  // Full 0 → 1 range so each band fully disappears and reappears.
  const band1Style = useAnimatedStyle(() => ({
    opacity: interpolate(t1.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));
  const band2Style = useAnimatedStyle(() => ({
    opacity: interpolate(t2.value, [0, 1], [1, 0], Extrapolation.CLAMP),
  }));
  const band3Style = useAnimatedStyle(() => ({
    opacity: interpolate(t3.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));
  const bandStyles = [band1Style, band2Style, band3Style];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Static base layer — radial glow, topographic lines, mint
          accent stars. Stays anchored while the dust twinkles. */}
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${SANDBOX_BACKDROP_W} ${height}`}
        preserveAspectRatio="none"
      >
        <Defs>
          {/* Radial gradient — brightest mint at the dead center,
              fading smoothly to fully transparent at the edges. */}
          <RadialGradient id="backdrop-core-glow" cx="0.5" cy="0.55" rx="0.7" ry="0.6">
            <Stop offset="0" stopColor={accent} stopOpacity={0.32} />
            <Stop offset="0.5" stopColor={accent} stopOpacity={0.1} />
            <Stop offset="1" stopColor={accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width={SANDBOX_BACKDROP_W}
          height={height}
          fill="url(#backdrop-core-glow)"
        />
        <G stroke="rgba(255,255,255,0.045)" strokeWidth={1} fill="none">
          <Path
            d={`M 0 ${height * 0.18} Q ${SANDBOX_BACKDROP_W * 0.35} ${height * 0.1}, ${SANDBOX_BACKDROP_W * 0.7} ${height * 0.2} T ${SANDBOX_BACKDROP_W} ${height * 0.16}`}
          />
          <Path
            d={`M 0 ${height * 0.32} Q ${SANDBOX_BACKDROP_W * 0.25} ${height * 0.4}, ${SANDBOX_BACKDROP_W * 0.55} ${height * 0.3} T ${SANDBOX_BACKDROP_W} ${height * 0.34}`}
          />
          <Path
            d={`M 0 ${height * 0.52} Q ${SANDBOX_BACKDROP_W * 0.45} ${height * 0.46}, ${SANDBOX_BACKDROP_W * 0.8} ${height * 0.54} T ${SANDBOX_BACKDROP_W} ${height * 0.5}`}
          />
          <Path
            d={`M 0 ${height * 0.72} Q ${SANDBOX_BACKDROP_W * 0.3} ${height * 0.8}, ${SANDBOX_BACKDROP_W * 0.65} ${height * 0.7} T ${SANDBOX_BACKDROP_W} ${height * 0.74}`}
          />
          <Path
            d={`M 0 ${height * 0.88} Q ${SANDBOX_BACKDROP_W * 0.4} ${height * 0.82}, ${SANDBOX_BACKDROP_W * 0.75} ${height * 0.9} T ${SANDBOX_BACKDROP_W} ${height * 0.86}`}
          />
        </G>
        {/* Mint accent stars — static. Brand anchors that don't twinkle. */}
        <G fill={accent} fillOpacity={0.4}>
          <Circle cx={SANDBOX_BACKDROP_W * 0.06} cy={height * 0.11} r={0.8} />
          <Circle cx={SANDBOX_BACKDROP_W * 0.16} cy={height * 0.06} r={1.6} />
          <Circle cx={SANDBOX_BACKDROP_W * 0.3} cy={height * 0.18} r={1.0} />
          <Circle cx={SANDBOX_BACKDROP_W * 0.54} cy={height * 0.05} r={1.2} />
          <Circle cx={SANDBOX_BACKDROP_W * 0.84} cy={height * 0.08} r={1.5} />
          <Circle cx={SANDBOX_BACKDROP_W * 0.91} cy={height * 0.13} r={1.0} />
          <Circle cx={SANDBOX_BACKDROP_W * 0.88} cy={height * 0.22} r={1.8} />
          <Circle cx={SANDBOX_BACKDROP_W * 0.96} cy={height * 0.07} r={1.2} />
        </G>
      </Svg>

      {/* Three twinkling dust-star bands. Each band wraps an SVG in a
          Reanimated.View so the whole layer crossfades as a unit
          (cheap) without touching individual <Circle> attributes
          (expensive on web). Star radii × 1.7 and alphas × 2 (capped)
          on render so the sparkle reads at the small SVG scale — the
          original tiny dim points were too small to perceive change. */}
      {BACKDROP_DUST_BANDS.map((stars, bandIdx) => (
        <Reanimated.View
          key={`band-${bandIdx}`}
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, bandStyles[bandIdx]]}
        >
          <Svg
            width="100%"
            height={height}
            viewBox={`0 0 ${SANDBOX_BACKDROP_W} ${height}`}
            preserveAspectRatio="none"
          >
            {stars.map(([x, y, r, op], i) => (
              <Circle
                key={`bd-${bandIdx}-${i}`}
                cx={SANDBOX_BACKDROP_W * x}
                cy={height * y}
                r={r * 1.7}
                fill="#FFFFFF"
                fillOpacity={Math.min(op * 2, 1)}
              />
            ))}
          </Svg>
        </Reanimated.View>
      ))}
    </View>
  );
}

// New pillar card composing all the redesigned pieces. Static —
// no entrance animation in the sandbox so the user can compare
// shapes directly. Animation gets reattached when we ship.
// Per-rank pillar dimensions. Rank 1 is visibly WIDER than 2/3 so the
// podium silhouette reads "king in the middle" — the reference image's
// rank-1 card is clearly chunkier, not just taller. Widths roughly:
// rank 1 = 38% of available width; ranks 2/3 = 28% each. Heights are
// kept compact so the section doesn't dominate the screen.
const PILLAR_DIMS: Record<1 | 2 | 3, { width: number; height: number }> = {
  1: { width: 120, height: 260 },
  2: { width: 100, height: 210 },
  3: { width: 100, height: 200 },
};
// Bottom-glow intensity per rank — keys the bloom opacity and LED halo so
// the center card visually dominates. ~1.8x ratio between ranks 1 and 3
// keeps the side cards legible rather than ghosting them out.
const PILLAR_INTENSITY: Record<1 | 2 | 3, number> = {
  1: 1.0,
  2: 0.7,
  3: 0.55,
};
function PodiumPillar({
  rank,
  name,
  title,
  xp,
  avatarUrl,
  onLongPress,
}: {
  rank: 1 | 2 | 3;
  name: string;
  title: string;
  xp: string;
  avatarUrl?: string | null;
  onLongPress?: () => void;
}) {
  const { accent } = useAccent();
  const isFirst = rank === 1;
  const { width, height } = PILLAR_DIMS[rank];
  const intensity = PILLAR_INTENSITY[rank];
  const avatarSize = isFirst ? 92 : 64;
  const orbitSize = avatarSize + 16;

  // Press feedback — same scale + spring spec as TopShowcaseSlot
  // (the production podium) so the sandbox reads as interactive in
  // the same vocabulary. Haptics.selectionAsync on press for the
  // same restrained feel — not a Medium impact.
  const press = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const onPressIn = useCallback(() => {
    press.value = withSpring(0.965, { stiffness: 320, damping: 14 });
  }, []);
  const onPressOut = useCallback(() => {
    press.value = withSpring(1, { stiffness: 320, damping: 14 });
  }, []);
  const onPress = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
  }, []);

  // Avatar pulse — gentle scale 1.0 → 1.08 breath, all three ranks
  // synchronized for a unified "podium is alive" heartbeat across the
  // leaderboard. Only the avatar tile pulses; the orbit ring stays
  // static so the breathing reads as the avatar itself, not a ring
  // expansion.
  const pulse = useSharedValue(0);
  // useFocusEffect — keeps the avatar breath looping reliably across
  // navigation focus changes.
  useFocusEffect(
    useCallback(() => {
      pulse.value = withRepeat(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
      return () => cancelAnimation(pulse);
    }, []),
  );
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.08], Extrapolation.CLAMP) }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onLongPress={onLongPress}
      delayLongPress={320}
      style={{
        // Rank 1 sits slightly LOWER than ranks 2/3 — negative margin
        // extends past the row's flex-end alignment baseline so the
        // leader pillar plants more firmly than its neighbors.
        marginBottom: isFirst ? -8 : 0,
      }}
    >
      <Reanimated.View
        style={[
          {
            width,
            height,
            alignItems: 'center',
            position: 'relative',
          },
          pressStyle,
        ]}
      >
        {/* Pentagon rank badge — overhangs the top of the clipped frame.
          Rank 1 also gets a star + soft glow stacked above the badge;
          its wrapper top compensates so the badge itself still lands
          at -14 like ranks 2/3. */}
        <View
          style={{
            position: 'absolute',
            top: isFirst ? -60 : -14,
            zIndex: 3,
            alignItems: 'center',
          }}
        >
          {isFirst && (
            // 4-point glint with the same 5-layer concentric soft glow
            // copied from the season-pass tier connector gems. Sits
            // just above the badge with a tight 2px gap.
            <View
              style={{
                marginBottom: 2,
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: accent + '03',
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: accent + '05',
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: 7,
                  left: 7,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: accent + '07',
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: accent + '09',
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  top: 13,
                  left: 13,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: accent + '0B',
                }}
              />
              <MaterialCommunityIcons name="star-four-points" size={18} color={accent} />
            </View>
          )}
          <RankBadgePentagon rank={rank} color={accent} />
        </View>

        {/* Border glow — rank 1 only. Single SVG rounded-rect stroke +
          feGaussianBlur for a true continuous Gaussian gradient.
          Renders BEFORE the bloom so it sits deepest. */}
        {isFirst && <PillarBorderGlow color={accent} width={width} height={height} />}

        {/* Bottom bloom — sibling of the clipped frame so it can extend
          past the card's bottom edge. Renders BEFORE the frame so it
          paints behind; the bloom's top portion gets covered by the
          frame, the bottom portion peeks out as the elliptical halo. */}
        <PillarBottomBloom color={accent} intensity={intensity} rank={rank} />

        {/* Clipped pillar frame — darker fill so the pillar reads as a
          discrete inset against the topographic backdrop, not as a
          translucent ghost. Rank 1 gets a full-alpha border + outer
          mint shadow for its "lit-up" look. */}
        <View
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 28,
            borderWidth: isFirst ? 2 : 1.5,
            borderColor: isFirst ? accent : accent + '88',
            backgroundColor: 'rgba(26,25,25,0.94)',
            overflow: 'hidden',
            paddingTop: rank === 1 ? 42 : rank === 2 ? 30 : 20,
            paddingBottom: 14,
            paddingHorizontal: 10,
            alignItems: 'center',
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: isFirst ? 0 : 2,
          }}
        >
          {/* Galaxy backdrop — deepest layer inside the frame, behind the
            inner glow and content. Per-rank offset so the three
            pillars don't show identical star patterns. */}
          <PillarGalaxyBackground rank={rank} />

          {/* Inner glow — gradient from mid-pillar transparent down to
            colored at the bottom edge. First child so it renders
            behind the flex content but on top of the dark backdrop. */}
          <PillarInnerGlow color={accent} isFirst={isFirst} />

          {/* Avatar zone — sized to the avatar (plus orbit headroom on
            rank 1). The dotted orbit sits behind the avatar. */}
          <View
            style={{
              width: orbitSize,
              height: orbitSize,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                width: avatarSize,
                height: avatarSize,
                zIndex: 1,
              }}
            >
              {isFirst && <DottedOrbit size={orbitSize} color={accent} />}
              <Reanimated.View style={pulseStyle}>
                <AvatarTile
                  size={avatarSize}
                  color={accent}
                  avatarUrl={avatarUrl}
                  name={name}
                  shape="circle"
                />
              </Reanimated.View>
            </View>
          </View>

          {/* Equipped title — italic, dim. Now comes FIRST (above the
            name) so the player's chosen identity reads before their
            handle. */}
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              marginTop: 10,
              fontSize: 11,
              fontStyle: 'italic',
              color: '#9F9F9F',
            }}
          >
            {title}
          </Text>

          {/* Name — white, bold. Sits below the equipped title. */}
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              marginTop: 1,
              fontSize: isFirst ? 25 : 15,
              fontWeight: '800',
              color: '#F4F4F4',
              letterSpacing: 0.2,
            }}
          >
            {name}
          </Text>

          {/* XP — big mint, pinned to the bottom of the pillar via
            marginTop: 'auto'. Each pillar's bottom-padding (14)
            handles the safe inset. Combined with the row's flex-end
            alignment + rank-1's -8 marginBottom, rank 1's XP lands
            8px below ranks 2/3, which sit in line with each other. */}
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            style={{
              marginTop: 'auto',
              alignSelf: 'stretch',
              textAlign: 'center',
              fontSize: isFirst ? 28 : 17,
              fontWeight: '900',
              color: accent,
              letterSpacing: 0.4,
              fontVariant: ['tabular-nums'],
            }}
          >
            {xp}
          </Text>
        </View>
      </Reanimated.View>
    </Pressable>
  );
}

// Empty-slot placeholder. Same dimensions and baseline alignment
// as PodiumPillar so the row's silhouette stays intact when ranks
// are missing — dashed outlines + "—" content read as "open slot,
// no player here" rather than a broken pillar. No animations, no
// long-press; this is purely structural.
function EmptyPodiumPillar({ rank }: { rank: 1 | 2 | 3 }) {
  const { width, height } = PILLAR_DIMS[rank];
  const isFirst = rank === 1;
  const avatarSize = isFirst ? 92 : 64;
  return (
    <View
      pointerEvents="none"
      style={{
        width,
        height,
        alignItems: 'center',
        position: 'relative',
        // Match PodiumPillar's rank-1 baseline drop so the row of
        // mixed real + empty pillars sits on the same line.
        marginBottom: isFirst ? -8 : 0,
        opacity: 0.4,
      }}
    >
      {/* Rank badge — same anchored position as the pentagon in
          PodiumPillar so the eye reads the same vertical landmarks. */}
      <View
        style={{
          position: 'absolute',
          top: -14,
          width: 32,
          height: 32,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.18)',
          backgroundColor: 'rgba(0,0,0,0.45)',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3,
        }}
      >
        <Text
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: 13,
            fontWeight: '800',
          }}
        >
          {rank}
        </Text>
      </View>

      {/* Pillar body — dashed outline so the slot reads as a
          placeholder, not an actual card. */}
      <View
        style={{
          flex: 1,
          width: '100%',
          borderRadius: 14,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.10)',
          borderStyle: 'dashed',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 22,
        }}
      >
        {/* Avatar slot */}
        <View
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.15)',
            borderStyle: 'dashed',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: avatarSize * 0.4,
              fontWeight: '300',
              lineHeight: avatarSize * 0.4,
            }}
          >
            —
          </Text>
        </View>

        {/* Name + XP placeholders */}
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text
            style={{
              color: 'rgba(255,255,255,0.45)',
              fontSize: 13,
              fontWeight: '700',
              letterSpacing: 0.3,
            }}
          >
            —
          </Text>
          <Text
            style={{
              color: 'rgba(255,255,255,0.3)',
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 0.4,
            }}
          >
            —
          </Text>
        </View>
      </View>
    </View>
  );
}

// Sandbox composer — three pillars + backdrop. Static dummy data.
// Mounts at the top of LeaderboardView so it's eyeball-comparable
// against the reference image.
// Format a raw XP number to the compact "24.8k" / "850" display string
// used by the pillar XP readouts.
function formatPillarXp(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}
type PodiumEntry = {
  rank: 1 | 2 | 3;
  name: string;
  xp: number;
  title: string;
  displayName?: string | null;
  avatarUrl?: string | null;
};
function PodiumSandbox({
  entries,
  onPillarLongPress,
}: {
  entries: PodiumEntry[];
  onPillarLongPress?: (rank: 1 | 2 | 3) => void;
}) {
  const themedRarity = useThemedRarity();
  const sectionHeight = 300;
  // Card height = section + paddingTop (16) + paddingBottom (20) from
  // topShowcaseStyles.card. Backdrop sizes to this so the galaxy covers
  // the full card area, not just the inner section.
  const cardHeight = sectionHeight + 36;
  // Index by rank so we can render in podium order (2, 1, 3) regardless
  // of how the caller sorted entries.
  const byRank: Record<1 | 2 | 3, PodiumEntry | undefined> = {
    1: entries.find((e) => e.rank === 1),
    2: entries.find((e) => e.rank === 2),
    3: entries.find((e) => e.rank === 3),
  };
  const renderPillar = (rank: 1 | 2 | 3) => {
    const e = byRank[rank];
    // Always render something for every rank slot so the podium row
    // keeps its 3-pillar silhouette. Empty ranks get a dimmed
    // placeholder with "—" content.
    if (!e) return <EmptyPodiumPillar key={rank} rank={rank} />;
    return (
      <PodiumPillar
        key={rank}
        rank={rank}
        name={e.displayName ?? e.name}
        title={e.title}
        xp={formatPillarXp(e.xp)}
        avatarUrl={e.avatarUrl}
        onLongPress={onPillarLongPress ? () => onPillarLongPress(rank) : undefined}
      />
    );
  };
  return (
    <View>
      <View style={[topShowcaseStyles.card, { borderColor: themedRarity.legendary.borderIdle }]}>
        <LinearGradient
          colors={[colors.container, colors.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Backdrop lives at the card level (not inside the section) so
            it fills the full container including the card's vertical
            padding regions. Stars stretch across the entire surface. */}
        <PodiumBackdrop height={cardHeight} />
        {/* Diagonal shine sweep — sits above the backdrop and below the
            pillars so the light band passes behind the rank cards. */}
        <PodiumShimmer />
        <View style={{ height: sectionHeight, position: 'relative', justifyContent: 'flex-end' }}>
          {/* center keeps the wider rank-1 pillar visually balanced
              between the two narrower ranks 2/3. */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {renderPillar(2)}
            {renderPillar(1)}
            {renderPillar(3)}
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Profile preview (Steam-style hover card) ───────────────
// Long-press on any leaderboard entry surfaces a dense stat panel
// with avatar, title, rank delta, XP breakdown, tier, and a
// percentile bar. Modeled after Steam's profile peek but adapted
// to the app's dark-glass + rarity-tinted vocabulary.
interface ProfilePreviewData {
  name: string;
  displayName?: string | null;
  title: string;
  rank: number;
  totalXP: number;
  weeklyXP: number;
  rarity: Rarity;
  avatarUrl?: string | null;
  delta?: number;
  isYou?: boolean;
  totalEntries: number;
  // Pressing the See Profile CTA invokes this. Always wired — for
  // the current user it lands on the real Profile screen, for
  // dummies on a read-only DummyProfileScreen.
  onSeeProfile: () => void;
}

function ProfilePreviewModal({
  data,
  onClose,
}: {
  data: ProfilePreviewData | null;
  onClose: () => void;
}) {
  const themedRarity = useThemedRarity();
  const visible = data !== null;
  // Card scale spring on appearance — same spec family as DetailModal
  // so peek and unlock celebrations share a kinetic vocabulary.
  const scale = useSharedValue(0.92);
  useEffect(() => {
    if (visible) {
      scale.value = 0.92;
      scale.value = withSpring(1, { stiffness: 220, damping: 18 });
    }
  }, [visible]);
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!data) return null;
  const r = themedRarity[data.rarity];
  // Bar fill = how much of the field is BELOW this user. Rank 1 fills
  // the bar; last rank shows a thin sliver. Visual reads as "their
  // share of the leaderboard."
  const fillPct =
    data.totalEntries > 0
      ? Math.max(5, Math.round((1 - (data.rank - 1) / data.totalEntries) * 100))
      : 0;
  // "TOP X%" label = standard percentile (rank / total). ceil so a
  // rank-2-of-9 reads "TOP 23%" not "TOP 22%".
  const topPct = data.totalEntries > 0 ? Math.ceil((data.rank / data.totalEntries) * 100) : 0;
  // Delta indicator — ▲ climb, ▼ drop, — flat. Color-coded so the
  // direction reads pre-attentively without parsing the glyph.
  const deltaUp = (data.delta ?? 0) > 0;
  const deltaDown = (data.delta ?? 0) < 0;
  const deltaGlyph = deltaUp ? '▲' : deltaDown ? '▼' : '—';
  const deltaColor = deltaUp ? '#5DD68A' : deltaDown ? '#E26B6B' : 'rgba(255,255,255,0.45)';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Reanimated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(140)}
        style={StyleSheet.absoluteFill}
      >
        <BlurView intensity={32} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable style={previewStyles.dismissArea} onPress={onClose}>
          {/* box-none keeps the card pressable area inert relative
              to the dismiss layer — taps on the card don't bubble
              to the dismiss handler. */}
          <View style={previewStyles.center} pointerEvents="box-none">
            <Reanimated.View
              style={[
                previewStyles.card,
                {
                  borderColor: r.borderActive,
                  shadowColor: r.color,
                },
                cardStyle,
              ]}
            >
              <LinearGradient
                colors={r.gradient as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              {/* Header row: avatar + identity stack */}
              <View style={previewStyles.headerRow}>
                <AvatarTile
                  size={72}
                  color={r.color}
                  avatarUrl={data.avatarUrl}
                  name={data.displayName ?? data.name}
                  glow
                  shape="circle"
                />
                <View style={previewStyles.identity}>
                  <Text style={previewStyles.displayName} numberOfLines={1}>
                    {data.displayName ?? data.name}
                    {data.isYou && <Text style={previewStyles.youTag}> · YOU</Text>}
                  </Text>
                  <Text style={[previewStyles.title, { color: r.color }]} numberOfLines={1}>
                    {data.title}
                  </Text>
                  <View style={previewStyles.rankRow}>
                    <Text style={previewStyles.rankLabel}>RANK</Text>
                    <Text style={previewStyles.rankValue}>#{data.rank}</Text>
                    <Text style={[previewStyles.delta, { color: deltaColor }]}>
                      {deltaGlyph}
                      {data.delta !== undefined && data.delta !== 0
                        ? ` ${Math.abs(data.delta)}`
                        : ''}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={previewStyles.divider} />

              {/* Stat grid — two equal columns. TIER was removed since
                  the title above already conveys rarity through color. */}
              <View style={previewStyles.statGrid}>
                <View style={previewStyles.statCell}>
                  <Text style={previewStyles.statLabel}>TOTAL XP</Text>
                  <Text style={previewStyles.statValue}>{formatXP(data.totalXP)}</Text>
                </View>
                <View style={[previewStyles.statCell, previewStyles.statCellRight]}>
                  <Text style={previewStyles.statLabel}>WEEKLY XP</Text>
                  <Text style={previewStyles.statValue}>{formatXP(data.weeklyXP)}</Text>
                </View>
              </View>

              <View style={previewStyles.divider} />

              {/* Percentile bar — a single visual that contextualizes
                  rank against the field. "Top 25%" reads instantly. */}
              <View style={previewStyles.percentileWrap}>
                <View style={previewStyles.percentileTrack}>
                  <View
                    style={[
                      previewStyles.percentileFill,
                      {
                        width: `${fillPct}%`,
                        backgroundColor: r.color,
                        shadowColor: r.color,
                      },
                    ]}
                  />
                </View>
                <Text style={previewStyles.percentileText}>
                  {data.rank === 1 ? 'LEADING THE FIELD' : `TOP ${topPct}% OF ${data.totalEntries}`}
                </Text>
              </View>

              {/* See Profile CTA — present for every entry. Routes to
                  the real Profile for the current user, or to a
                  read-only DummyProfile for any registered dummy. */}
              <Pressable
                onPress={() => {
                  onClose();
                  data.onSeeProfile();
                }}
                style={({ pressed }) => [
                  previewStyles.cta,
                  {
                    borderColor: r.borderActive,
                    backgroundColor: pressed ? r.glow : 'rgba(255,255,255,0.04)',
                  },
                ]}
              >
                <Text style={[previewStyles.ctaText, { color: r.color }]}>SEE PROFILE</Text>
                <Feather name="arrow-right" size={14} color={r.color} style={{ marginLeft: 6 }} />
              </Pressable>
            </Reanimated.View>
          </View>
        </Pressable>
      </Reanimated.View>
    </Modal>
  );
}

const previewStyles = StyleSheet.create({
  dismissArea: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    overflow: 'hidden',
    // Rarity-tinted glow beneath the card — picks up the borderColor
    // for a halo that reads as ambient lighting, not a hard drop shadow.
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  displayName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  youTag: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
    gap: 6,
  },
  rankLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.4,
  },
  rankValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.4,
  },
  delta: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: 14,
  },
  statGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statCellMid: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  // Right-hand cell in the 2-column grid — single divider on the
  // left, no right divider so the card edge handles that visual.
  statCellRight: {
    borderLeftWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  // See-profile CTA — full-width pill with rarity-tinted border so it
  // belongs to the same family as the card chrome.
  cta: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  percentileWrap: {
    gap: 8,
  },
  percentileTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  percentileFill: {
    height: '100%',
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  percentileText: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
});

// ─── Add Friend modal ────────────────────────────────────────
// Search by username, follow people, add them to your leaderboard.
// Results are fetched live from Supabase `profiles`; follows go into
// the `follows` table. Optimistic UI: pressing Follow flips the
// button instantly and only reverts on backend error.
function AddFriendModal({
  visible,
  followerId,
  onClose,
}: {
  visible: boolean;
  followerId: string | undefined;
  onClose: () => void;
}) {
  const { accent } = useAccent();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProfileSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  // Track per-row "in flight" follow toggles so we can disable the
  // button while the network call is settling.
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const navigation = useNavigation<any>();
  // SECURITY (M1) — block follow/unfollow in demo mode so the shared
  // account can't be used to spam real users with follow requests.
  const demoGuard = useDemoGuard();

  // Card spring on appearance — same spec as ProfilePreviewModal so
  // the two modals share kinetic vocabulary.
  const scale = useSharedValue(0.92);
  useEffect(() => {
    if (visible) {
      scale.value = 0.92;
      scale.value = withSpring(1, { stiffness: 220, damping: 18 });
      // Reset state when reopening so a stale query doesn't linger.
      setQuery('');
      setResults([]);
      setFollowingIds(new Set());
      setPendingIds(new Set());
    }
  }, [visible]);
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Debounced search — fire 280ms after the user stops typing so
  // we don't hammer Supabase on every keystroke.
  useEffect(() => {
    if (!visible) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      const found = await searchProfilesByUsername(q, followerId);
      setResults(found);
      setLoading(false);
      // Resolve which of the new results the caller is already
      // following — drives the button state per row.
      if (followerId && found.length > 0) {
        const set = await fetchFollowingSet(
          followerId,
          found.map((r) => r.id),
        );
        setFollowingIds(set);
      } else {
        setFollowingIds(new Set());
      }
    }, 280);
    return () => clearTimeout(handle);
  }, [query, followerId, visible]);

  const handleToggleFollow = useCallback(
    async (target: ProfileSearchResult) => {
      if (!followerId) return;
      if (!demoGuard('Following users')) return;
      const isFollowing = followingIds.has(target.id);
      // Mark pending and optimistically flip the visible state.
      setPendingIds((prev) => new Set(prev).add(target.id));
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (isFollowing) next.delete(target.id);
        else next.add(target.id);
        return next;
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      try {
        if (isFollowing) {
          await unfollowUser(followerId, target.id);
        } else {
          await followUser(followerId, target.id);
        }
      } catch (e) {
        console.error('[AddFriendModal] follow toggle failed', e);
        // Revert the optimistic flip on failure.
        setFollowingIds((prev) => {
          const next = new Set(prev);
          if (isFollowing) next.add(target.id);
          else next.delete(target.id);
          return next;
        });
      } finally {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(target.id);
          return next;
        });
      }
    },
    [followerId, followingIds, demoGuard],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Reanimated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(140)}
        style={StyleSheet.absoluteFill}
      >
        <BlurView intensity={32} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable style={addFriendStyles.dismissArea} onPress={onClose}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={addFriendStyles.center}
            pointerEvents="box-none"
          >
            <Reanimated.View style={[addFriendStyles.card, cardStyle]}>
              <LinearGradient
                colors={[colors.container, colors.background]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              {/* Header: title + close */}
              <View style={addFriendStyles.headerRow}>
                <Text style={addFriendStyles.title}>ADD COMPETITOR</Text>
                <Pressable onPress={onClose} hitSlop={10} style={addFriendStyles.closeBtn}>
                  <Feather name="x" size={16} color="rgba(255,255,255,0.6)" />
                </Pressable>
              </View>

              {/* Search input */}
              <View style={addFriendStyles.searchRow}>
                <Feather name="search" size={14} color="rgba(255,255,255,0.45)" />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search by username"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={addFriendStyles.searchInput}
                  autoFocus
                />
                {query.length > 0 && (
                  <Pressable
                    onPress={() => setQuery('')}
                    hitSlop={8}
                    style={addFriendStyles.clearBtn}
                  >
                    <Feather name="x" size={12} color="rgba(255,255,255,0.5)" />
                  </Pressable>
                )}
              </View>

              {/* Results body */}
              <View style={addFriendStyles.resultsBody}>
                {loading ? (
                  <View style={addFriendStyles.statusWrap}>
                    <Text style={addFriendStyles.statusText}>Searching…</Text>
                  </View>
                ) : query.trim().length === 0 ? (
                  <View style={addFriendStyles.statusWrap}>
                    <Feather name="users" size={20} color="rgba(255,255,255,0.3)" />
                    <Text style={addFriendStyles.statusText}>Find People by Their Username</Text>
                    <Text style={addFriendStyles.statusSubtext}>
                      Following someone adds them to your leaderboard.
                    </Text>
                  </View>
                ) : results.length === 0 ? (
                  <View style={addFriendStyles.statusWrap}>
                    <Feather name="frown" size={20} color="rgba(255,255,255,0.3)" />
                    <Text style={addFriendStyles.statusText}>NO USERS FOUND</Text>
                    <Text style={addFriendStyles.statusSubtext}>Try a different username.</Text>
                  </View>
                ) : (
                  <ScrollView
                    style={{ maxHeight: 320 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    {results.map((r) => {
                      const following = followingIds.has(r.id);
                      const pending = pendingIds.has(r.id);
                      return (
                        <View key={r.id} style={addFriendStyles.row}>
                          <Pressable
                            onPress={() => {
                              // Close the modal before navigating —
                              // otherwise the modal stays on top.
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                                () => {},
                              );
                              onClose();
                              navigation.navigate('UserProfile', { userId: r.id });
                            }}
                            style={({ pressed }) => [
                              addFriendStyles.peekHit,
                              pressed && { opacity: 0.7 },
                            ]}
                          >
                            <AvatarTile
                              size={36}
                              color={accent}
                              avatarUrl={r.avatar_url}
                              name={r.username}
                              shape="circle"
                            />
                            <Text style={addFriendStyles.username} numberOfLines={1}>
                              {r.username}
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleToggleFollow(r)}
                            disabled={pending}
                            style={({ pressed }) => [
                              addFriendStyles.followBtn,
                              following
                                ? addFriendStyles.followBtnActive
                                : [
                                    addFriendStyles.followBtnIdle,
                                    { borderColor: accent + '66', backgroundColor: accent + '14' },
                                  ],
                              pressed && { opacity: 0.7 },
                              pending && { opacity: 0.5 },
                            ]}
                          >
                            <Feather
                              name={following ? 'check' : 'plus'}
                              size={11}
                              color={following ? 'rgba(255,255,255,0.7)' : accent}
                            />
                            <Text
                              style={[
                                addFriendStyles.followBtnText,
                                {
                                  color: following ? 'rgba(255,255,255,0.7)' : accent,
                                },
                              ]}
                            >
                              {following ? 'FOLLOWING' : 'FOLLOW'}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            </Reanimated.View>
          </KeyboardAvoidingView>
        </Pressable>
      </Reanimated.View>
    </Modal>
  );
}

const addFriendStyles = StyleSheet.create({
  dismissArea: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1.6,
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#fff',
    padding: 0,
  },
  clearBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  resultsBody: {
    marginTop: 12,
    minHeight: 140,
  },
  // Empty / loading / no-results status block. Centered so the card
  // doesn't collapse to a tiny height when there's nothing to show.
  statusWrap: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.4,
  },
  statusSubtext: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    fontWeight: '500',
    paddingHorizontal: 24,
    lineHeight: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 9,
  },
  // Long-press target wrapping avatar + username. Takes the row's
  // flexible space so the Follow button stays pinned right.
  peekHit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  username: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.2,
  },
  // Follow button — accent-colored when idle (action available),
  // dimmed when active (already done) so the eye reads "this is the
  // tap target" pre-attentively.
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  followBtnIdle: {
    // borderColor + backgroundColor applied inline using the active accent.
  },
  followBtnActive: {
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  followBtnText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});

// Peek modal was replaced by navigation to UserProfileScreen — tap
// anywhere a user appears (search result, standings row, follow list)
// to push a read-only profile view on top of the tab stack.

// ─── Chase row (card-style standings entry) ────────────────

interface ChaseEntry {
  key: string;
  rank: number;
  name: string;
  title: string;
  xp: number;
}

function ChaseRow({
  entry,
  delta,
  index,
  isLast,
  onPress,
  onLongPress,
}: {
  entry: ChaseEntry;
  delta: number;
  index: number;
  isLast?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const themedRarity = useThemedRarity();
  const { accent } = useAccent();
  const r = themedRarity[rankToRarity(entry.rank)];
  const deltaPositive = delta > 0;
  const deltaNegative = delta < 0;
  const deltaColor = deltaPositive ? accent : deltaNegative ? '#D87575' : colors.button1;

  // One-shot pip punch on mount when delta != 0 — quick "this row moved" cue
  const pipScale = useSharedValue(1);
  useEffect(() => {
    if (delta !== 0) {
      pipScale.value = withSequence(
        withTiming(1.18, { duration: 180, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 9, stiffness: 220 }),
      );
    }
  }, [delta]);
  const pipAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pipScale.value }],
  }));

  // Press scale — mirrors AchievementCard at line ~301 so a tap on a
  // rival row feels the same as a tap on an achievement tile. Spring
  // values (stiffness 320 / damping 14) match the achievement card
  // exactly. Light haptic on press in — restraint: not Medium, this
  // is browsing, not unlocking.
  const press = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const handlePressIn = () => {
    press.value = withSpring(0.965, { stiffness: 320, damping: 14 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };
  const handlePressOut = () => {
    press.value = withSpring(1, { stiffness: 280, damping: 12 });
  };

  return (
    <Reanimated.View
      entering={FadeInDown.delay(60 + Math.min(index, 7) * 30)
        .duration(220)
        .easing(Easing.out(Easing.cubic))}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={onLongPress}
        delayLongPress={320}
      >
        <Reanimated.View style={[chaseStyles.row, !isLast && chaseStyles.rowDivider, pressStyle]}>
          <Reanimated.View
            style={[chaseStyles.rankPip, { backgroundColor: r.color + '12' }, pipAnimatedStyle]}
          >
            <Text style={[chaseStyles.rankPipHash, { color: r.color }]}>#</Text>
            <Text style={[chaseStyles.rankPipNum, { color: r.color }]}>
              {String(entry.rank).padStart(2, '0')}
            </Text>
          </Reanimated.View>

          <AvatarTile size={40} color={r.color} name={entry.name} />

          <View style={chaseStyles.info}>
            <View style={chaseStyles.nameRow}>
              <Text style={chaseStyles.name} numberOfLines={1}>
                {entry.name}
              </Text>
              {delta !== 0 && (
                <View style={chaseStyles.deltaInline}>
                  <Text style={[chaseStyles.deltaArrow, { color: deltaColor }]}>
                    {deltaPositive ? '▲' : '▼'}
                  </Text>
                  <Text style={[chaseStyles.deltaText, { color: deltaColor }]}>
                    {Math.abs(delta)}
                  </Text>
                </View>
              )}
            </View>
            <Text style={chaseStyles.sub} numberOfLines={1}>
              {entry.title}
            </Text>
          </View>

          <View style={chaseStyles.xpCol}>
            <Text
              style={[chaseStyles.xpNum, { color: r.color }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {formatXP(entry.xp)}
            </Text>
            <Text style={chaseStyles.xpLabel}>XP</Text>
          </View>
        </Reanimated.View>
      </Pressable>
    </Reanimated.View>
  );
}

// ─── Your Standing sticky bar ────────────────────────────
//
// Sticky bar anchored above the bottom tab nav. The user's position
// is the most load-bearing signal on a standings screen, so it
// stays in view as they scroll the podium and rivals above. Three
// states:
//
//   throne     — user is #1. Frame the lead, not the climb.
//   podium     — user is #2 or #3. Frame as "on the podium".
//   climbing   — user is #4+. Frame the next rival by name + delta.
//
// Rarity follows the user's own rank, mirroring the podium tiers
// so the bar visually inherits its presentation from how well the
// user is doing — same RARITY ladder the Achievements tab uses
// for gacha tiles.
//
// Composition: the bar is split into named sub-pieces so each
// region has a single responsibility.
//
//   ┌ StandingRankBlock · Avatar · StandingHeader · StandingPrimaryStat ┐
//   └─────────────────── StandingChaseTrack ────────────────────────────┘

type StandingState = 'throne' | 'podium' | 'climbing';

interface StandingTarget {
  name: string;
  xp: number;
  rank: number;
}

// Reanimated counter-up: <Text> can't be driven by a shared value
// directly, so we animate a non-editable <TextInput> via the official
// `text` prop trick and apply `useAnimatedProps`. The display value
// is rebuilt on the UI thread each frame, so the digits scrub without
// triggering a React render.
const AnimatedTextInput = Reanimated.createAnimatedComponent(TextInput);

// Frame the state into the pieces of copy the card actually renders.
// Pulled out of the component so the render JSX stays declarative
// and the framing logic stays scannable on its own.
//
// Returns `primaryNumTarget` (raw integer) and `primaryNumPrefix`
// alongside the formatted `primaryNum` so pass 3 can animate a
// counter-up via Reanimated. The displayed string is rebuilt each
// frame as `${prefix}${formatXP(round(target * t))}` — keeping the
// k-suffix formatting intact during the tween.
function getStandingCopy(
  state: StandingState,
  rank: number,
  xp: number,
  nextRival: StandingTarget | null,
  podiumTarget: StandingTarget | null,
  leadOver: StandingTarget | null,
): {
  kicker: string;
  primaryNum: string;
  primaryNumTarget: number;
  primaryNumPrefix: string;
  primaryLabel: string;
  secondaryLine: string | null;
} {
  if (state === 'throne') {
    if (leadOver) {
      const lead = Math.max(0, xp - leadOver.xp);
      return {
        kicker: 'TOP COMPETITOR',
        primaryNum: `+${formatXP(lead)}`,
        primaryNumTarget: lead,
        primaryNumPrefix: '+',
        primaryLabel: 'LEAD',
        secondaryLine: `over ${leadOver.name}`,
      };
    }
    return {
      kicker: 'TOP COMPETITOR',
      primaryNum: formatXP(xp),
      primaryNumTarget: xp,
      primaryNumPrefix: '',
      primaryLabel: 'XP',
      secondaryLine: 'top of standings',
    };
  }

  if (state === 'podium') {
    const kicker = rank === 2 ? 'SILVER · ONE TO CATCH' : 'BRONZE · TWO TO CATCH';
    if (nextRival) {
      const gap = Math.max(0, nextRival.xp - xp + 1);
      return {
        kicker,
        primaryNum: `+${formatXP(gap)}`,
        primaryNumTarget: gap,
        primaryNumPrefix: '+',
        primaryLabel: `TO #${nextRival.rank}`,
        secondaryLine: `catch ${nextRival.name}`,
      };
    }
    return {
      kicker,
      primaryNum: formatXP(xp),
      primaryNumTarget: xp,
      primaryNumPrefix: '',
      primaryLabel: 'XP',
      secondaryLine: null,
    };
  }

  // climbing — rank 4 is the most motivating moment (one from
  // podium); deeper ranks get a generic chase frame plus the
  // podium delta in the footer if still in striking range.
  const onPodiumDoor = rank === 4;
  const kicker = onPodiumDoor ? 'ONE FROM THE PODIUM' : 'CHASING THE PODIUM';
  if (nextRival) {
    const gap = Math.max(0, nextRival.xp - xp + 1);
    const secondaryLine =
      !onPodiumDoor && podiumTarget && rank > 5
        ? `${nextRival.name} · podium +${formatXP(Math.max(0, podiumTarget.xp - xp + 1))}`
        : `catch ${nextRival.name}`;
    return {
      kicker,
      primaryNum: `+${formatXP(gap)}`,
      primaryNumTarget: gap,
      primaryNumPrefix: '+',
      primaryLabel: `TO #${nextRival.rank}`,
      secondaryLine,
    };
  }
  return {
    kicker,
    primaryNum: formatXP(xp),
    primaryNumTarget: xp,
    primaryNumPrefix: '',
    primaryLabel: 'XP',
    secondaryLine: null,
  };
}

// Compute fill % toward the rival ahead. Floor anchors near-empty
// when freshly behind, near-full when close — feels like "you're
// almost there" rather than a literal proportion.
function getChasePct(xp: number, nextRival: StandingTarget | null, isThrone: boolean): number {
  if (isThrone) return 100;
  if (!nextRival) return 0;
  const above = nextRival.xp;
  const floor = Math.max(0, above - Math.max(1, above - xp) * 3);
  const range = Math.max(1, above - floor);
  return Math.min(100, Math.max(2, Math.round(((xp - floor) / range) * 100)));
}

// Numeric rank + total entries. Anchors the left of the hero.
function StandingRankBlock({ rank, tier }: { rank: number; tier: RarityToken }) {
  return (
    <View
      style={[
        youStandingStyles.rankBlock,
        { borderColor: tier.color + '55', backgroundColor: tier.color + '12' },
      ]}
    >
      <Text style={[youStandingStyles.rankHash, { color: tier.color }]}>#</Text>
      <Text style={[youStandingStyles.rankNum, { color: tier.color }]}>
        {String(rank).padStart(2, '0')}
      </Text>
    </View>
  );
}

// Kicker label + identity line + xp readout. The middle column.
function StandingHeader({
  kicker,
  title,
  tier,
}: {
  kicker: string;
  title: string;
  tier: RarityToken;
}) {
  return (
    <View style={youStandingStyles.info}>
      <Text style={[youStandingStyles.kicker, { color: tier.color }]} numberOfLines={1}>
        {kicker}
      </Text>
      <View style={youStandingStyles.youLine}>
        <Text style={youStandingStyles.youLabel}>YOU</Text>
        <Text style={youStandingStyles.titleText} numberOfLines={1}>
          {' '}
          · {title}
        </Text>
      </View>
    </View>
  );
}

// The motivational primary number. Right-aligned. Inherits rarity color.
//
// Motion: the integer scrubs from 0 → target on mount with a tasteful
// out-cubic easing (770ms — long enough to read, short enough to feel
// snappy). When `target` or `prefix` change (mode toggle / XP delta),
// the counter re-runs from its current value, with a 60ms scale punch
// to draw the eye to the change. Tabular nums already locked in via
// `LEADER_TYPE.displayNum` so digits don't reflow as they tick.
function StandingPrimaryStat({
  value,
  target,
  prefix,
  label,
  tier,
}: {
  value: string;
  target: number;
  prefix: string;
  label: string;
  tier: RarityToken;
}) {
  // Counter shared value — drives the displayed integer via animatedProps.
  const count = useSharedValue(0);
  // Quick scale punch when target changes — anchored to the right edge
  // (where the column aligns) so the digits don't drift visually.
  const punch = useSharedValue(1);

  useEffect(() => {
    // Counter: anticipation (idle at 0) → action (timed tween) → settle.
    // out-cubic gives the number a "deceleration into rest" feel.
    count.value = withTiming(target, {
      duration: 770,
      easing: Easing.out(Easing.cubic),
    });
    // Subtle 1.0 → 1.06 → 1.0 punch on re-runs. Skipped on mount
    // because the entrance + counter sweep already supply the beat.
    if (count.value !== 0) {
      punch.value = withSequence(
        withTiming(1.06, { duration: 120, easing: Easing.out(Easing.quad) }),
        withSpring(1, { stiffness: 280, damping: 14 }),
      );
    }
  }, [target, prefix]);

  // UI-thread text rebuild — no React render. The formatter is inlined
  // inside the worklet because Reanimated workers can't safely capture
  // an arbitrary outer JS function. Mirrors formatXP at line ~844 (k
  // suffix for ≥1000, locale string otherwise — locale-free here for
  // worklet safety).
  const animatedProps = useAnimatedProps(() => {
    'worklet';
    const raw = Math.max(0, Math.round(count.value));
    let formatted: string;
    if (raw >= 10000) {
      formatted = `${(raw / 1000).toFixed(1)}k`;
    } else if (raw >= 1000) {
      formatted = `${(raw / 1000).toFixed(2)}k`;
    } else {
      formatted = String(raw);
    }
    return { text: `${prefix}${formatted}` } as any;
  });

  const punchStyle = useAnimatedStyle(() => ({
    transform: [{ scale: punch.value }],
  }));

  return (
    <View style={youStandingStyles.primaryCol}>
      <Reanimated.View style={punchStyle}>
        <AnimatedTextInput
          editable={false}
          // RN requires a non-undefined defaultValue for the `text` prop
          // trick to take effect on first paint.
          defaultValue={`${prefix}${formatXP(0)}`}
          animatedProps={animatedProps}
          // Lock layout — TextInput has its own padding/border defaults
          // that fight the LEADER_TYPE.displayNum spec.
          style={[
            youStandingStyles.primaryNum,
            youStandingStyles.primaryNumInput,
            { color: tier.color },
          ]}
          // Static fallback for screen readers — counter is purely visual.
          accessible
          accessibilityLabel={value}
          underlineColorAndroid="transparent"
        />
      </Reanimated.View>
      <Text style={[youStandingStyles.primaryLabel, { color: tier.color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// Chase-track progress. Sits at the bottom edge of the sticky card.
//
// Motion: the static track sits underneath. A sibling overlay with
// `width: '100%'` and `transformOrigin: 'left'` is scaled along X
// from 0 → pct/100 with out-cubic easing (800ms) — the rival fill
// "sweeps in" rather than expanding. We never touch the `width` prop
// (GPU-friendly transform-only). When the user is within striking
// range (>= 95%), the fill softly pulses opacity to signal proximity
// — a 3-cycle one-shot, not perpetual, so we don't burn the loop
// budget on a near-permanent state.
function StandingChaseTrack({ pct, tier }: { pct: number; tier: RarityToken }) {
  // Fill progress 0 → 1. Animated value drives scaleX on the overlay.
  const fill = useSharedValue(0);
  // Proximity halo opacity — only kicks in for the "almost there" state.
  const proximity = useSharedValue(1);

  useEffect(() => {
    const target = Math.min(1, Math.max(0, pct / 100));
    // Anticipation: tiny delay so the entrance staggers behind the
    // hero row settling. Action: out-cubic sweep. Settle: implicit
    // (timing ends naturally).
    fill.value = withDelay(
      120,
      withTiming(target, { duration: 800, easing: Easing.out(Easing.cubic) }),
    );

    // Proximity pulse: only when within 5% of catching the rival.
    // 3-cycle one-shot via withSequence so it reads as a celebration,
    // not a permanent fidget.
    if (target >= 0.95) {
      proximity.value = withDelay(
        920, // After the fill lands.
        withSequence(
          withTiming(0.68, { duration: 380, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 380, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.78, { duration: 380, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 380, easing: Easing.inOut(Easing.quad) }),
        ),
      );
    } else {
      proximity.value = 1;
    }
  }, [pct]);

  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: fill.value }],
    opacity: proximity.value,
  }));

  return (
    <View style={youStandingStyles.chaseTrack}>
      {/* Scale-X overlay — width is fixed at 100%, transform is the
          only animated value. transformOrigin keeps the sweep from
          the left edge (RN supports this on Reanimated.View). */}
      <Reanimated.View
        style={[
          youStandingStyles.chaseFill,
          youStandingStyles.chaseFillOverlay,
          { backgroundColor: tier.color },
          fillStyle,
        ]}
      />
    </View>
  );
}

// Ambient throne halo — slow opacity pulse on the rarity wash when the
// user holds #1. Restraint-first: opacity only, 2400ms in-out cycle,
// max 0.55. Reads as a "heat shimmer" rather than a strobe. Counts
// as one perpetual loop in the budget.
function ThroneHalo({ color }: { color: string }) {
  const o = useSharedValue(0.18);
  useEffect(() => {
    o.value = withRepeat(
      withTiming(0.55, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, style]}>
      <LinearGradient
        colors={[color + '40', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </Reanimated.View>
  );
}

function YourStandingCard({
  rank,
  xp,
  state,
  nextRival,
  podiumTarget,
  leadOver,
  avatarUrl,
  username,
  title,
}: {
  rank: number;
  xp: number;
  state: StandingState;
  nextRival: StandingTarget | null;
  podiumTarget: StandingTarget | null;
  leadOver: StandingTarget | null;
  avatarUrl?: string | null;
  username?: string | null;
  title: string;
}) {
  const themedRarity = useThemedRarity();
  const tier = themedRarity[rankToRarity(rank)];
  const isThrone = state === 'throne';
  const { kicker, primaryNum, primaryNumTarget, primaryNumPrefix, primaryLabel } = getStandingCopy(
    state,
    rank,
    xp,
    nextRival,
    podiumTarget,
    leadOver,
  );
  const progressPct = getChasePct(xp, nextRival, isThrone);
  const showChase = nextRival !== null || isThrone;

  return (
    <View
      style={[youStandingStyles.card, { borderColor: tier.borderActive, shadowColor: tier.color }]}
    >
      {/* Tier gradient — same vocabulary as AchievementCard so the
          sticky bar reads as a sibling tile, not a foreign chrome. */}
      <LinearGradient
        colors={tier.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Tier wash — vertical fade so the top of the card carries
          most of the rarity color weight. */}
      <LinearGradient
        colors={[tier.color + '1A', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Throne halo — only when the user holds #1. Opacity-only loop. */}
      {isThrone && <ThroneHalo color={tier.color} />}

      {/* Legendary shimmer — diagonal sweep replacing the previous
          rising-particle effect. Same shimmer grammar used by the
          season banner so the legendary signal reads consistently. */}
      {tier.particle && <BannerShimmer />}

      {/*
        Single dense row. Compact stagger so the bar settles fast on
        tab entry (the sticky bar is a status indicator, not a hero):
        rank (40ms) → avatar (80ms) → header (120ms) → primary (160ms).
      */}
      <View style={youStandingStyles.topRow}>
        <Reanimated.View entering={FadeInDown.delay(40).springify().damping(12)}>
          <StandingRankBlock rank={rank} tier={tier} />
        </Reanimated.View>
        <Reanimated.View entering={FadeInDown.delay(80).springify().damping(14)}>
          <AvatarTile size={36} color={tier.color} avatarUrl={avatarUrl} name={username} glow />
        </Reanimated.View>
        <Reanimated.View
          entering={FadeInDown.delay(120).springify().damping(14)}
          style={youStandingStyles.headerSlot}
        >
          <StandingHeader kicker={kicker} title={title} tier={tier} />
        </Reanimated.View>
        <Reanimated.View entering={FadeInDown.delay(160).springify().damping(14)}>
          <StandingPrimaryStat
            value={primaryNum}
            target={primaryNumTarget}
            prefix={primaryNumPrefix}
            label={primaryLabel}
            tier={tier}
          />
        </Reanimated.View>
      </View>

      {/* Chase track — sits flush at the bottom edge of the card. */}
      {showChase && (
        <Reanimated.View
          entering={FadeIn.delay(200).duration(220).easing(Easing.out(Easing.cubic))}
        >
          <StandingChaseTrack pct={progressPct} tier={tier} />
        </Reanimated.View>
      )}
    </View>
  );
}

// ─── Leaderboard ──────────────────────────────────────────

type LeaderboardMode = 'weekly' | 'all-time';

// Animated period-toggle. The active pill background is no longer a
// per-pill boolean — it's a single absolutely-positioned underlay
// that slides between the two pill positions. Pill widths are
// measured via onLayout (auto-width, so they can differ between
// "7 DAYS" and "ALL-TIME"). Motion is GPU-only: we set the underlay's
// static width to the widest of the two pills and animate translateX +
// scaleX (origin: left) — never the `width` prop itself.
function ModePillBar({
  mode,
  onChange,
}: {
  mode: LeaderboardMode;
  onChange: (m: LeaderboardMode) => void;
}) {
  const { accent, accentSubtle } = useAccent();
  const options = ['weekly', 'all-time'] as const;
  // Per-pill measured text widths. Both pills then force themselves
  // to max() so they're the same size — that's what lets the
  // underlay just translate (no width morph).
  const [textW, setTextW] = useState<number[]>([0, 0]);
  const maxTextW = Math.max(textW[0] ?? 0, textW[1] ?? 0);
  // Pill body width = text + horizontal padding. Pillbar padding is
  // 2 each side, no gap (pills sit edge-to-edge like SwipeTabs).
  const PILL_HPAD = 10;
  const PILL_GAP = 0;
  const BAR_PAD = 2;
  const pillW = maxTextW + PILL_HPAD * 2;

  // Single transform — only translateX, mirroring the top-of-screen
  // SwipeTabs pattern. No scaleX morph.
  const slideX = useSharedValue(0);
  const activeIdx = options.indexOf(mode);
  // Only apply explicit pill width AFTER text has measured. Gate on
  // maxTextW (not pillW) — pillW = maxTextW + padding is always > 0
  // even when text hasn't measured, so gating on it would lock the
  // pill to padding-only width and squash the text to zero, which
  // reads as a tiny dot in the bar.
  const measured = maxTextW > 0;

  useEffect(() => {
    if (!measured) return;
    // Active underlay's left edge = (pill index) * (pillW + gap).
    // Timed cubic in-out — no overshoot, decisive snap. Springs
    // always carry some bounce; timing eliminates it cleanly.
    slideX.value = withTiming(activeIdx * (pillW + PILL_GAP), {
      duration: 220,
      easing: Easing.inOut(Easing.cubic),
    });
  }, [activeIdx, pillW, measured]);

  const underlayStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }));

  return (
    <View style={leaderboardStyles.modePillBar}>
      {/* Sliding underlay — fixed width (no scaleX). Translates
          between equal-width pill slots, matching the SwipeTabs
          tab indicator at the top of the screen. */}
      {measured && (
        <Reanimated.View
          pointerEvents="none"
          style={[
            leaderboardStyles.modePillUnderlay,
            { width: pillW, left: BAR_PAD, backgroundColor: accentSubtle },
            underlayStyle,
          ]}
        />
      )}
      {options.map((opt, i) => {
        const isActive = mode === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(opt);
            }}
            // Equal-width pills: explicit width once measurements
            // settle, otherwise content-sized for the first frame so
            // the text has room to render and report its real width.
            style={[leaderboardStyles.modePill, measured && { width: pillW }]}
          >
            <Text
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                setTextW((prev) => {
                  if (prev[i] === w) return prev;
                  const next = [...prev];
                  next[i] = w;
                  return next;
                });
              }}
              style={[
                leaderboardStyles.modePillText,
                { color: isActive ? accent : colors.button1 },
              ]}
            >
              {opt === 'weekly' ? 'WEEKLY' : 'ALLTIME'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Store ──────────────────────────────────────────────────
// Catalog of cosmetic themes. Each theme inherits a rarity tier
// from its price so the store reuses the same visual ladder as
// achievements + the leaderboard — a 1500-coin Epic theme feels
// like an Epic achievement, not a separate currency.
//
// Themes don't yet swap the app's actual color palette; the unlock
// flow exercises the spend-coin + own-cosmetic state so the
// system is wired end-to-end. When real theming lands, hook
// equippedThemeId into the colors module via a ThemeProvider.
interface CosmeticTheme {
  id: string;
  name: string;
  description: string;
  price: number;
  // Two-color gradient that becomes the card's actual surface so
  // each tile reads as that theme rather than as a generic chip.
  gradient: [string, string];
  // Accent — replaces colors.accent if real theming were wired.
  accent: string;
  // Maps to the existing RARITY ladder so the store inherits the
  // same color/glow tokens used in achievements + leaderboard.
  rarity: Rarity;
}

const COSMETIC_THEMES: CosmeticTheme[] = [
  {
    id: 'pink',
    name: 'Pink',
    description: 'Bright pink. Reserved for personal records.',
    price: 1650,
    gradient: ['#3A0A2D', '#1C0517'],
    accent: '#FF4DD2',
    rarity: 'rare',
  },
  {
    id: 'crimson',
    name: 'Crimson',
    description: 'Deep red. Heat for the heaviest sets.',
    price: 2750,
    gradient: ['#3D0F12', '#1F0608'],
    accent: '#DC143C',
    rarity: 'epic',
  },
];

function StoreView() {
  const { coins } = useCoins();
  const { spentCoins, ownedThemeIds, equippedThemeId, unlockTheme, equipTheme } = useSettings();
  const available = Math.max(0, coins - spentCoins);
  // Theme awaiting purchase confirmation. null = no modal open.
  const [pendingPurchase, setPendingPurchase] = useState<CosmeticTheme | null>(null);

  const handlePress = useCallback(
    (theme: CosmeticTheme) => {
      const owned = ownedThemeIds.has(theme.id) || theme.price === 0;
      const equipped = equippedThemeId === theme.id;

      if (equipped) {
        // Tap an equipped theme to un-equip — fall back to default.
        Haptics.selectionAsync().catch(() => {});
        equipTheme(null);
        return;
      }
      if (owned) {
        Haptics.selectionAsync().catch(() => {});
        equipTheme(theme.id);
        return;
      }
      // Locked: attempt unlock if affordable.
      if (available < theme.price) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        return;
      }
      // Affordable & locked → confirmation modal. Light haptic here,
      // medium when the user actually commits to the purchase.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setPendingPurchase(theme);
    },
    [available, ownedThemeIds, equippedThemeId, equipTheme],
  );

  const confirmPurchase = useCallback(() => {
    if (!pendingPurchase) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    unlockTheme(pendingPurchase.id, pendingPurchase.price);
    equipTheme(pendingPurchase.id);
    setPendingPurchase(null);
  }, [pendingPurchase, unlockTheme, equipTheme]);

  // +1 in the count = Mint Classic which is always free/owned but
  // not stored in the persisted set.
  const ownedCount = ownedThemeIds.size + 1;

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={storeStyles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Wallet panel ──────────────────────────────────────
            Same dome silhouette + star backdrop as the standings
            panel. Wallet is the focal element of the store, so it
            gets the same ceremonial treatment as the podium. */}
        <Reanimated.View entering={FadeIn.duration(280)} style={storeStyles.walletPanel}>
          <PodiumBackdrop height={WALLET_PANEL_H} />
          <WalletShimmer />
          <View style={storeStyles.walletInner}>
            <View style={storeStyles.walletHeaderRow}>
              <View style={[leaderboardStyles.sectionDot, { backgroundColor: colors.fav }]} />
              <Text style={leaderboardStyles.sectionLabel}>WALLET</Text>
            </View>
            <View style={storeStyles.walletBalanceRow}>
              <View style={storeStyles.coinChip}>
                <MaterialCommunityIcons name="circle" size={20} color={colors.fav} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={storeStyles.walletValue}>{available.toLocaleString()}</Text>
                <Text style={storeStyles.walletValueLabel}>COINS AVAILABLE</Text>
              </View>
            </View>
            {/* Earned vs Spent breakdown — a small two-column ledger
                row at the bottom of the panel. Same letterspaced
                metric pattern the standings use. */}
            <View style={storeStyles.walletLedger}>
              <View style={storeStyles.ledgerCell}>
                <Text style={storeStyles.ledgerLabel}>EARNED</Text>
                <Text style={storeStyles.ledgerValue}>{coins.toLocaleString()}</Text>
              </View>
              <View style={storeStyles.ledgerDivider} />
              <View style={storeStyles.ledgerCell}>
                <Text style={storeStyles.ledgerLabel}>SPENT</Text>
                <View style={storeStyles.ledgerSpentRow}>
                  <Text
                    style={[
                      storeStyles.ledgerValue,
                      spentCoins === 0 && { color: 'rgba(255,255,255,0.35)' },
                    ]}
                  >
                    {spentCoins.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Reanimated.View>

        {/* ── Cosmetic Themes section ──────────────────────────── */}
        <View style={storeStyles.section}>
          <View style={storeStyles.sectionHeader}>
            <View style={[leaderboardStyles.sectionDot, { backgroundColor: colors.accent }]} />
            <Text style={leaderboardStyles.sectionLabel}>COSMETIC THEMES</Text>
            <View style={leaderboardStyles.sectionCountPill}>
              <Text style={leaderboardStyles.sectionCountText}>
                {ownedCount}/{COSMETIC_THEMES.length}
              </Text>
            </View>
          </View>
          <View style={storeStyles.grid}>
            {COSMETIC_THEMES.map((theme, i) => {
              const owned = ownedThemeIds.has(theme.id) || theme.price === 0;
              const equipped = equippedThemeId === theme.id;
              const affordable = available >= theme.price;
              return (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  owned={owned}
                  equipped={equipped}
                  affordable={affordable}
                  index={i}
                  onPress={() => handlePress(theme)}
                />
              );
            })}
            <ComingSoonCard hint="More Themes" />
          </View>
        </View>

        {/* ── Coming Soon section ────────────────────────────────
            Three dashed-outline placeholder cards that reuse the
            EmptyPodiumPillar visual vocabulary. Signals "growing
            collection" without faking content. */}
        <View style={storeStyles.section}>
          <View style={storeStyles.sectionHeader}>
            <View
              style={[leaderboardStyles.sectionDot, { backgroundColor: 'rgba(255,255,255,0.35)' }]}
            />
            <Text style={leaderboardStyles.sectionLabel}>COMING SOON</Text>
          </View>
          <View style={storeStyles.grid}>
            <ComingSoonCard hint="Avatar Frames" />
            <ComingSoonCard hint="XP Boosters" />
            <ComingSoonCard hint="Pillar FX" />
          </View>
        </View>
      </ScrollView>

      <UnlockConfirmModal
        theme={pendingPurchase}
        availableBefore={available}
        onConfirm={confirmPurchase}
        onClose={() => setPendingPurchase(null)}
      />
    </>
  );
}

// Approx height of the wallet panel — used by the PodiumBackdrop
// inside it to size the SVG. Slightly generous so the star pattern
// extends to the rounded corners.
const WALLET_PANEL_H = 200;

function ThemeCard({
  theme,
  owned,
  equipped,
  affordable,
  index,
  onPress,
}: {
  theme: CosmeticTheme;
  owned: boolean;
  equipped: boolean;
  affordable: boolean;
  index: number;
  onPress: () => void;
}) {
  const themedRarity = useThemedRarity();
  const r = themedRarity[theme.rarity];

  // CTA state machine: equipped > owned > affordable > locked.
  const ctaLabel = equipped ? 'EQUIPPED' : owned ? 'EQUIP' : `${theme.price.toLocaleString()}`;
  const ctaColor = equipped
    ? theme.accent
    : owned
      ? '#fff'
      : affordable
        ? colors.fav
        : 'rgba(255,255,255,0.35)';
  const borderColor = equipped ? theme.accent : r.borderIdle;

  return (
    <Reanimated.View
      entering={FadeInDown.delay(60 + index * 40)
        .duration(280)
        .easing(Easing.out(Easing.cubic))}
      style={storeStyles.themeCardWrap}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          storeStyles.themeCard,
          {
            borderColor,
            shadowColor: equipped ? theme.accent : r.color,
            opacity: !owned && !affordable ? 0.55 : 1,
          },
          pressed && { transform: [{ scale: 0.97 }] },
        ]}
      >
        {/* The card surface IS the theme. Each tile expresses its
            own personality rather than being a uniform container. */}
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        {/* Soft accent halo near the top — a focal glow that ties
            the card's identity to its accent color. */}
        <View
          pointerEvents="none"
          style={[storeStyles.themeHalo, { backgroundColor: theme.accent + '22' }]}
        />

        {/* Top row: rarity tier label + lock/equipped badge */}
        <View style={storeStyles.themeTopRow}>
          <Text style={[storeStyles.themeRarity, { color: r.color }]}>{r.label}</Text>
          {equipped ? (
            <View
              style={[
                storeStyles.themeBadge,
                { borderColor: theme.accent, backgroundColor: theme.accent + '22' },
              ]}
            >
              <Feather name="check" size={10} color={theme.accent} />
            </View>
          ) : !owned ? (
            <View style={storeStyles.themeBadge}>
              <Feather name="lock" size={10} color="rgba(255,255,255,0.7)" />
            </View>
          ) : (
            <View style={storeStyles.themeBadgePlaceholder} />
          )}
        </View>

        {/* Big accent dot — the visual signature of the theme */}
        <View style={storeStyles.themeAccentSlot}>
          <View
            style={[
              storeStyles.themeAccentOrb,
              { backgroundColor: theme.accent, shadowColor: theme.accent },
            ]}
          />
        </View>

        <Text style={storeStyles.themeName} numberOfLines={1}>
          {theme.name}
        </Text>
        <Text style={storeStyles.themeDesc} numberOfLines={2}>
          {theme.description}
        </Text>

        <View
          style={[
            storeStyles.ctaPill,
            {
              borderColor: ctaColor + '55',
              backgroundColor: equipped ? theme.accent + '14' : 'rgba(0,0,0,0.25)',
            },
          ]}
        >
          {!owned && <MaterialCommunityIcons name="circle" size={9} color={ctaColor} />}
          <Text style={[storeStyles.ctaText, { color: ctaColor }]}>{ctaLabel}</Text>
        </View>
      </Pressable>
    </Reanimated.View>
  );
}

function ComingSoonCard({ hint }: { hint: string }) {
  return (
    <View style={storeStyles.comingSoonCard}>
      <View style={storeStyles.comingSoonAccentSlot}>
        <Text style={storeStyles.comingSoonGlyph}>?</Text>
      </View>
      <Text style={storeStyles.comingSoonHint} numberOfLines={1}>
        {hint}
      </Text>
      <Text style={storeStyles.comingSoonMeta}>— SOON —</Text>
    </View>
  );
}

// ── Purchase confirmation modal ─────────────────────────────
// Shows the theme being purchased, the wallet balance now, and
// the balance after the purchase. Two large pill buttons: cancel
// (subtle) and unlock (rarity-themed). Same kinetic vocabulary as
// ProfilePreviewModal so the modals all share a kinetic family.
function UnlockConfirmModal({
  theme,
  availableBefore,
  onConfirm,
  onClose,
}: {
  theme: CosmeticTheme | null;
  availableBefore: number;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const themedRarity = useThemedRarity();
  const visible = theme !== null;
  const scale = useSharedValue(0.92);
  useEffect(() => {
    if (visible) {
      scale.value = 0.92;
      scale.value = withSpring(1, { stiffness: 220, damping: 18 });
    }
  }, [visible]);
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (!theme) return null;
  const r = themedRarity[theme.rarity];
  const after = Math.max(0, availableBefore - theme.price);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Reanimated.View
        entering={FadeIn.duration(180)}
        exiting={FadeOut.duration(140)}
        style={StyleSheet.absoluteFill}
      >
        <BlurView intensity={32} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable style={confirmStyles.dismissArea} onPress={onClose}>
          <View style={confirmStyles.center} pointerEvents="box-none">
            <Reanimated.View
              style={[
                confirmStyles.card,
                {
                  borderColor: theme.accent + '88',
                  shadowColor: theme.accent,
                },
                cardStyle,
              ]}
            >
              <LinearGradient
                colors={theme.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View
                pointerEvents="none"
                style={[confirmStyles.cardHalo, { backgroundColor: theme.accent + '20' }]}
              />

              {/* Hero: rarity label + theme name + accent orb */}
              <Text style={[confirmStyles.rarityLabel, { color: r.color }]}>{r.label} THEME</Text>
              <Text style={confirmStyles.themeName}>{theme.name}</Text>
              <View
                style={[
                  confirmStyles.heroOrb,
                  { backgroundColor: theme.accent, shadowColor: theme.accent },
                ]}
              />
              <Text style={confirmStyles.themeDesc}>{theme.description}</Text>

              {/* Balance diff card — current → after, with the cost
                  pill in between for a visual ledger. */}
              <View style={confirmStyles.balanceFrame}>
                <View style={confirmStyles.balanceCol}>
                  <Text style={confirmStyles.balanceLabel}>BALANCE</Text>
                  <View style={confirmStyles.balanceRow}>
                    <MaterialCommunityIcons name="circle" size={11} color={colors.fav} />
                    <Text style={confirmStyles.balanceValue}>
                      {availableBefore.toLocaleString()}
                    </Text>
                  </View>
                </View>
                <View style={confirmStyles.costPill}>
                  <Text style={confirmStyles.costText}>−{theme.price.toLocaleString()}</Text>
                  <Feather name="arrow-right" size={12} color="rgba(255,255,255,0.5)" />
                </View>
                <View style={[confirmStyles.balanceCol, { alignItems: 'flex-end' }]}>
                  <Text style={confirmStyles.balanceLabel}>AFTER</Text>
                  <View style={confirmStyles.balanceRow}>
                    <MaterialCommunityIcons name="circle" size={11} color={colors.fav} />
                    <Text style={[confirmStyles.balanceValue, { color: theme.accent }]}>
                      {after.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action row */}
              <View style={confirmStyles.actionRow}>
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [confirmStyles.cancelBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={confirmStyles.cancelText}>CANCEL</Text>
                </Pressable>
                <Pressable
                  onPress={onConfirm}
                  style={({ pressed }) => [
                    confirmStyles.confirmBtn,
                    {
                      backgroundColor: theme.accent,
                      shadowColor: theme.accent,
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Feather name="check" size={14} color="#000" />
                  <Text style={confirmStyles.confirmText}>UNLOCK</Text>
                </Pressable>
              </View>
            </Reanimated.View>
          </View>
        </Pressable>
      </Reanimated.View>
    </Modal>
  );
}

const storeStyles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80,
    gap: 22,
  },

  // ── Wallet panel ─────────────────────────────────────────
  // Contained card — sits inside the ScrollView's 16px padding (no
  // edge-bleed), uniform corner radius all around. overflow:hidden
  // clips the star backdrop + shimmer sweep to the rounded silhouette.
  walletPanel: {
    backgroundColor: 'rgba(255,215,0,0.025)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.18)',
    overflow: 'hidden',
    height: WALLET_PANEL_H,
  },
  walletInner: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  walletHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  // Round coin chip — gold-tinted halo so the symbol carries
  // the wallet's identity even before reading the number.
  coinChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.fav,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  walletValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.4,
    fontVariant: ['tabular-nums'],
  },
  walletValueLabel: {
    marginTop: 1,
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.4,
  },
  // Bottom ledger — earned vs spent in a single row, divider in
  // the middle so the two read as parallel metrics.
  walletLedger: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  ledgerCell: {
    flex: 1,
    gap: 2,
  },
  ledgerDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: 12,
  },
  ledgerLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.2,
  },
  ledgerValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  ledgerSpentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Compact refund pill — gold-tinted to match the wallet identity.
  // Sits inline with the SPENT value so the affordance is right
  // where the eye lands when reading "I've spent N coins."
  refundPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,215,0,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.35)',
  },
  refundText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.fav,
    letterSpacing: 1,
  },

  // ── Sections ─────────────────────────────────────────────
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // ── Theme grid ───────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  // Wrap layer holds the FadeInDown entering animation so
  // Reanimated owns layout changes cleanly.
  themeCardWrap: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  // The card surface itself IS the theme. Padding moved to inner
  // padding instead of the wrap so the gradient reaches edges.
  themeCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 220,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  // Soft accent glow near the top — color depth without the
  // generic "card with header" pattern.
  themeHalo: {
    position: 'absolute',
    top: -40,
    left: '20%',
    right: '20%',
    height: 100,
    borderRadius: 60,
    opacity: 0.9,
  },
  themeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeRarity: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  themeBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Phantom slot keeps the layout stable for unlocked-but-not-
  // equipped cards (no badge to show).
  themeBadgePlaceholder: {
    width: 22,
    height: 22,
  },
  // Spotlight slot for the accent orb — center-aligned so the
  // theme's identity color is the visual anchor of the card.
  themeAccentSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  themeAccentOrb: {
    width: 38,
    height: 38,
    borderRadius: 19,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 14,
    elevation: 10,
  },
  themeName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  themeDesc: {
    marginTop: 4,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 15,
    minHeight: 30,
  },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  ctaText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  // ── Coming Soon placeholders ─────────────────────────────
  // Reuses the dashed-outline language from EmptyPodiumPillar so
  // the empty state feels intentional, not broken.
  comingSoonCard: {
    flexBasis: '48%',
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
    paddingVertical: 22,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.015)',
  },
  comingSoonAccentSlot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonGlyph: {
    fontSize: 18,
    fontWeight: '300',
    color: 'rgba(255,255,255,0.45)',
  },
  comingSoonHint: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.3,
  },
  comingSoonMeta: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.6,
  },
});

const confirmStyles = StyleSheet.create({
  dismissArea: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 22,
    borderWidth: 1.5,
    paddingVertical: 22,
    paddingHorizontal: 22,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
    alignItems: 'center',
  },
  cardHalo: {
    position: 'absolute',
    top: -60,
    left: '15%',
    right: '15%',
    height: 160,
    borderRadius: 100,
  },
  rarityLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
    marginBottom: 4,
  },
  themeName: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.3,
    marginBottom: 16,
  },
  heroOrb: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 18,
    elevation: 14,
  },
  themeDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 19,
  },
  // Balance diff strip: BEFORE | -COST | AFTER, with the cost as
  // a pill in the center so the visual reads left-to-right as a
  // ledger entry.
  balanceFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  balanceCol: {
    flex: 1,
    gap: 4,
  },
  balanceLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.2,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  costPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 8,
  },
  costText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.4,
    fontVariant: ['tabular-nums'],
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.2,
  },
  confirmBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 1.2,
  },
});

function LeaderboardView() {
  const { totalXP, levelTitle, xpLog } = useXP();
  const { equippedSeasonTitle } = useSettings();
  const { accent } = useAccent();
  const { profile } = useProfile();
  const { session: authSession } = useAuth();
  const navigation = useNavigation<any>();
  const displayTitle = equippedSeasonTitle ?? levelTitle.title;
  const [mode, setMode] = useState<LeaderboardMode>('all-time');
  // Measured height of the standings panel — drives the
  // PodiumBackdrop SVG sizing so the topographic curves and dust
  // bands distribute proportionally to the actual list height.
  // Initial 700 covers a typical 7-row list before re-layout.
  const [standingsPanelH, setStandingsPanelH] = useState(700);
  // Profile preview — populated by long-press on any leaderboard
  // entry. null = closed.
  const [previewData, setPreviewData] = useState<ProfilePreviewData | null>(null);
  // Add-friend modal visibility. Triggered by the user-plus button
  // in the podium section header.
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  // Followed users — pulled from Supabase with their cached aggregate
  // XP already attached (no need to read their raw workout_sessions).
  const [followedUsers, setFollowedUsers] = useState<FollowedProfile[]>([]);

  // Load followed users on focus + whenever the add-friend modal
  // closes, so a fresh follow shows up in standings immediately.
  const followerId = authSession?.user.id;
  const loadFollowed = useCallback(async () => {
    if (!followerId) {
      setFollowedUsers([]);
      return;
    }
    const list = await fetchFollowingProfiles(followerId);
    setFollowedUsers(list);
  }, [followerId]);
  useFocusEffect(
    useCallback(() => {
      loadFollowed();
    }, [loadFollowed]),
  );
  useEffect(() => {
    if (!addFriendOpen) loadFollowed();
  }, [addFriendOpen, loadFollowed]);

  // Sum of user XP earned in the last 7 days
  const weeklyXP = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return xpLog.reduce((sum, e) => {
      const t = new Date(e.date).getTime();
      return Number.isFinite(t) && t >= cutoff ? sum + e.totalXP : sum;
    }, 0);
  }, [xpLog]);

  const userXP = mode === 'weekly' ? weeklyXP : totalXP;

  // Build sorted standings (dummies + you). Sorted by XP desc for the active mode.
  // Top 3 → ceremonial podium. Chase (rank 4+) excludes the user; the user lives
  // in the hero card at top instead. nextRival / podiumTarget / leadOver drive
  // the framing of YourStandingCard.
  const { top3, chase, yourRank, standingState, nextRival, podiumTarget, leadOver } =
    useMemo(() => {
      const tierTitle = (xp: number) => {
        const tIdx = SEASON_TIERS.reduce((best, t, i) => (xp >= t.xp ? i : best), 0);
        return SEASON_TIERS[tIdx].title;
      };
      // Followed users — XP is the active mode's value (weekly or
      // all-time) so the sort matches what the user sees. Tier title
      // always reads off all-time XP since tiers are progression
      // milestones, not period scoreboards.
      const others = followedUsers.map((u) => ({
        key: u.id,
        name: u.username,
        title: tierTitle(u.total_xp),
        xp: mode === 'weekly' ? u.weekly_xp : u.total_xp,
        avatarUrl: u.avatar_url,
      }));
      const all = [
        ...others,
        {
          key: '__you__',
          name: 'You',
          title: displayTitle,
          xp: userXP,
          avatarUrl: profile?.avatar_url ?? null,
        },
      ];
      all.sort((a, b) => b.xp - a.xp);
      const ranked = all.map((e, i) => ({ ...e, rank: i + 1 }));
      const me = ranked.find((e) => e.key === '__you__')!;
      const above = ranked.find((e) => e.rank === me.rank - 1) ?? null;
      const below = ranked.find((e) => e.rank === me.rank + 1) ?? null;
      const podiumEdge = ranked.find((e) => e.rank === 3) ?? null;

      const state: StandingState = me.rank === 1 ? 'throne' : me.rank <= 3 ? 'podium' : 'climbing';

      return {
        top3: ranked.slice(0, 3),
        chase: ranked.slice(3).filter((e) => e.key !== '__you__'),
        yourRank: me.rank,
        standingState: state,
        nextRival: above ? { name: above.name, xp: above.xp, rank: above.rank } : null,
        // Only relevant when the user is outside the podium — what XP gets them in.
        podiumTarget:
          me.rank > 3 && podiumEdge
            ? { name: podiumEdge.name, xp: podiumEdge.xp, rank: podiumEdge.rank }
            : null,
        // Only relevant when the user holds #1 — who's chasing.
        leadOver:
          me.rank === 1 && below ? { name: below.name, xp: below.xp, rank: below.rank } : null,
      };
    }, [userXP, displayTitle, mode, followedUsers, profile?.avatar_url]);

  // Total participants in the leaderboard — used by the profile
  // preview to compute percentile ("Top 25% of 9").
  const totalEntries = top3.length + chase.length + 1; // +1 for you

  // XP-by-name lookup so the profile preview can show BOTH all-time
  // and weekly XP regardless of which mode is active. Entry rows
  // only carry the active mode's XP, so we re-resolve from source.
  const xpByName = useMemo(() => {
    const m = new Map<string, { totalXP: number; weeklyXP: number }>();
    m.set('You', { totalXP, weeklyXP });
    for (const u of followedUsers) {
      m.set(u.username, { totalXP: u.total_xp, weeklyXP: u.weekly_xp });
    }
    return m;
  }, [totalXP, weeklyXP, followedUsers]);

  // Preview builder — resolves an entry into the dense data shape
  // the modal renders. Centralized so podium and chase rows stay
  // consistent. The See Profile CTA always works: for the current
  // user it lands on the real Profile screen; for any dummy with
  // a registered DUMMY_PROFILE it lands on DummyProfileScreen.
  const buildPreview = useCallback(
    (entry: {
      key: string;
      name: string;
      rank: number;
      title: string;
      avatarUrl?: string | null;
    }): ProfilePreviewData => {
      const isYou = entry.key === '__you__';
      const xpData = xpByName.get(entry.name) ?? { totalXP: 0, weeklyXP: 0 };
      return {
        name: entry.name,
        displayName: isYou ? (profile?.username ?? 'You') : entry.name,
        title: entry.title,
        rank: entry.rank,
        totalXP: xpData.totalXP,
        weeklyXP: xpData.weeklyXP,
        rarity: rankToRarity(entry.rank),
        avatarUrl: isYou ? (profile?.avatar_url ?? null) : (entry.avatarUrl ?? null),
        // Rank delta will come from real period-over-period tracking
        // once a leaderboard backend lands; flat for now.
        delta: 0,
        isYou,
        totalEntries,
        // Self lands on the Profile tab; any other entry routes to that
        // user's UserProfile screen by id (standings entries are real
        // followed users keyed by their user id).
        onSeeProfile: isYou
          ? () => navigation.navigate('Profile')
          : () => navigation.navigate('UserProfile', { userId: entry.key }),
      };
    },
    [xpByName, profile?.username, profile?.avatar_url, totalEntries, navigation],
  );

  // Long-press → medium haptic + open. Medium (not Light) signals
  // "this is a discrete action," differentiating it from the Light
  // browse haptic the row already plays on press-in.
  const showPreview = useCallback((data: ProfilePreviewData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setPreviewData(data);
  }, []);

  // Navigate to the view-profile screen for a non-self standings entry.
  // Replaces the previous in-place peek modal.
  const goToUserProfile = useCallback(
    (entry: { key: string }) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      navigation.navigate('UserProfile', { userId: entry.key });
    },
    [navigation],
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={leaderboardStyles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Podium — top 3 ceremonial showcase. Section header gives
            it equal spatial framing to the chase below, instead of
            floating loose. Degrades gracefully for short lists:
            PodiumSandbox renders only the ranks present, so a solo
            user shows as a single centered rank-1 pillar. The period
            toggle (7 DAYS / ALL-TIME) lives inside this header so
            the scope sits with the title it modifies. */}
        {top3.length >= 1 && (
          <View style={leaderboardStyles.section}>
            <PodiumSectionHeader
              count={Math.min(3, top3.length)}
              mode={mode}
              onModeChange={setMode}
              onAddFriend={() => setAddFriendOpen(true)}
            />
            <PodiumSandbox
              entries={top3.map((e) => ({
                rank: e.rank as 1 | 2 | 3,
                name: e.name,
                xp: e.xp,
                title: e.title,
                displayName: e.key === '__you__' ? profile?.username : e.name,
                // Each entry now carries its own avatarUrl from the
                // standings memo. AvatarTile falls back to initials
                // when the URL is null.
                avatarUrl: e.avatarUrl ?? null,
              }))}
              onPillarLongPress={(rank) => {
                const e = top3.find((t) => t.rank === rank);
                if (!e) return;
                // Long-press opens the preview modal (with its See Profile
                // CTA) for everyone — same gesture whether it's you or a
                // rival, matching the chase rows below.
                showPreview(buildPreview(e));
              }}
            />
          </View>
        )}

        {/* Standings — rank 4+. Same section-header pattern as the
            Achievements tab so the page reads as one design family.
            Always rendered: shows an empty-state hint when no other
            players exist so the page silhouette stays intact. */}
        <Reanimated.View
          entering={FadeIn.delay(220).duration(260)}
          style={chaseStyles.panel}
          onLayout={(e) => setStandingsPanelH(e.nativeEvent.layout.height)}
        >
          {/* Star/dust backdrop — same component as the podium so the
              two sections share visual identity. The panel's
              overflow:'hidden' + dome corners clip the SVG to the
              panel silhouette. Three crossfading dust bands give
              the field continuous twinkle. */}
          <PodiumBackdrop height={standingsPanelH} />
          <View style={chaseStyles.panelHeader}>
            <View style={[leaderboardStyles.sectionDot, { backgroundColor: accent }]} />
            <Text style={leaderboardStyles.sectionLabel}>STANDINGS</Text>
            <View style={leaderboardStyles.sectionCountPill}>
              <Text style={leaderboardStyles.sectionCountText}>{chase.length}</Text>
            </View>
            {yourRank > 10 && (
              <Text style={leaderboardStyles.sectionMeta}>· you · #{yourRank}</Text>
            )}
          </View>
          {chase.length === 0 ? (
            <View style={chaseStyles.emptyState}>
              <Feather name="users" size={20} color="rgba(255,255,255,0.35)" />
              <Text style={chaseStyles.emptyText}>Add More Users</Text>
              <Text style={chaseStyles.emptySubtext}>
                Follow more people to see them in the standings.
              </Text>
            </View>
          ) : (
            chase.map((entry, i) => (
              <ChaseRow
                key={entry.key}
                entry={entry}
                // Rank delta will come from real period-over-period
                // tracking once a leaderboard backend lands.
                delta={0}
                index={i}
                isLast={i === chase.length - 1}
                onPress={() => goToUserProfile(entry)}
                // Long-press opens the same preview modal as the podium /
                // your own entry, with its See Profile CTA.
                onLongPress={() => showPreview(buildPreview(entry))}
              />
            ))
          )}
        </Reanimated.View>
      </ScrollView>

      {/* Sticky standing bar — anchored above the bottom tab nav.
          A vertical fade strip above lets list content dissolve into
          the bar instead of clipping hard. Outer wrapper is
          pointerEvents="box-none" so the fade strip doesn't swallow
          taps that belong to scrollable content above it. */}
      <View pointerEvents="box-none" style={youStandingStyles.stickyOuter}>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(26,25,25,0)', colors.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={youStandingStyles.stickyFade}
        />
        <View style={youStandingStyles.stickyInner}>
          <Reanimated.View entering={FadeIn.duration(220).easing(Easing.out(Easing.cubic))}>
            <YourStandingCard
              rank={yourRank}
              xp={userXP}
              state={standingState}
              nextRival={nextRival}
              podiumTarget={podiumTarget}
              leadOver={leadOver}
              avatarUrl={profile?.avatar_url}
              username={profile?.username}
              title={displayTitle}
            />
          </Reanimated.View>
        </View>
      </View>

      {/* Profile preview — Steam-style hover card. Lives at the
          LeaderboardView root so it overlays the sticky standing
          bar too. Triggered by long-press on any podium pillar
          (rank 1–3) or chase row (rank 4+). */}
      <ProfilePreviewModal data={previewData} onClose={() => setPreviewData(null)} />
      {/* Add-friend modal — search by username, follow people,
          add them to your leaderboard. Triggered by the user-plus
          button in the podium section header. */}
      <AddFriendModal
        visible={addFriendOpen}
        followerId={authSession?.user.id}
        onClose={() => setAddFriendOpen(false)}
      />
    </View>
  );
}

// ─── Season Pass ───────────────────────────────────────────

const SEASON_TIERS = [
  { xp: 0, title: 'Mortal', subtitle: 'The journey begins' },
  { xp: 300, title: 'Spartan', subtitle: 'Forged in discipline' },
  { xp: 1200, title: 'Hero of Athens', subtitle: 'Courage beyond measure' },
  { xp: 3500, title: 'Demigod', subtitle: 'Half mortal, half divine' },
  { xp: 7000, title: 'Olympian', subtitle: 'Chosen by the gods' },
  { xp: 11000, title: 'God of Olympus', subtitle: 'Power beyond reckoning' },
  { xp: 16000, title: 'Zeus', subtitle: 'King of all gods' },
];

const SEASON_END = new Date('2026-08-01');
// Cap to the content column on wide web so the horizontal tab pager and
// per-page content fit the same centered max-width as the rest of the app.
const SCREEN_WIDTH = getContentWidth(Dimensions.get('window').width);
const TAB_LABELS = ['Achievements', 'Leaderboard', 'Store'] as const;
const TAB_COUNT = TAB_LABELS.length;
const SWIPE_VELOCITY_THRESHOLD = 0.3;
const SWIPE_DISTANCE_THRESHOLD = SCREEN_WIDTH * 0.35;

// ─── Unlocked Card (3-col grid) ──────────────────────────
// Plain Feather icon + StarRow for rarity. Hex shell removed —
// stars carry the rarity signal.

const HEX_GRID_GAP = 8;
const HEX_GRID_OUTER_PAD = 16;
const HEX_GRID_CONTAINER_PAD = 14;
const HEX_GRID_CONTAINER_BORDER = 1;
const HEX_CARD_WIDTH = Math.floor(
  (SCREEN_WIDTH -
    HEX_GRID_OUTER_PAD * 2 -
    HEX_GRID_CONTAINER_PAD * 2 -
    HEX_GRID_CONTAINER_BORDER * 2 -
    HEX_GRID_GAP * 2) /
    3,
);

const hexCardStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: HEX_GRID_GAP,
  },
  card: {
    width: HEX_CARD_WIDTH,
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.titleText,
    textAlign: 'center',
    lineHeight: 14,
    minHeight: 28,
  },
  xp: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

function UnlockedHexCard({
  achievement,
  index,
  onPress,
}: {
  achievement: Achievement;
  index: number;
  onPress: (a: Achievement) => void;
}) {
  const themedRarity = useThemedRarity();
  const r = themedRarity[rarityFromXP(achievement.xp)];
  return (
    <Reanimated.View
      entering={FadeInDown.delay(40 + index * 50)
        .duration(220)
        .springify()}
    >
      <Pressable
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onPress(achievement);
        }}
        style={({ pressed }) => [
          hexCardStyles.card,
          { borderColor: r.borderIdle, backgroundColor: r.gradient[1] },
          pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
        ]}
      >
        <View
          style={[
            hexCardStyles.iconWrap,
            { backgroundColor: r.color + '14', borderWidth: 1, borderColor: r.borderIdle },
          ]}
        >
          <Feather name={achievement.icon} size={22} color={r.color} />
        </View>
        <StarRow count={r.stars} color={r.color} />
        <Text style={hexCardStyles.title} numberOfLines={2}>
          {achievement.title}
        </Text>
        <Text style={[hexCardStyles.xp, { color: r.color }]}>+{achievement.xp} XP</Text>
      </Pressable>
    </Reanimated.View>
  );
}

function getTierUnlockDate(
  tierXp: number,
  xpLog: readonly XPLogEntry[],
  achievementXP: number,
): string | null {
  const sorted = [...xpLog].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (tierXp === 0) return sorted.length > 0 ? sorted[0].date : null;
  let running = achievementXP;
  for (const entry of sorted) {
    running += entry.totalXP;
    if (running >= tierXp) return entry.date;
  }
  return null;
}

function formatUnlockDate(dateStr: string): string {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// ─── Season tier rarity mapping ────────────────────────────
//
// 7 SEASON_TIERS → 5 rarity tokens. Locked in one place.
// Mortal → common, Spartan → uncommon, Hero/Demigod → rare,
// Olympian/God of Olympus → epic, Zeus → legendary (particles).

function tierToRarity(tierIndex: number): Rarity {
  switch (tierIndex) {
    case 0:
      return 'common'; // Mortal
    case 1:
      return 'uncommon'; // Spartan
    case 2:
      return 'rare'; // Hero of Athens
    case 3:
      return 'rare'; // Demigod
    case 4:
      return 'epic'; // Olympian
    case 5:
      return 'epic'; // God of Olympus
    case 6:
      return 'legendary'; // Zeus
    default:
      return 'common';
  }
}

const TIER_ICONS: (keyof typeof Feather.glyphMap)[] = [
  'user', // Mortal
  'shield', // Spartan
  'award', // Hero of Athens
  'feather', // Demigod
  'star', // Olympian
  'sun', // God of Olympus
  'zap', // Zeus
];

// ─── Animated tier number ring (current tier pulse) ────────

function CurrentTierRing({ color, glow }: { color: string; glow: string }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, []);
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.35, 0.85], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.08], Extrapolation.CLAMP) }],
  }));
  return (
    <Reanimated.View
      pointerEvents="none"
      style={[seasonStyles.currentRing, { borderColor: color, shadowColor: color }, ringStyle]}
    />
  );
}

// ─── Current-tier disk shimmer ─────────────────────────────
//
// Sweeps a soft white band across the tier icon circle. Replaces the
// floating particles for the current tier — same shimmer grammar used
// elsewhere on the banner, scoped to the 64px disk via an overflow:hidden
// clip layer.

function CurrentTierShimmer() {
  const x = useSharedValue(-1);
  useEffect(() => {
    x.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(x.value, [-1, 1], [-70, 70], Extrapolation.CLAMP) }],
    opacity: interpolate(
      x.value,
      [-1, -0.5, 0, 0.5, 1],
      [0, 0.45, 0.8, 0.45, 0],
      Extrapolation.CLAMP,
    ),
  }));
  return (
    <Reanimated.View pointerEvents="none" style={[seasonStyles.currentRankShimmer, style]}>
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.22)', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />
    </Reanimated.View>
  );
}

// ─── Banner shimmer pass ───────────────────────────────────

function BannerShimmer() {
  const x = useSharedValue(-1);
  useEffect(() => {
    x.value = withRepeat(
      withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(x.value, [-1, 1], [-260, 260], Extrapolation.CLAMP) }],
    opacity: interpolate(
      x.value,
      [-1, -0.5, 0, 0.5, 1],
      [0, 0.45, 0.7, 0.45, 0],
      Extrapolation.CLAMP,
    ),
  }));
  return (
    <Reanimated.View pointerEvents="none" style={[seasonStyles.bannerShimmer, style]}>
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.07)', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />
    </Reanimated.View>
  );
}

// ─── Wallet diagonal shimmer ───────────────────────────────
//
// Sweeps a soft bright band along the top-left → bottom-right diagonal
// of the wallet panel. The 5-stop gradient bakes the bright moment
// into the centre of an absoluteFillObject layer; the layer itself is
// then translated by ±W on X and ±H on Y simultaneously so the bright
// moment travels from off the top-left corner, through the panel
// centre, and off the bottom-right corner.

function WalletShimmer() {
  const t = useSharedValue(-1);
  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(t.value, [-1, 1], [-360, 360], Extrapolation.CLAMP) },
      {
        translateY: interpolate(
          t.value,
          [-1, 1],
          [-WALLET_PANEL_H, WALLET_PANEL_H],
          Extrapolation.CLAMP,
        ),
      },
    ],
    opacity: interpolate(
      t.value,
      [-1, -0.5, 0, 0.5, 1],
      [0, 0.5, 0.85, 0.5, 0],
      Extrapolation.CLAMP,
    ),
  }));
  return (
    <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, style]}>
      <LinearGradient
        colors={[
          'transparent',
          'transparent',
          'rgba(255,255,255,0.14)',
          'transparent',
          'transparent',
        ]}
        locations={[0, 0.35, 0.5, 0.65, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </Reanimated.View>
  );
}

// ─── Tier card (rarity-tinted) ─────────────────────────────

interface TierCardProps {
  tier: { xp: number; title: string; subtitle: string };
  index: number;
  unlocked: boolean;
  isCurrent: boolean;
  isPast: boolean;
  unlockDate: string | null;
}

function TierCard({ tier, index, unlocked, isCurrent, isPast, unlockDate }: TierCardProps) {
  const themedRarity = useThemedRarity();
  const rarity = tierToRarity(index);
  const r = themedRarity[rarity];
  const icon = TIER_ICONS[index] ?? 'award';

  const scale = useSharedValue(1);
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (isCurrent) {
      pulse.value = withRepeat(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    }
  }, [isCurrent]);

  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: isCurrent ? interpolate(pulse.value, [0, 1], [0.45, 0.95], Extrapolation.CLAMP) : 0.5,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { stiffness: 320, damping: 14 });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, { stiffness: 280, damping: 12 });
  };
  const handlePress = () => {
    Haptics.selectionAsync().catch(() => {});
  };

  // Visual state: locked < past < current
  const cardOpacity = !unlocked ? 0.42 : isCurrent ? 1 : isPast ? 0.92 : 1;
  const borderColor = isCurrent
    ? r.borderActive
    : unlocked
      ? r.borderIdle
      : 'rgba(255,255,255,0.05)';
  const iconColor = unlocked ? r.color : colors.button1;

  return (
    <Reanimated.View
      entering={FadeInDown.delay(40 + index * 50)
        .duration(220)
        .springify()}
    >
      <Pressable onPress={handlePress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Reanimated.View
          style={[
            seasonStyles.tierCard,
            {
              opacity: cardOpacity,
              borderColor,
              shadowColor: isCurrent ? r.color : 'transparent',
            },
            pressStyle,
          ]}
        >
          {/* Gradient backdrop (unlocked only) */}
          {unlocked && (
            <LinearGradient
              colors={r.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          )}

          {/* Current tier glow halo */}
          {isCurrent && (
            <Reanimated.View pointerEvents="none" style={[seasonStyles.tierGlowHalo, glowStyle]}>
              <LinearGradient
                colors={[r.glow, 'transparent']}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
            </Reanimated.View>
          )}

          {/* Legendary particles (Zeus) */}
          {unlocked && r.particle && (
            <View pointerEvents="none" style={seasonStyles.tierParticleLayer}>
              {PARTICLE_OFFSETS.map((p, i) => (
                <Particle key={i} x={p.x} delay={p.delay} color={r.color} />
              ))}
            </View>
          )}

          <View style={seasonStyles.tierRow}>
            {/* Icon chip with tier number ring */}
            <View style={seasonStyles.tierIconWrap}>
              {isCurrent && <CurrentTierRing color={r.color} glow={r.glow} />}
              <View
                style={[
                  seasonStyles.tierIconChip,
                  {
                    backgroundColor: unlocked ? r.color + '18' : 'rgba(255,255,255,0.03)',
                    borderColor: unlocked ? r.color + '88' : 'rgba(255,255,255,0.06)',
                  },
                ]}
              >
                {unlocked ? (
                  <Feather name={icon} size={22} color={r.color} />
                ) : (
                  <Feather name="lock" size={18} color={colors.button1} style={{ opacity: 0.5 }} />
                )}
              </View>
              {/* Tier number badge */}
              <View
                style={[
                  seasonStyles.tierNumBadge,
                  {
                    backgroundColor: unlocked ? r.color : colors.button2,
                    borderColor: unlocked ? r.borderActive : 'rgba(255,255,255,0.06)',
                  },
                ]}
              >
                <Text
                  style={[
                    seasonStyles.tierNumBadgeText,
                    { color: unlocked ? '#0E0E0E' : colors.button1 },
                  ]}
                >
                  {index + 1}
                </Text>
              </View>
            </View>

            <View style={seasonStyles.tierInfo}>
              <View style={seasonStyles.tierChipRow}>
                <StarRow count={r.stars} color={iconColor} dim={!unlocked} />
                {isCurrent && (
                  <View
                    style={[
                      seasonStyles.currentChip,
                      { backgroundColor: r.color + '22', borderColor: r.color + '88' },
                    ]}
                  >
                    <View style={[seasonStyles.currentDot, { backgroundColor: r.color }]} />
                    <Text style={[seasonStyles.currentChipText, { color: r.color }]}>CURRENT</Text>
                  </View>
                )}
                {isPast && (
                  <View style={[seasonStyles.unlockedChip, { borderColor: r.color + '44' }]}>
                    <Feather name="check" size={9} color={r.color} />
                    <Text style={[seasonStyles.unlockedChipText, { color: r.color }]}>CLAIMED</Text>
                  </View>
                )}
              </View>
              <Text
                style={[seasonStyles.tierTitle, !unlocked && seasonStyles.tierTitleLocked]}
                numberOfLines={1}
              >
                {unlocked ? tier.title : '???'}
              </Text>
              <Text style={seasonStyles.tierSub} numberOfLines={1}>
                {tier.subtitle}
              </Text>
              <View style={seasonStyles.tierMetaRow}>
                <Text
                  style={[seasonStyles.tierXpReq, { color: unlocked ? r.color : colors.button1 }]}
                >
                  {tier.xp === 0 ? 'Starting rank' : `${tier.xp.toLocaleString()} XP`}
                </Text>
                {unlockDate && (
                  <Text style={seasonStyles.tierUnlockDate}>· {formatUnlockDate(unlockDate)}</Text>
                )}
              </View>
            </View>
          </View>
        </Reanimated.View>
      </Pressable>
    </Reanimated.View>
  );
}

// ─── Tier connector (vertical link between tier cards) ────
//
// Lives in the gap between two TierCards, aligned with the
// tier-icon column. Color-grades from the previous tier's
// rarity to the next, with a midpoint diamond node and soft
// tapered ends. The "frontier" connector (last unlocked → next
// locked) pulses to signal the user's next milestone.

function TierConnector({
  fromUnlocked,
  toUnlocked,
  fromColor,
  toColor,
}: {
  fromUnlocked: boolean;
  toUnlocked: boolean;
  fromColor: string;
  toColor: string;
}) {
  const isFrontier = fromUnlocked && !toUnlocked;
  const bothUnlocked = fromUnlocked && toUnlocked;
  const bothLocked = !fromUnlocked && !toUnlocked;
  const lit = !bothLocked;

  // Pulse the frontier gem — "next milestone" beacon. Subtle
  // scintillation rather than a wide bobble; gems shouldn't
  // wobble at small sizes.
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (isFrontier) {
      pulse.value = withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    } else {
      pulse.value = 0;
    }
  }, [isFrontier]);
  const nodeStyle = useAnimatedStyle(() => ({
    opacity: isFrontier ? interpolate(pulse.value, [0, 1], [0.78, 1], Extrapolation.CLAMP) : 1,
    transform: [
      {
        scale: isFrontier ? interpolate(pulse.value, [0, 1], [0.94, 1.06], Extrapolation.CLAMP) : 1,
      },
    ],
  }));

  // Line colors (tapered alpha at edges so the line fades softly
  // out of each card rather than terminating with a hard cut).
  const dim = 'rgba(255,255,255,0.10)';
  const dimEdge = 'rgba(255,255,255,0)';
  const topLine = fromUnlocked ? fromColor : dim;
  const botLine = toUnlocked ? toColor : dim;
  const topEdge = fromUnlocked ? fromColor + '00' : dimEdge;
  const botEdge = toUnlocked ? toColor + '00' : dimEdge;

  // Gem styling — hollow rotated square, rarity color carried
  // entirely by the outline. Locked is a dimmer neutral outline.
  const gemColor = isFrontier ? fromColor : bothUnlocked ? toColor : fromColor;
  const gemBorder = bothLocked ? 'rgba(255,255,255,0.18)' : gemColor;

  return (
    <View pointerEvents="none" style={seasonStyles.tierConnectorWrap}>
      {lit && (
        <>
          <View style={[seasonStyles.tierConnectorGlow4, { backgroundColor: gemColor + '08' }]} />
          <View style={[seasonStyles.tierConnectorGlow3, { backgroundColor: gemColor + '0A' }]} />
          <View style={[seasonStyles.tierConnectorGlow2, { backgroundColor: gemColor + '0C' }]} />
          <View style={[seasonStyles.tierConnectorGlow1, { backgroundColor: gemColor + '0F' }]} />
        </>
      )}
      <LinearGradient
        colors={[topEdge, topLine, botLine, botEdge]}
        locations={[0, 0.18, 0.82, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={seasonStyles.tierConnectorLine}
      />
      <Reanimated.View style={[seasonStyles.tierConnectorNode, nodeStyle]}>
        <MaterialCommunityIcons name="star-four-points" size={22} color={gemBorder} />
      </Reanimated.View>
      <LinearGradient
        colors={[gemBorder, 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={seasonStyles.tierConnectorSideLine}
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={[
            seasonStyles.tierConnectorSideDot,
            {
              left: 26 - i * 5,
              opacity: Math.max(0.15, 1 - i * 0.22),
              backgroundColor: gemBorder,
            },
          ]}
        />
      ))}
    </View>
  );
}

function SeasonBanner() {
  const themedRarity = useThemedRarity();
  const { totalXP, levelInfo, levelTitle } = useXP();
  const { accent } = useAccent();
  // Measured banner height drives PodiumBackdrop's SVG sizing so the
  // topographic curves and dust bands distribute proportionally.
  const [bannerH, setBannerH] = useState(440);

  const daysLeft = Math.max(
    0,
    Math.ceil((SEASON_END.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
  );
  const currentTierIndex = SEASON_TIERS.reduce(
    (best, tier, i) => (totalXP >= tier.xp ? i : best),
    0,
  );
  const currentTier = SEASON_TIERS[currentTierIndex];
  const nextTier = SEASON_TIERS[currentTierIndex + 1];
  const seasonPct = nextTier
    ? Math.min(100, Math.round(((totalXP - currentTier.xp) / (nextTier.xp - currentTier.xp)) * 100))
    : 100;
  const currentRarity = themedRarity[tierToRarity(currentTierIndex)];

  return (
    <Reanimated.View
      entering={FadeIn.duration(260).easing(Easing.out(Easing.quad))}
      style={seasonStyles.banner}
      onLayout={(e) => setBannerH(e.nativeEvent.layout.height)}
    >
      {/* Star/dust backdrop — same component as the leaderboard so the
          two sections share visual identity. Radial mint glow,
          topographic curves, accent stars + three crossfading dust bands. */}
      <PodiumBackdrop height={bannerH} />

      {/* Top row */}
      <View style={seasonStyles.bannerTop}>
        <View
          style={[
            seasonStyles.seasonBadge,
            {
              borderColor: currentRarity.borderActive,
              backgroundColor: currentRarity.color + '14',
            },
          ]}
        >
          <View style={[seasonStyles.seasonBadgeDot, { backgroundColor: currentRarity.color }]} />
          <Text style={[seasonStyles.seasonBadgeText, { color: currentRarity.color }]}>
            SEASON I
          </Text>
        </View>
        <View style={seasonStyles.bannerTopRight}>
          <View
            style={[
              seasonStyles.levelChip,
              { borderColor: accent + '66', backgroundColor: accent + '14' },
            ]}
          >
            <Text style={[seasonStyles.levelChipLabel, { color: accent }]}>LV</Text>
            <Text style={[seasonStyles.levelChipNum, { color: accent }]}>{levelInfo.level}</Text>
          </View>
          <View style={seasonStyles.daysLeftPill}>
            <Feather name="clock" size={11} color={colors.titleText} style={{ marginRight: 4 }} />
            <Text style={seasonStyles.daysLeftNum}>{daysLeft}</Text>
            <Text style={seasonStyles.daysLeftLabel}>d left</Text>
          </View>
        </View>
      </View>

      <Text style={seasonStyles.bannerKicker}>BANNER</Text>
      <Text style={seasonStyles.bannerTitle}>Age of Olympus</Text>

      {/* Current tier hero — ceremonial */}
      <View style={seasonStyles.currentRankRow}>
        <View style={seasonStyles.currentRankPlate}>
          <CurrentTierRing color={currentRarity.color} glow={currentRarity.glow} />
          <View
            style={[
              seasonStyles.currentRankCircle,
              {
                borderColor: currentRarity.color,
                backgroundColor: currentRarity.color + '1A',
                shadowColor: currentRarity.color,
              },
            ]}
          >
            {/* Shimmer pass clipped to the circle disk */}
            <View pointerEvents="none" style={seasonStyles.currentRankShimmerClip}>
              <CurrentTierShimmer />
            </View>
            <Feather
              name={TIER_ICONS[currentTierIndex] ?? 'award'}
              size={24}
              color={currentRarity.color}
            />
            <Text style={[seasonStyles.currentRankNum, { color: currentRarity.color }]}>
              {currentTierIndex + 1}
            </Text>
          </View>
        </View>
        <View style={seasonStyles.currentRankInfo}>
          <View style={seasonStyles.currentRankLabelRow}>
            <Text style={[seasonStyles.currentRankLabel, { color: currentRarity.color }]}>
              CURRENT RANK
            </Text>
            <StarRow count={currentRarity.stars} color={currentRarity.color} />
          </View>
          <Text style={seasonStyles.currentRankTitle} numberOfLines={1}>
            {currentTier.title}
          </Text>
          <Text style={seasonStyles.currentRankSub} numberOfLines={1}>
            {currentTier.subtitle}
          </Text>
        </View>
      </View>

      {/* XP progress bar — tinted by current rarity */}
      <View style={seasonStyles.bannerProgressWrap}>
        <View style={seasonStyles.bannerProgressTrack}>
          <LinearGradient
            colors={[currentRarity.color + '99', currentRarity.color]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[seasonStyles.bannerProgressFill, { width: `${seasonPct}%` as any }]}
          />
        </View>
        <View style={seasonStyles.bannerProgressRow}>
          <Text style={[seasonStyles.bannerXP, { color: currentRarity.color }]}>
            {totalXP.toLocaleString()} XP
          </Text>
          {nextTier ? (
            <Text style={seasonStyles.bannerNext}>
              {nextTier.xp.toLocaleString()}{' '}
              <Text style={{ color: colors.button1 }}>→ {nextTier.title}</Text>
            </Text>
          ) : (
            <Text style={[seasonStyles.bannerNext, { color: currentRarity.color }]}>MAX RANK</Text>
          )}
        </View>
      </View>
    </Reanimated.View>
  );
}

function YourTitlesSection({
  equippedTitle,
  onEquip,
}: {
  equippedTitle: string | null;
  onEquip: (title: string | null) => void;
}) {
  const themedRarity = useThemedRarity();
  const { totalXP } = useXP();
  const [modalOpen, setModalOpen] = useState(false);

  const allUnlocked = SEASON_TIERS.map((t, i) => ({ ...t, _i: i })).filter((t) => totalXP >= t.xp);
  if (allUnlocked.length === 0) return null;

  const visible = allUnlocked.slice(-3).reverse();
  const hasMore = allUnlocked.length > 3;

  return (
    <View style={{ gap: 10 }}>
      <View style={seasonStyles.sectionHeader}>
        <View style={seasonStyles.sectionDot} />
        <Text style={seasonStyles.sectionLabel}>YOUR TITLES</Text>
        <View style={seasonStyles.sectionCountPill}>
          <Text style={seasonStyles.sectionCountText}>{allUnlocked.length}</Text>
        </View>
      </View>

      <View style={seasonStyles.titlesRow}>
        {visible.map((tier, idx) => {
          const r = themedRarity[tierToRarity(tier._i)];
          const isEquipped = equippedTitle === tier.title;
          return (
            <Reanimated.View
              key={tier.title}
              entering={FadeInDown.delay(40 + idx * 50)
                .duration(220)
                .springify()}
            >
              <TitleCard
                tier={tier}
                tierIndex={tier._i}
                rarity={r}
                isEquipped={isEquipped}
                onEquip={() => onEquip(isEquipped ? null : tier.title)}
              />
            </Reanimated.View>
          );
        })}
      </View>

      {hasMore && (
        <Pressable
          style={seasonStyles.seeMoreBtn}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            setModalOpen(true);
          }}
        >
          <Text style={seasonStyles.seeMoreText}>SEE ALL TITLES</Text>
          <Feather name="chevron-right" size={14} color={colors.button1} />
        </Pressable>
      )}

      <AllTitlesModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        tiers={allUnlocked}
        equippedTitle={equippedTitle}
        onEquip={onEquip}
      />
    </View>
  );
}

const RARITY_FILTERS: { key: Rarity | 'all'; label: string }[] = [
  { key: 'all', label: 'ALL' },
  { key: 'legendary', label: 'LEGENDARY' },
  { key: 'epic', label: 'EPIC' },
  { key: 'rare', label: 'RARE' },
  { key: 'uncommon', label: 'UNCOMMON' },
  { key: 'common', label: 'COMMON' },
];

const SEASON_FILTERS: { key: 'all' | 'season-1'; label: string }[] = [
  { key: 'all', label: 'ALL' },
  { key: 'season-1', label: 'SEASON I' },
];

type OpenDropdown = 'rarity' | 'season' | null;

function AllTitlesModal({
  visible,
  onClose,
  tiers,
  equippedTitle,
  onEquip,
}: {
  visible: boolean;
  onClose: () => void;
  tiers: Array<{ title: string; subtitle: string; xp: number; _i: number }>;
  equippedTitle: string | null;
  onEquip: (title: string | null) => void;
}) {
  const themedRarity = useThemedRarity();
  const { accent } = useAccent();
  const [rarityFilter, setRarityFilter] = useState<Rarity | 'all'>('all');
  const [seasonFilter, setSeasonFilter] = useState<'all' | 'season-1'>('all');
  const [query, setQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);

  useEffect(() => {
    if (!visible) {
      setRarityFilter('all');
      setSeasonFilter('all');
      setQuery('');
      setOpenDropdown(null);
    }
  }, [visible]);

  const activeRarity = RARITY_FILTERS.find((f) => f.key === rarityFilter) ?? RARITY_FILTERS[0];
  const activeSeason = SEASON_FILTERS.find((f) => f.key === seasonFilter) ?? SEASON_FILTERS[0];
  const rarityTint = rarityFilter !== 'all' ? themedRarity[rarityFilter].color : accent;
  const seasonTint = accent;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...tiers]
      .reverse()
      .filter((t) => rarityFilter === 'all' || tierToRarity(t._i) === rarityFilter)
      .filter((t) => seasonFilter === 'all' || seasonFilter === 'season-1')
      .filter(
        (t) => !q || t.title.toLowerCase().includes(q) || t.subtitle.toLowerCase().includes(q),
      );
  }, [tiers, rarityFilter, seasonFilter, query]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Reanimated.View
        entering={FadeIn.duration(220).easing(Easing.out(Easing.cubic))}
        exiting={FadeOut.duration(160)}
        style={allTitlesStyles.backdrop}
      >
        <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={allTitlesStyles.card}>
          <View style={allTitlesStyles.header}>
            <View style={allTitlesStyles.closeBtnPlaceholder} />
            <View style={[styles.seasonDividerLine, { backgroundColor: accent + '59' }]} />
            <MaterialCommunityIcons name="star-four-points" size={10} color={accent} />
            <Text style={[styles.seasonDividerText, { color: accent }]}>YOUR TITLES</Text>
            <MaterialCommunityIcons name="star-four-points" size={10} color={accent} />
            <View style={[styles.seasonDividerLine, { backgroundColor: accent + '59' }]} />
            <Pressable onPress={onClose} hitSlop={10} style={allTitlesStyles.closeBtn}>
              <Feather name="x" size={20} color={colors.titleText} />
            </Pressable>
          </View>

          <View style={allTitlesStyles.searchWrap}>
            <Feather name="search" size={14} color={colors.button1} />
            <TextInput
              style={allTitlesStyles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search titles…"
              placeholderTextColor={colors.button1}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Feather name="x-circle" size={14} color={colors.button1} />
              </Pressable>
            )}
          </View>

          <View style={allTitlesStyles.filtersRow}>
            {/* Rarity dropdown */}
            <View style={allTitlesStyles.filterWrap}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setOpenDropdown((d) => (d === 'rarity' ? null : 'rarity'));
                }}
                style={allTitlesStyles.dropdownBtn}
              >
                <Text style={allTitlesStyles.dropdownLabel}>RARITY</Text>
                <View
                  style={[
                    allTitlesStyles.dropdownValuePill,
                    { backgroundColor: rarityTint + '18' },
                  ]}
                >
                  <Text
                    style={[allTitlesStyles.dropdownValueText, { color: rarityTint }]}
                    numberOfLines={1}
                  >
                    {activeRarity.label}
                  </Text>
                </View>
                <Feather
                  name={openDropdown === 'rarity' ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.button1}
                />
              </Pressable>

              {openDropdown === 'rarity' && (
                <Reanimated.View
                  entering={FadeIn.duration(140)}
                  style={allTitlesStyles.dropdownPanel}
                >
                  {RARITY_FILTERS.map((f) => {
                    const isActive = rarityFilter === f.key;
                    const tint = f.key !== 'all' ? themedRarity[f.key].color : accent;
                    return (
                      <Pressable
                        key={f.key}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          setRarityFilter(f.key);
                          setOpenDropdown(null);
                        }}
                        style={[
                          allTitlesStyles.dropdownOption,
                          isActive && { backgroundColor: tint + '14' },
                        ]}
                      >
                        <View
                          style={[allTitlesStyles.dropdownOptionDot, { backgroundColor: tint }]}
                        />
                        <Text
                          style={[
                            allTitlesStyles.dropdownOptionText,
                            { color: isActive ? tint : colors.titleText },
                          ]}
                        >
                          {f.label}
                        </Text>
                        {isActive && <Feather name="check" size={14} color={tint} />}
                      </Pressable>
                    );
                  })}
                </Reanimated.View>
              )}
            </View>

            {/* Season dropdown */}
            <View style={allTitlesStyles.filterWrap}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setOpenDropdown((d) => (d === 'season' ? null : 'season'));
                }}
                style={allTitlesStyles.dropdownBtn}
              >
                <Text style={allTitlesStyles.dropdownLabel}>SEASON</Text>
                <View
                  style={[
                    allTitlesStyles.dropdownValuePill,
                    { backgroundColor: seasonTint + '18' },
                  ]}
                >
                  <Text
                    style={[allTitlesStyles.dropdownValueText, { color: seasonTint }]}
                    numberOfLines={1}
                  >
                    {activeSeason.label}
                  </Text>
                </View>
                <Feather
                  name={openDropdown === 'season' ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={colors.button1}
                />
              </Pressable>

              {openDropdown === 'season' && (
                <Reanimated.View
                  entering={FadeIn.duration(140)}
                  style={allTitlesStyles.dropdownPanel}
                >
                  {SEASON_FILTERS.map((f) => {
                    const isActive = seasonFilter === f.key;
                    return (
                      <Pressable
                        key={f.key}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          setSeasonFilter(f.key);
                          setOpenDropdown(null);
                        }}
                        style={[
                          allTitlesStyles.dropdownOption,
                          isActive && { backgroundColor: seasonTint + '14' },
                        ]}
                      >
                        <View
                          style={[
                            allTitlesStyles.dropdownOptionDot,
                            { backgroundColor: seasonTint },
                          ]}
                        />
                        <Text
                          style={[
                            allTitlesStyles.dropdownOptionText,
                            { color: isActive ? seasonTint : colors.titleText },
                          ]}
                        >
                          {f.label}
                        </Text>
                        {isActive && <Feather name="check" size={14} color={seasonTint} />}
                      </Pressable>
                    );
                  })}
                </Reanimated.View>
              )}
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={allTitlesStyles.grid}
          >
            {filtered.length === 0 ? (
              <View style={allTitlesStyles.emptyWrap}>
                <Feather name="search" size={22} color={colors.button1} />
                <Text style={allTitlesStyles.emptyText}>No titles match your filter</Text>
              </View>
            ) : (
              filtered.map((tier) => {
                const r = themedRarity[tierToRarity(tier._i)];
                const isEquipped = equippedTitle === tier.title;
                return (
                  <TitleCard
                    key={tier.title}
                    tier={tier}
                    tierIndex={tier._i}
                    rarity={r}
                    isEquipped={isEquipped}
                    onEquip={() => onEquip(isEquipped ? null : tier.title)}
                  />
                );
              })
            )}
          </ScrollView>
        </View>
      </Reanimated.View>
    </Modal>
  );
}

function AllRanksSection() {
  const themedRarity = useThemedRarity();
  const { totalXP, xpLog, achievementXP } = useXP();
  const currentTierIndex = SEASON_TIERS.reduce(
    (best, tier, i) => (totalXP >= tier.xp ? i : best),
    0,
  );

  return (
    <>
      <View style={seasonStyles.sectionHeader}>
        <View style={[seasonStyles.sectionDot, { backgroundColor: colors.button1 }]} />
        <Text style={seasonStyles.sectionLabel}>ALL RANKS</Text>
        <View style={seasonStyles.sectionCountPill}>
          <Text style={seasonStyles.sectionCountText}>{SEASON_TIERS.length}</Text>
        </View>
      </View>

      <View style={seasonStyles.tierLadder}>
        {SEASON_TIERS.map((tier, i) => {
          const unlocked = totalXP >= tier.xp;
          const isCurrent = i === currentTierIndex;
          const isPast = unlocked && !isCurrent;
          const unlockDate = unlocked ? getTierUnlockDate(tier.xp, xpLog, achievementXP) : null;
          const prevUnlocked = i > 0 ? totalXP >= SEASON_TIERS[i - 1].xp : false;
          const prevColor = i > 0 ? themedRarity[tierToRarity(i - 1)].color : '#FFFFFF';
          const thisColor = themedRarity[tierToRarity(i)].color;
          return (
            <React.Fragment key={tier.title}>
              {i > 0 && (
                <TierConnector
                  fromUnlocked={prevUnlocked}
                  toUnlocked={unlocked}
                  fromColor={prevColor}
                  toColor={thisColor}
                />
              )}
              <TierCard
                tier={tier}
                index={i}
                unlocked={unlocked}
                isCurrent={isCurrent}
                isPast={isPast}
                unlockDate={unlockDate}
              />
            </React.Fragment>
          );
        })}
      </View>
    </>
  );
}

function SeasonView({
  equippedTitle,
  onEquip,
}: {
  equippedTitle: string | null;
  onEquip: (title: string | null) => void;
}) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={seasonStyles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <SeasonBanner />
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Title card ────────────────────────────────────────────
//
// Small 3-col card mirroring the unlocked-achievement grid. Each
// equipable title shows a tier icon, rarity stars, the title, and
// an "EQUIP" / "EQUIPPED" action label at the base. Tap toggles.

const TITLE_CARD_WIDTH = 104;

function TitleCard({
  tier,
  tierIndex,
  rarity,
  isEquipped,
  onEquip,
}: {
  tier: { title: string; xp: number };
  tierIndex: number;
  rarity: RarityToken;
  isEquipped: boolean;
  onEquip: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onEquip();
      }}
      style={({ pressed }) => [
        titleCardStyles.card,
        {
          borderColor: isEquipped ? rarity.borderActive : rarity.borderIdle,
          backgroundColor: isEquipped ? rarity.color + '2A' : rarity.color + '14',
        },
        pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
      ]}
    >
      <View style={titleCardStyles.starRow}>
        {Array.from({ length: rarity.stars }).map((_, i) => (
          <Text
            key={i}
            style={{
              color: rarity.color,
              fontSize: 11,
              lineHeight: 12,
              marginRight: 1.5,
              opacity: isEquipped ? 1 : 0.95,
            }}
          >
            ★
          </Text>
        ))}
      </View>
      <Text style={titleCardStyles.title} numberOfLines={1}>
        {tier.title}
      </Text>
      <Text
        style={[titleCardStyles.action, { color: isEquipped ? rarity.color : rarity.color + 'AA' }]}
      >
        {isEquipped ? 'EQUIPPED' : 'EQUIP'}
      </Text>
    </Pressable>
  );
}

const titleCardStyles = StyleSheet.create({
  card: {
    width: TITLE_CARD_WIDTH,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.titleText,
    textAlign: 'center',
    lineHeight: 14,
    minHeight: 14,
  },
  action: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
});

// ─── Loading silhouette ───────────────────────────────────
// Mirrors the Achievements tab silhouette: tab bar, season banner
// block, divider, then a 3-up hex card grid.

function AchievementsSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={achStyles.header}>
        <Skeleton height={32} radius={10} />
      </View>
      <View style={{ padding: 16, gap: 14 }}>
        {/* Season banner block */}
        <Skeleton height={170} radius={16} />
        {/* Section divider */}
        <View style={{ alignItems: 'center', paddingVertical: 6 }}>
          <Skeleton width={180} height={13} radius={3} />
        </View>
        {/* Rarity filter bar */}
        <Skeleton height={42} radius={10} />
        {/* Unlocked grid header */}
        <Skeleton width={140} height={14} radius={3} style={{ marginTop: 4 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <SkeletonHexCard size={HEX_CARD_WIDTH} />
          <SkeletonHexCard size={HEX_CARD_WIDTH} />
          <SkeletonHexCard size={HEX_CARD_WIDTH} />
        </View>
        {/* Locked list header */}
        <Skeleton width={120} height={14} radius={3} style={{ marginTop: 8 }} />
        <Skeleton height={68} radius={12} />
        <Skeleton height={68} radius={12} />
      </View>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────

const AchievementsScreen: React.FC = () => {
  const { contentMaxWidth, isWide, width: winW } = useResponsive();
  // Reactive pager/page width — the module-level SCREEN_WIDTH is read once
  // at app load, so pages overflow when the window has resized since then.
  const pagerW = getContentWidth(winW);
  // On wide web, center the screen in the content column. Height comes from
  // flex:1 (matching AnalyticsScreen) — the pager row below must use `flex: 1`
  // (not `flexGrow: 1`) for the per-page ScrollViews to get bounded heights.
  const rootStyle = contentMaxWidth
    ? {
        flex: 1 as const,
        width: '100%' as const,
        maxWidth: contentMaxWidth,
        alignSelf: 'center' as const,
        backgroundColor: colors.background,
      }
    : { flex: 1 as const, backgroundColor: colors.background };
  // On wide web the sub-tabs live in the side rail; read the selected one
  // from the `tab` route param instead of the in-screen pill bar.
  const route = useRoute<RouteProp<RootTabParamList, 'Achievements'>>();
  const { workouts, isLoading: workoutsLoading } = useWorkouts();
  const { session: authSession } = useAuth();
  const [allSessions, setAllSessions] = useState<WorkoutSession[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const { equippedSeasonTitle, equipSeasonTitle } = useSettings();
  const { accent } = useAccent();

  // ── pager ──────────────────────────────────────────────────
  const [tabIndex, setTabIndex] = useState(0);
  const tabIndexRef = useRef(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const dragStartValue = useRef(0);
  const isHorizontal = useRef(false);

  const snapToIndex = useCallback(
    (index: number, velocityX = 0) => {
      tabIndexRef.current = index;
      setTabIndex(index);
      Animated.spring(translateX, {
        toValue: -index * pagerW,
        useNativeDriver: true,
        velocity: -velocityX,
        tension: 68,
        friction: 11,
        overshootClamping: false,
      }).start();
    },
    [translateX, pagerW],
  );

  // Drive the pager from the side-rail sub-tab param on wide web.
  const railTab = route.params?.tab;
  useEffect(() => {
    if (isWide && typeof railTab === 'number') snapToIndex(railTab);
  }, [railTab, isWide, snapToIndex]);

  // Keep the active page aligned when the window (and so pagerW) resizes.
  useEffect(() => {
    translateX.setValue(-tabIndexRef.current * pagerW);
  }, [pagerW, translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, gs) => {
        const horizontal = Math.abs(gs.dx) > Math.abs(gs.dy) * 1.8 && Math.abs(gs.dx) > 8;
        isHorizontal.current = horizontal;
        return horizontal;
      },
      onPanResponderGrant: () => {
        translateX.stopAnimation((v) => {
          dragStartValue.current = v;
        });
        isHorizontal.current = false;
      },
      onPanResponderMove: (_e, gs) => {
        if (!isHorizontal.current) return;
        const idx = tabIndexRef.current;
        let dx = gs.dx;
        if ((idx === 0 && dx > 0) || (idx === TAB_COUNT - 1 && dx < 0)) dx *= 0.15;
        translateX.setValue(dragStartValue.current + dx);
      },
      onPanResponderRelease: (_e, gs) => {
        const { dx, vx } = gs;
        const idx = tabIndexRef.current;
        const goNext = dx < -SWIPE_DISTANCE_THRESHOLD || vx < -SWIPE_VELOCITY_THRESHOLD;
        const goPrev = dx > SWIPE_DISTANCE_THRESHOLD || vx > SWIPE_VELOCITY_THRESHOLD;
        if (goNext && idx < TAB_COUNT - 1) snapToIndex(idx + 1, vx);
        else if (goPrev && idx > 0) snapToIndex(idx - 1, vx);
        else snapToIndex(idx, vx);
      },
      onPanResponderTerminate: () => {
        snapToIndex(tabIndexRef.current, 0);
      },
    }),
  ).current;

  useFocusEffect(
    useCallback(() => {
      const userId = authSession?.user.id;
      if (!userId) {
        setSessionsLoaded(true);
        return;
      }
      sbLoadAllSessions(userId)
        .then((s) => {
          setAllSessions(s);
          setSessionsLoaded(true);
        })
        .catch((e) => {
          console.error('AchievementsScreen: failed to load sessions', e);
          setSessionsLoaded(true);
        });
    }, [authSession?.user.id]),
  );

  const isInitialLoad = workoutsLoading || !sessionsLoaded;

  const totalSessions = allSessions.length;
  const currentStreak = getCurrentStreak(allSessions);
  const longestStreak = getLongestStreak(allSessions);
  const uniqueDays = new Set(allSessions.map((s) => dayKey(new Date(s.date)))).size;

  let totalVolume = 0;
  const exerciseNames = new Set<string>();
  let hasMarathon = false;
  let earlyLateCount = 0;
  const maxKgByExercise: Record<string, number> = {};
  let prCount = 0;
  // Per-muscle aggregates (working sets + kg×reps volume) used by the
  // muscle-milestone + penalty-badge achievements below.
  const setsByMuscle: Record<string, number> = {};
  const volumeByMuscle: Record<string, number> = {};
  let totalWorkingSets = 0;
  let benchSets = 0;
  let cardioSets = 0; // any set carrying minutes/seconds/meters
  // Week → session count, used by Eternal Flame's 52-week consistency streak.
  const sessionsByWeek = new Map<number, number>();

  for (const s of allSessions) {
    if (s.duration > 5400) hasMarathon = true;
    const d = new Date(s.date);
    const hour = d.getHours();
    if (hour < 8 || hour >= 20) earlyLateCount++;
    // Week index from a fixed Monday epoch (1970-01-05) so weeks land on real
    // calendar weeks regardless of timezone drift.
    const wk = Math.floor((d.getTime() - Date.UTC(1970, 0, 5)) / (7 * 86400000));
    sessionsByWeek.set(wk, (sessionsByWeek.get(wk) ?? 0) + 1);
    for (const ex of s.exercises) {
      if (ex.name === 'Warm-up' || ex.name === 'Cooldown') continue;
      exerciseNames.add(ex.name);
      const muscle = muscleForExercise(ex.name);
      const lowerName = ex.name.toLowerCase();
      const isBench = lowerName.includes('bench');
      for (const set of ex.sets) {
        if (set.label === 'W') continue;
        totalWorkingSets++;
        if (set.minutes != null || set.seconds != null || set.meters != null) cardioSets++;
        if (isBench) benchSets++;
        const kg = set.kg ?? 0;
        const setVolume = kg * (set.reps ?? 0);
        totalVolume += setVolume;
        if (muscle) {
          setsByMuscle[muscle] = (setsByMuscle[muscle] ?? 0) + 1;
          volumeByMuscle[muscle] = (volumeByMuscle[muscle] ?? 0) + setVolume;
        }
        if (kg > (maxKgByExercise[ex.name] ?? 0)) {
          if (maxKgByExercise[ex.name] !== undefined) prCount++;
          maxKgByExercise[ex.name] = kg;
        }
      }
    }
  }

  // ── Derived muscle aggregates ──────────────────────────────────────────────
  const MUSCLE_GROUPS = [
    'Chest',
    'Back',
    'Shoulders',
    'Hamstrings',
    'Triceps',
    'Biceps',
    'Glutes',
    'Quads',
    'Calves',
    'Core',
  ] as const;
  const chestSets = setsByMuscle.Chest ?? 0;
  const backSets = setsByMuscle.Back ?? 0;
  const shouldersSets = setsByMuscle.Shoulders ?? 0;
  const coreSets = setsByMuscle.Core ?? 0;
  const armSets = (setsByMuscle.Biceps ?? 0) + (setsByMuscle.Triceps ?? 0);
  const legSets =
    (setsByMuscle.Quads ?? 0) +
    (setsByMuscle.Hamstrings ?? 0) +
    (setsByMuscle.Glutes ?? 0) +
    (setsByMuscle.Calves ?? 0);
  const chestVolume = volumeByMuscle.Chest ?? 0;
  // Vitruvian — count of muscle groups with ≥30 working sets (target: all 10)
  const vitruvianCount = MUSCLE_GROUPS.filter((m) => (setsByMuscle[m] ?? 0) >= 30).length;
  // Balanced Beast — count of muscles each contributing ≥10% of total sets
  const balancedCount =
    totalWorkingSets > 0
      ? MUSCLE_GROUPS.filter((m) => (setsByMuscle[m] ?? 0) / totalWorkingSets >= 0.1).length
      : 0;
  // Penalty-badge conditions (mirror-muscle = chest+biceps heavy / back+legs light)
  const visibleMuscleShare =
    totalWorkingSets > 0 ? (chestSets + (setsByMuscle.Biceps ?? 0)) / totalWorkingSets : 0;
  const neglectedShare = totalWorkingSets > 0 ? (backSets + legSets) / totalWorkingSets : 0;
  const legShare = totalWorkingSets > 0 ? legSets / totalWorkingSets : 0;

  // ── Eternal Flame — longest run of consecutive weeks with ≥2 sessions ──
  let longestWeeklyRun = 0;
  if (sessionsByWeek.size > 0) {
    const weekKeys = Array.from(sessionsByWeek.keys()).sort((a, b) => a - b);
    const firstW = weekKeys[0];
    const lastW = weekKeys[weekKeys.length - 1];
    let run = 0;
    for (let w = firstW; w <= lastW; w++) {
      if ((sessionsByWeek.get(w) ?? 0) >= 2) {
        run++;
        if (run > longestWeeklyRun) longestWeeklyRun = run;
      } else {
        run = 0;
      }
    }
  }

  const achievements: Achievement[] = [
    {
      id: 'first',
      title: 'First Rep',
      description: 'Complete your first workout',
      icon: 'activity',
      unlocked: totalSessions >= 1,
      xp: 25,
      progress: totalSessions,
      target: 1,
    },
    {
      id: '10sessions',
      title: 'Getting Serious',
      description: 'Log 10 workout sessions',
      icon: 'zap',
      unlocked: totalSessions >= 10,
      xp: 50,
      progress: totalSessions,
      target: 10,
    },
    {
      id: '50sessions',
      title: 'Dedicated Athlete',
      description: 'Log 50 workout sessions',
      icon: 'award',
      unlocked: totalSessions >= 50,
      xp: 150,
      progress: totalSessions,
      target: 50,
    },
    {
      id: '100sessions',
      title: 'Century Club',
      description: 'Log 100 workout sessions',
      icon: 'star',
      unlocked: totalSessions >= 100,
      xp: 300,
      progress: totalSessions,
      target: 100,
    },
    {
      id: 'streak3',
      title: 'On Fire',
      description: 'Maintain a 3-day streak',
      icon: 'trending-up',
      unlocked: currentStreak >= 3,
      xp: 30,
      progress: currentStreak,
      target: 3,
    },
    {
      id: 'streak7',
      title: 'Week Warrior',
      description: '7-day longest streak',
      icon: 'calendar',
      unlocked: longestStreak >= 7,
      xp: 75,
      progress: longestStreak,
      target: 7,
    },
    {
      id: 'streak30',
      title: 'Month of Iron',
      description: '30-day longest streak',
      icon: 'sun',
      unlocked: longestStreak >= 30,
      xp: 200,
      progress: longestStreak,
      target: 30,
    },
    {
      id: 'volume10k',
      title: 'Mover of Iron',
      description: 'Lift 10,000 kg total',
      icon: 'layers',
      unlocked: totalVolume >= 10000,
      xp: 50,
      progress: Math.round(totalVolume),
      target: 10000,
    },
    {
      id: 'volume100k',
      title: 'Iron Giant',
      description: 'Lift 100,000 kg total',
      icon: 'shield',
      unlocked: totalVolume >= 100000,
      xp: 150,
      progress: Math.round(totalVolume),
      target: 100000,
    },
    {
      id: 'volume500k',
      title: 'Titan',
      description: 'Lift 500,000 kg total',
      icon: 'hexagon',
      unlocked: totalVolume >= 500000,
      xp: 300,
      progress: Math.round(totalVolume),
      target: 500000,
    },
    {
      id: 'consistency30',
      title: 'Creature of Habit',
      description: 'Train on 30 distinct days',
      icon: 'repeat',
      unlocked: uniqueDays >= 30,
      xp: 75,
      progress: uniqueDays,
      target: 30,
    },
    {
      id: 'early_late',
      title: 'Dedicated Hours',
      description: '10 sessions before 8am or after 8pm',
      icon: 'moon',
      unlocked: earlyLateCount >= 10,
      xp: 40,
      progress: earlyLateCount,
      target: 10,
    },
    {
      id: 'variety',
      title: 'Variety Pack',
      description: 'Use 10 different exercises',
      icon: 'grid',
      unlocked: exerciseNames.size >= 10,
      xp: 50,
      progress: exerciseNames.size,
      target: 10,
    },
    {
      id: 'pr5',
      title: 'PR Hunter',
      description: 'Set 5 personal records',
      icon: 'target',
      unlocked: prCount >= 5,
      xp: 75,
      progress: prCount,
      target: 5,
    },
    {
      id: 'marathon',
      title: 'Marathon',
      description: 'Single session over 90 minutes',
      icon: 'watch',
      unlocked: hasMarathon,
      xp: 40,
      progress: hasMarathon ? 1 : 0,
      target: 1,
    },

    // ── Bucket 1: muscle milestones ─────────────────────────────────────────
    {
      id: 'chest-100',
      title: 'Chest Master',
      description: '100 working sets on chest exercises',
      icon: 'target',
      unlocked: chestSets >= 100,
      xp: 40,
      progress: chestSets,
      target: 100,
    },
    {
      id: 'glutes-100',
      title: 'Glute Master',
      description: '100 working sets on glute exercises',
      icon: 'octagon',
      unlocked: (setsByMuscle.Glutes ?? 0) >= 100,
      xp: 40,
      progress: setsByMuscle.Glutes ?? 0,
      target: 100,
    },
    {
      id: 'back-120',
      title: 'Back Fortress',
      description: '120 working sets on back exercises',
      icon: 'shield',
      unlocked: backSets >= 120,
      xp: 45,
      progress: backSets,
      target: 120,
    },
    {
      id: 'legs-80',
      title: 'Leg Day Devotee',
      description: '80 working sets across quads, hamstrings, glutes & calves',
      icon: 'zap',
      unlocked: legSets >= 80,
      xp: 45,
      progress: legSets,
      target: 80,
    },
    {
      id: 'shoulders-60',
      title: 'Shoulder Garrison',
      description: '60 working sets on shoulder exercises',
      icon: 'trending-up',
      unlocked: shouldersSets >= 60,
      xp: 75,
      progress: shouldersSets,
      target: 60,
    },
    {
      id: 'arms-100',
      title: 'Arm Sculptor',
      description: '100 working sets across biceps & triceps',
      icon: 'feather',
      unlocked: armSets >= 100,
      xp: 75,
      progress: armSets,
      target: 100,
    },
    {
      id: 'core-50',
      title: 'Core Fortress',
      description: '50 working sets on core exercises',
      icon: 'anchor',
      unlocked: coreSets >= 50,
      xp: 60,
      progress: coreSets,
      target: 50,
    },
    {
      id: 'chest-volume-50k',
      title: 'Chest Volume Titan',
      description: 'Move 50,000 kg of chest volume',
      icon: 'layers',
      unlocked: chestVolume >= 50000,
      xp: 125,
      progress: Math.round(chestVolume),
      target: 50000,
    },
    {
      id: 'vitruvian',
      title: 'Vitruvian Lifter',
      description: 'Reach 30+ working sets on every one of the 10 muscle groups',
      icon: 'award',
      unlocked: vitruvianCount >= 10,
      xp: 150,
      progress: vitruvianCount,
      target: 10,
    },
    {
      id: 'balanced',
      title: 'Balanced Beast',
      description: 'Every muscle group accounts for at least 10% of your total working sets',
      icon: 'grid',
      unlocked: balancedCount >= 10,
      xp: 175,
      progress: balancedCount,
      target: 10,
    },

    // ── Bucket 2: penalty / nudge badges (active while behaviour fits) ──────
    // These re-evaluate every render; training the neglected muscle "revokes"
    // the badge naturally. Phrased as specialisation, not shaming.
    {
      id: 'chicken-legs',
      title: 'Chicken Legs',
      description: '100+ sessions logged with less than 5% of working sets on legs',
      icon: 'feather',
      unlocked: totalSessions >= 100 && legShare < 0.05,
      xp: 20,
      progress: totalSessions >= 100 && legShare < 0.05 ? 1 : 0,
      target: 1,
    },
    {
      id: 'glass-cannon',
      title: 'Glass Cannon',
      description: '50+ bench sets but fewer than 20 back sets — front-loaded power',
      icon: 'zap',
      unlocked: benchSets >= 50 && backSets < 20,
      xp: 25,
      progress: benchSets >= 50 && backSets < 20 ? 1 : 0,
      target: 1,
    },
    {
      id: 'mirror-muscle',
      title: 'Mirror Muscle Society',
      description: 'Chest + biceps make up 60%+ of your sets while back + legs sit under 20%',
      icon: 'eye',
      unlocked: totalWorkingSets > 0 && visibleMuscleShare >= 0.6 && neglectedShare < 0.2,
      xp: 30,
      progress: totalWorkingSets > 0 && visibleMuscleShare >= 0.6 && neglectedShare < 0.2 ? 1 : 0,
      target: 1,
    },
    {
      id: 'cardio-phobic',
      title: 'Cardio Phobic',
      description: '50+ sessions logged with zero timed or distance sets',
      icon: 'wind',
      unlocked: totalSessions >= 50 && cardioSets === 0,
      xp: 20,
      progress: totalSessions >= 50 && cardioSets === 0 ? 1 : 0,
      target: 1,
    },
    {
      id: 'core-neglect',
      title: 'Forgotten Foundation',
      description: '75+ sessions logged with fewer than 10 core sets',
      icon: 'anchor',
      unlocked: totalSessions >= 75 && coreSets < 10,
      xp: 30,
      progress: totalSessions >= 75 && coreSets < 10 ? 1 : 0,
      target: 1,
    },

    // ── Bucket 3: grindy lifetime stretch goals ─────────────────────────────
    {
      id: '365-days',
      title: 'A Full Year',
      description: 'Train on 365 unique calendar days (not consecutive)',
      icon: 'calendar',
      unlocked: uniqueDays >= 365,
      xp: 200,
      progress: uniqueDays,
      target: 365,
    },
    {
      id: '100k-sets',
      title: 'Hundred Thousand',
      description: 'Complete 100,000 working sets',
      icon: 'layers',
      unlocked: totalWorkingSets >= 100000,
      xp: 175,
      progress: totalWorkingSets,
      target: 100000,
    },
    {
      id: 'blue-whale',
      title: 'Lifted the Ocean',
      description: '150,000 kg total volume — the weight of a blue whale',
      icon: 'droplet',
      unlocked: totalVolume >= 150000,
      xp: 175,
      progress: Math.round(totalVolume),
      target: 150000,
    },
    {
      id: 'boeing-747',
      title: 'Lifted the Plane',
      description: '412,775 kg total volume — the empty weight of a Boeing 747',
      icon: 'zap',
      unlocked: totalVolume >= 412775,
      xp: 250,
      progress: Math.round(totalVolume),
      target: 412775,
    },
    {
      id: '1000-sessions',
      title: 'Ironclad',
      description: 'Complete 1,000 workout sessions',
      icon: 'star',
      unlocked: totalSessions >= 1000,
      xp: 500,
      progress: totalSessions,
      target: 1000,
    },
    {
      id: 'eternal-flame',
      title: 'Eternal Flame',
      description: '52 consecutive weeks with at least 2 sessions per week',
      icon: 'sun',
      unlocked: longestWeeklyRun >= 52,
      xp: 500,
      progress: longestWeeklyRun,
      target: 52,
    },
    {
      id: '10m-volume',
      title: 'Lifted the Whale',
      description: 'Move 10,000,000 kg of lifetime volume',
      icon: 'hexagon',
      unlocked: totalVolume >= 10000000,
      xp: 600,
      progress: Math.round(totalVolume),
      target: 10000000,
    },
  ];

  // ── Rarity filter ──
  const [filter, setFilter] = useState<Rarity | 'all'>('all');

  // Count by rarity (across all achievements regardless of unlocked status)
  const counts = useMemo<Record<Rarity | 'all', number>>(() => {
    const c: Record<Rarity | 'all', number> = {
      all: achievements.length,
      legendary: 0,
      epic: 0,
      rare: 0,
      uncommon: 0,
      common: 0,
    };
    for (const a of achievements) c[rarityFromXP(a.xp)]++;
    return c;
  }, [achievements]);

  const filtered = useMemo(
    () =>
      filter === 'all' ? achievements : achievements.filter((a) => rarityFromXP(a.xp) === filter),
    [filter, achievements],
  );

  // Sort: unlocked legendaries first by rarity descending, then locked by rarity descending
  const rarityRank: Record<Rarity, number> = {
    legendary: 0,
    epic: 1,
    rare: 2,
    uncommon: 3,
    common: 4,
  };
  const unlocked = useMemo(
    () =>
      filtered
        .filter((a) => a.unlocked)
        .sort((a, b) => rarityRank[rarityFromXP(a.xp)] - rarityRank[rarityFromXP(b.xp)]),
    [filtered],
  );
  const locked = useMemo(
    () =>
      filtered
        .filter((a) => !a.unlocked)
        .sort((a, b) => rarityRank[rarityFromXP(a.xp)] - rarityRank[rarityFromXP(b.xp)]),
    [filtered],
  );

  const UNLOCKED_VISIBLE = 3;
  const LOCKED_VISIBLE = 5;
  const [unlockedExpanded, setUnlockedExpanded] = useState(false);
  const [lockedExpanded, setLockedExpanded] = useState(false);
  const [seasonOpen, setSeasonOpen] = useState(true);
  const [lifetimeOpen, setLifetimeOpen] = useState(true);

  const visibleUnlocked = unlockedExpanded ? unlocked : unlocked.slice(0, UNLOCKED_VISIBLE);
  const visibleLocked = lockedExpanded ? locked : locked.slice(0, LOCKED_VISIBLE);

  // ── Detail modal ──
  const [selected, setSelected] = useState<Achievement | null>(null);

  if (useStableLoading(isInitialLoad)) return <AchievementsSkeleton />;

  return (
    <View style={rootStyle}>
      {/* ── Header ─────────────────────────────────────────── */}
      {/* On wide web the sub-tabs live in the side rail, so the in-screen
          pill bar is hidden. */}
      {!isWide && (
        <View style={achStyles.header}>
          {/* ── Tab bar + dots ─────────────────────────────────── */}
          <SwipeTabs
            tabs={[...TAB_LABELS]}
            translateX={translateX}
            screenWidth={pagerW}
            activeIndex={tabIndex}
            onTabPress={snapToIndex}
          />
        </View>
      )}
      {/* end header */}

      {/* ── Pager ──────────────────────────────────────────── */}
      {/* Swipe is disabled on wide web — the rail drives the sub-tab. */}
      <View style={{ flex: 1, minHeight: 0, overflow: 'hidden' }} {...(isWide ? {} : panResponder.panHandlers)}>
        <Animated.View
          style={{
            flex: 1,
            flexDirection: 'row',
            width: pagerW * TAB_COUNT,
            transform: [{ translateX }],
          }}
        >
          {/* Page 0 — Achievements */}
          <View style={{ width: pagerW, flex: 1, minHeight: 0 }}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.scroll}
              showsVerticalScrollIndicator={false}
            >
              <SeasonBanner />

              <Pressable
                style={styles.seasonDivider}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setSeasonOpen((o) => !o);
                }}
              >
                <View style={styles.seasonDividerSpacer} />
                <View style={[styles.seasonDividerLine, { backgroundColor: accent + '59' }]} />
                <MaterialCommunityIcons name="star-four-points" size={10} color={accent} />
                <Text style={[styles.seasonDividerText, { color: accent }]}>CURRENT SEASON</Text>
                <MaterialCommunityIcons name="star-four-points" size={10} color={accent} />
                <View style={[styles.seasonDividerLine, { backgroundColor: accent + '59' }]} />
                <Feather
                  name={seasonOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={accent}
                />
              </Pressable>

              {seasonOpen && (
                <>
                  <YourTitlesSection
                    equippedTitle={equippedSeasonTitle}
                    onEquip={equipSeasonTitle}
                  />
                  <AllRanksSection />
                </>
              )}

              <Pressable
                style={styles.seasonDivider}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setLifetimeOpen((o) => !o);
                }}
              >
                <View style={styles.seasonDividerSpacer} />
                <View style={[styles.seasonDividerLine, { backgroundColor: accent + '59' }]} />
                <MaterialCommunityIcons name="star-four-points" size={10} color={accent} />
                <Text style={[styles.seasonDividerText, { color: accent }]}>
                  LIFETIME ACHIEVEMENTS
                </Text>
                <MaterialCommunityIcons name="star-four-points" size={10} color={accent} />
                <View style={[styles.seasonDividerLine, { backgroundColor: accent + '59' }]} />
                <Feather
                  name={lifetimeOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={accent}
                />
              </Pressable>

              {lifetimeOpen && (
                <>
                  {/* Rarity filter */}
                  <Reanimated.View entering={FadeIn.delay(80).duration(220)}>
                    <RarityFilterBar active={filter} onChange={setFilter} counts={counts} />
                  </Reanimated.View>

                  {unlocked.length > 0 && (
                    <View style={[styles.section, styles.sectionContainer]}>
                      <Reanimated.View
                        entering={SlideInRight.duration(220).easing(Easing.out(Easing.quad))}
                        style={styles.sectionHeader}
                      >
                        <View style={styles.sectionHeaderLeft}>
                          <View style={[styles.sectionDot, { backgroundColor: accent }]} />
                          <Text style={styles.sectionTitle}>Obtained</Text>
                        </View>
                        <View style={styles.sectionCountPill}>
                          <Text style={styles.sectionCountText}>{unlocked.length}</Text>
                        </View>
                      </Reanimated.View>
                      <View style={hexCardStyles.grid}>
                        {visibleUnlocked.map((a, i) => (
                          <UnlockedHexCard
                            key={a.id}
                            achievement={a}
                            index={i}
                            onPress={setSelected}
                          />
                        ))}
                      </View>
                      {unlocked.length > UNLOCKED_VISIBLE && (
                        <TouchableOpacity
                          style={styles.expandBtn}
                          onPress={() => {
                            Haptics.selectionAsync().catch(() => {});
                            setUnlockedExpanded((e) => !e);
                          }}
                          activeOpacity={0.7}
                        >
                          <Feather
                            name={unlockedExpanded ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color={colors.button1}
                          />
                          <Text style={styles.expandLabel}>
                            {unlockedExpanded
                              ? 'Show less'
                              : `${unlocked.length - UNLOCKED_VISIBLE} more`}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {locked.length > 0 && (
                    <View style={styles.section}>
                      <Reanimated.View
                        entering={SlideInRight.delay(80)
                          .duration(220)
                          .easing(Easing.out(Easing.quad))}
                        style={styles.sectionHeader}
                      >
                        <View style={styles.sectionHeaderLeft}>
                          <View style={[styles.sectionDot, { backgroundColor: colors.button1 }]} />
                          <Text style={styles.sectionTitle}>Locked</Text>
                        </View>
                        <View style={styles.sectionCountPill}>
                          <Text style={styles.sectionCountText}>{locked.length}</Text>
                        </View>
                      </Reanimated.View>
                      {visibleLocked.map((a, i) => (
                        <AchievementCard
                          key={a.id}
                          achievement={a}
                          index={i}
                          onPress={setSelected}
                        />
                      ))}
                      {locked.length > LOCKED_VISIBLE && (
                        <TouchableOpacity
                          style={styles.expandBtn}
                          onPress={() => {
                            Haptics.selectionAsync().catch(() => {});
                            setLockedExpanded((e) => !e);
                          }}
                          activeOpacity={0.7}
                        >
                          <Feather
                            name={lockedExpanded ? 'chevron-up' : 'chevron-down'}
                            size={16}
                            color={colors.button1}
                          />
                          <Text style={styles.expandLabel}>
                            {lockedExpanded
                              ? 'Show less'
                              : `${locked.length - LOCKED_VISIBLE} more`}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>

          {/* Page 1 — Leaderboard */}
          <View style={{ width: pagerW, flex: 1, minHeight: 0 }}>
            <LeaderboardView />
          </View>

          {/* Page 2 — Store */}
          <View style={{ width: pagerW, flex: 1, minHeight: 0 }}>
            <StoreView />
          </View>
        </Animated.View>
      </View>

      <DetailModal achievement={selected} onClose={() => setSelected(null)} />
    </View>
  );
};

// ─── styles ────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingTop: 20, gap: 14 },

  // section
  section: { gap: 10 },
  sectionContainer: {
    backgroundColor: colors.container,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E5E5E5',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  sectionCountPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  sectionCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.titleText,
    letterSpacing: 0.4,
  },

  // expand button
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  expandLabel: { fontSize: 12, fontWeight: '600', color: colors.button1 },

  // stylized season divider title
  seasonDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 2,
  },
  seasonDividerLine: {
    flex: 1,
    maxWidth: 56,
    height: 1,
    // backgroundColor applied inline using the active accent.
  },
  seasonDividerText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.accent,
    letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  seasonDividerSpacer: {
    width: 16,
    height: 16,
  },
});

// ─── Leaderboard region design tokens ───────────────────
//
// Local-only color anchors. The project already uses these three
// gray values across the file; naming them at the leaderboard
// region locks pass 3's motion targets to a stable vocabulary
// without modifying theme/colors.ts. Used by both leaderboardStyles
// and youStandingStyles below.
const LEADER_TEXT_PRIMARY = '#F4F4F4';
const LEADER_TEXT_BODY = '#E5E5E5';
const LEADER_TEXT_MUTED = '#9F9F9F';
const LEADER_TRACK_BG = 'rgba(255,255,255,0.06)';

// Typography atoms — every Text style in the Your Standing card
// composes one of these so we keep a finite, intentional ladder.
// 6 reusable roles cover the entire leaderboard tab. The `as const`
// satisfiers narrow string-literal unions for fontWeight / textTransform
// / fontStyle so StyleSheet.create accepts the spread.
const LEADER_TYPE = {
  // Big numeric display — rank num, primary stat. Tabular for stable
  // alignment as numbers change.
  displayNum: {
    fontSize: 24,
    fontWeight: '900' as const,
    letterSpacing: 0.4,
    lineHeight: 26,
    fontVariant: ['tabular-nums'] as ['tabular-nums'],
  },
  // Hero word — "YOU". Reads as the identity label.
  identityWord: {
    fontSize: 16,
    fontWeight: '900' as const,
    letterSpacing: 0.4,
  },
  // Body number — secondary XP readout.
  bodyNum: {
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 0.4,
    fontVariant: ['tabular-nums'] as ['tabular-nums'],
  },
  // Caption — title, secondary copy. Italic to read as voice.
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
    fontStyle: 'italic' as const,
  },
  // Kicker — micro-cap headline. The voice of the card state.
  kicker: {
    fontSize: 10,
    fontWeight: '900' as const,
    letterSpacing: 1.6,
    textTransform: 'uppercase' as const,
  },
  // Meta — unit suffixes, rank-of, primary stat label.
  meta: {
    fontSize: 9,
    fontWeight: '800' as const,
    letterSpacing: 0.8,
  },
};

// ─── Leaderboard scope + section styles ─────────────────
//
// Spacing locked to a 4-pixel baseline grid: 4/8/12/16. The
// scope and section headers share the same dot+label+count
// rhythm so the Leaderboard scans as one design family with
// the Achievements / Season tabs.
const leaderboardStyles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingTop: 20,
    // Clear the sticky standing bar that sits docked to the tab nav.
    // Card is ~59px tall + 2px hairline = ~61px occupied. A bit of
    // breathing above means the last list row sits just above the card
    // top when fully scrolled; the 28px fade strip transitions that
    // final content into the bar as the user scrolls.
    paddingBottom: 74,
    gap: 20, // section rhythm — generous enough to read as discrete blocks.
  },

  // ── Period toggle (compact, no longer full-width) ────────
  // The active state is rendered by a sliding underlay (see
  // ModePillBar) — the pills themselves are transparent triggers.
  // Period toggle — visual language mirrors the SwipeTabs at the
  // top of the screen: same colors.button3 bar, colors.background
  // active pill, subtle 6% white border on the active state. Sized
  // a tick smaller than the top tabs so it nests inside a section
  // header without dominating it.
  modePillBar: {
    flexDirection: 'row',
    backgroundColor: colors.button3,
    borderRadius: 999,
    padding: 2,
    position: 'relative',
  },
  modePill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  // Absolutely positioned underlay — fixed-width sibling that
  // translates between two equal-sized pill slots. Mirrors the
  // SwipeTabs tab indicator: translateX only, no width morph.
  // Border tone matches SwipeTabs.tabPill so the two pills read as
  // siblings in the same family.
  modePillUnderlay: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    backgroundColor: colors.background,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  modePillText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  // Round add-friend button — sized to match the modePillBar's
  // visual height so the row reads as a single cluster of controls.
  addFriendBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.button3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Section block (podium / rivals) ──────────────────────
  // Same dot+label+count rhythm the Achievements tab uses so
  // the Leaderboard reads as part of the same family.
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: LEADER_TEXT_BODY,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  sectionCountPill: {
    backgroundColor: LEADER_TRACK_BG,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  sectionCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.titleText,
    letterSpacing: 0.4,
    fontVariant: ['tabular-nums'],
  },
  sectionMeta: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.button1,
    letterSpacing: 0.4,
    marginLeft: 4,
    fontVariant: ['tabular-nums'],
  },
});

const topShowcaseStyles = StyleSheet.create({
  // ── Card shell ─────────────────────────────────────────
  // Border tinted with the legendary tier idle stroke so the card
  // inherits a quiet gold identity even before the slots populate.
  card: {
    borderRadius: 18,
    paddingTop: 16,
    paddingBottom: 20, // 4-grid aligned (was 22)
    paddingHorizontal: 12, // 4-grid aligned (was 10)
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: RARITY.legendary.borderIdle,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
  },
  // Outer slot — handles entrance translation, marginTop podium step.
  slot: {
    alignItems: 'center',
    flex: 1,
  },
  // Inner slot — handles press scale + content stacking with a 4-grid
  // gap so ribbon → rank → name → title → xp share a rhythm.
  slotInner: {
    alignItems: 'center',
    gap: 4,
  },
  // ── Avatar tile wrap + rank-1 ring stack ───────────────
  tileWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  // Vertical spotlight column behind rank 1. Thin, taller than the
  // ring, brightest where the avatar masks it.
  spotlightColumn: {
    position: 'absolute',
    width: 6,
    overflow: 'hidden',
  },
  // Perpetual shimmer ring on rank 1. Shadow opacity lowered to 0.6
  // (was 0.9) — at 0.9 with the glow + tier wash it read as casino.
  glowRing: {
    position: 'absolute',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 6,
  },
  // One-shot impact glow — fires when the rank-1 slot lands. Sized
  // slightly larger than the ring so the flash reads as a pop.
  impactGlow: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 22,
    elevation: 10,
  },
  // ── isYou affordance ───────────────────────────────────
  // 1px accent inset stroke around the avatar so "this is you" is
  // legible at the avatar scale. Mirrors how the rest of the
  // leaderboard announces the user.
  youInsetRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  youPill: {
    backgroundColor: colors.accentSubtle,
    borderColor: colors.accent + '55',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: 2,
  },
  youPillText: {
    ...LEADER_TYPE.meta,
    color: colors.accent,
    fontSize: 8.5,
    letterSpacing: 1.2,
  },
  // ── Identity column ────────────────────────────────────
  identity: {
    alignItems: 'center',
    gap: 4,
  },
  // Rarity ribbon — same vocabulary as AchievementCard rarityRibbon.
  ribbon: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: 'center',
  },
  ribbonText: {
    ...LEADER_TYPE.meta,
    fontSize: 8.5,
    letterSpacing: 1.4,
  },
  // Rank ordinal (1ST / 2ND / 3RD). Tabular nums via meta atom.
  rankLabel: {
    ...LEADER_TYPE.meta,
    color: colors.button1,
    letterSpacing: 1,
  },
  // Name — body text. Caption atom dropped its italic for rank-2/3
  // so the podium doesn't read as casino vocabulary.
  name: {
    ...LEADER_TYPE.caption,
    fontStyle: 'normal',
    fontWeight: '700',
    color: LEADER_TEXT_BODY,
  },
  // Name on rank 1 — uses the identityWord atom for the same weight
  // and tabular feel as "YOU" elsewhere.
  nameFirst: {
    ...LEADER_TYPE.identityWord,
    fontSize: 18,
    color: LEADER_TEXT_PRIMARY,
  },
  // Tier title sub-label — fills the IA gap impeccable flagged:
  // a name without a title is a number without identity.
  title: {
    ...LEADER_TYPE.caption,
    fontSize: 11,
    color: LEADER_TEXT_MUTED,
  },
  // ── XP figure ──────────────────────────────────────────
  // Italic dropped (it read as casino). Tabular nums inherited
  // from the bodyNum atom so digits don't reflow during the
  // rank-1 counter-up.
  xp: {
    ...LEADER_TYPE.bodyNum,
    fontSize: 13,
    marginTop: 2,
  },
  xpFirst: {
    ...LEADER_TYPE.displayNum,
    fontSize: 16,
    lineHeight: 18,
  },
  // TextInput chrome reset so the AnimatedTextInput counter aligns
  // to the same baseline as the static <Text> on ranks 2/3.
  xpInput: {
    padding: 0,
    margin: 0,
    textAlign: 'center',
    minWidth: 56,
    includeFontPadding: false,
  },
  // ── Podium shimmer ─────────────────────────────────────
  // Skewed shine band that traverses the card edge-to-edge.
  // Same dimensions as seasonStyles.bannerShimmer so the visual
  // grammar is identical across the two surfaces.
  podiumShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 110,
  },
  // ── Podium-step backdrops ──────────────────────────────
  // Three tier-tinted lanes that fill the card edge-to-edge and
  // top-to-bottom. Each lane sits behind one slot column. The
  // card's overflow:hidden clips the outer corners against the
  // card border radius.
  podiumSteps: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
  },
  stepBox: {
    flex: 1,
  },
  // ── Section header reveal ──────────────────────────────
  // Wraps the section header with a relative position so the sweep
  // track can sit underneath without affecting flow.
  sectionHeaderWrap: {
    position: 'relative',
  },
  // Track that the sweep band traverses across — clips the band
  // when it goes off the edges of the header. Sits flush at the
  // bottom of the header so the sweep reads as an underline.
  sweepTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -4,
    height: 2,
    overflow: 'hidden',
  },
  sweepBand: {
    height: 2,
  },
});

const chaseStyles = StyleSheet.create({
  panel: {
    // Edge-to-edge: break out of the ScrollView's 16px padding so
    // the panel reaches the screen edges. Dramatic asymmetric corner
    // radii give the panel a strong dome silhouette — pronounced
    // arched top, near-flat bottom — so it reads as a structural
    // piece, not a generic card.
    marginHorizontal: -16,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20, // wider inset so text clears the dome's curve at the edges
    paddingTop: 14, // just enough to clear the dome curve; header stays compact
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(255,255,255,0.015)',
  },
  // Empty-state body for when no other competitors exist. Centered
  // with a soft icon + two-line copy so the panel still feels
  // populated even when chase is empty.
  emptyState: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.4,
  },
  emptySubtext: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 16,
  },
  panelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  panelLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E5E5E5',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  panelCount: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
  },
  panelCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.titleText,
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  rankPip: {
    minWidth: 44,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  rankPipHash: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
    opacity: 0.7,
    marginRight: 1,
  },
  rankPipNum: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
    fontVariant: ['tabular-nums'],
  },
  info: {
    flex: 1,
    gap: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deltaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  deltaArrow: {
    fontSize: 8,
    lineHeight: 10,
    fontWeight: '900',
  },
  deltaText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginLeft: -1,
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F4F4F4',
    letterSpacing: 0.2,
  },
  sub: {
    fontSize: 11,
    color: '#9F9F9F',
    fontStyle: 'italic',
  },
  xpCol: {
    alignItems: 'flex-end',
    gap: 1,
    minWidth: 56,
  },
  xpNum: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
  xpLabel: {
    fontSize: 9,
    color: colors.button1,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});

// ─── Your Standing sticky bar styles ─────────────────────
//
// Compact bar anchored above the bottom tab nav. Inherits the
// gradient + rarity-border idiom from AchievementCard (line ~290) so
// the bar reads as a sibling tile of the rest of the rarity family,
// just denser.
//
// Design pass discipline:
//   • Spacing on a 4-pixel baseline (mostly). Sub-4 values (2, 3) only
//     for slim rhythm inside the bar where 4 would feel airy.
//   • Typography ladder draws from LEADER_TYPE atoms — sizes are
//     stepped down from the hero version to suit the denser frame.
//   • Color resolves to LEADER_TEXT_* anchors, RARITY tokens, or theme
//     colors.* — no orphan hex literals.
//   • Elevation only on the card itself (it's the focal element).

const youStandingStyles = StyleSheet.create({
  // ── Sticky wrapper ─────────────────────────────────────
  // Anchors the bar to the bottom of the LeaderboardView container,
  // which itself sits above the bottom tab nav. The fade strip sits
  // ABOVE the card so scrolled content dissolves into the bar
  // instead of clipping hard at a horizon line.
  stickyOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  stickyFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '100%',
    height: 28,
  },
  stickyInner: {
    paddingHorizontal: 0, // Edge-to-edge — bar spans the full screen width.
    paddingBottom: 2, // Hairline — bar reads as docked to the tab nav, not floating.
  },

  // ── Card shell ─────────────────────────────────────────
  // paddingBottom: 0 so the chase track sits flush at the bottom edge.
  // topRow carries its own marginBottom for breathing above the track.
  card: {
    borderRadius: 14, // Slightly tighter than the hero version (was 16).
    paddingTop: 10,
    paddingBottom: 0,
    paddingHorizontal: 12,
    overflow: 'hidden',
    borderWidth: 1.2, // Match AchievementCard / tier card family.
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  },

  // ── Top row layout ─────────────────────────────────────
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },

  // ── Rank block — left anchor ───────────────────────────
  // Compact: just "#03" in a tinted pill, no "of N" suffix —
  // field scale already lives in the scope header ("STANDINGS · {n}").
  rankBlock: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
  },
  rankHash: {
    ...LEADER_TYPE.meta,
    fontSize: 9,
    opacity: 0.7,
  },
  rankNum: {
    ...LEADER_TYPE.displayNum,
    fontSize: 18,
    lineHeight: 20,
  },

  // ── Middle column — kicker + identity ──────────────────
  // The xp row was redundant with the primary stat on the right
  // (often the same number, just framed differently), so it's gone.
  headerSlot: {
    flex: 1,
    minWidth: 0,
  },
  info: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  kicker: {
    ...LEADER_TYPE.kicker,
    fontSize: 9,
    letterSpacing: 1.4,
    flexShrink: 1,
  },
  youLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  youLabel: {
    ...LEADER_TYPE.identityWord,
    fontSize: 14,
    lineHeight: 16,
    color: LEADER_TEXT_PRIMARY,
  },
  titleText: {
    ...LEADER_TYPE.caption,
    fontSize: 11,
    color: LEADER_TEXT_MUTED,
    flexShrink: 1,
  },

  // ── Right column — primary motivational stat ───────────
  primaryCol: {
    alignItems: 'flex-end',
    gap: 2,
    minWidth: 60,
  },
  primaryNum: {
    ...LEADER_TYPE.displayNum,
    fontSize: 17,
    lineHeight: 19,
  },
  // Reset TextInput chrome so the animated counter aligns to the same
  // baseline as the original static <Text>. Zero padding, right align,
  // fixed width derived from the column min-width so the digits don't
  // jitter as they tick.
  primaryNumInput: {
    padding: 0,
    margin: 0,
    textAlign: 'right',
    minWidth: 52,
    includeFontPadding: false,
  },
  primaryLabel: {
    ...LEADER_TYPE.meta,
    fontSize: 8.5,
    letterSpacing: 1,
    opacity: 0.75,
  },

  // ── Chase track — flush at the card's bottom edge ──────
  // Slim 3px bar that spans the full width of the card. Touches the
  // left and right card edges via negative margins to neutralize the
  // card's horizontal padding. Pass 3 (motion) animates a scaleX
  // overlay on top of this — never the `width` prop itself.
  chaseTrack: {
    height: 3,
    marginHorizontal: -12, // Cancel card paddingHorizontal so it spans edge-to-edge.
    backgroundColor: LEADER_TRACK_BG,
    overflow: 'hidden',
  },
  chaseFill: {
    height: 3,
  },
  chaseFillOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    transformOrigin: 'left center',
  },
});

// ─── Banner header styles ──────────────────────────────────

const bannerStyles = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    padding: 18,
    gap: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  gradient: { ...StyleSheet.absoluteFillObject },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  kicker: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.button1,
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    marginBottom: 2,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  sub: { fontSize: 11, color: '#B5B5B5', letterSpacing: 0.2 },
  levelPillWrap: {
    width: 70,
    height: 70,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  levelLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9A9A9A',
    letterSpacing: 1,
    marginBottom: -2,
  },
  levelNum: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  barTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  barFill: { height: 6, borderRadius: 3 },
  barLabel: {
    fontSize: 10,
    color: '#9A9A9A',
    textAlign: 'right',
    letterSpacing: 0.3,
  },
});

// ─── Filter bar styles ─────────────────────────────────────

const filterStyles = StyleSheet.create({
  row: { gap: 7, paddingVertical: 2, paddingHorizontal: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  starCluster: { flexDirection: 'row', alignItems: 'center' },
  chipText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginLeft: 3,
  },
  chipCount: {
    fontSize: 9,
    fontWeight: '700',
    opacity: 0.7,
    marginLeft: 2,
  },
});

// ─── Card styles ───────────────────────────────────────────

const cardStyles = StyleSheet.create({
  haloWrap: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 22,
    overflow: 'hidden',
  },
  haloGradient: { ...StyleSheet.absoluteFillObject, borderRadius: 22 },

  card: {
    borderRadius: 16,
    padding: 14,
    gap: 8,
    borderWidth: 1.2,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 6,
  },

  rarityRibbon: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 2,
  },
  rarityLabel: { fontSize: 8.5, fontWeight: '900', letterSpacing: 1.4 },

  starRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },

  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  cardText: { flex: 1, gap: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },
  cardDesc: { fontSize: 11, color: '#9F9F9F', lineHeight: 14 },

  xpBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderWidth: 1,
    minWidth: 56,
    gap: 2,
  },
  xpText: { fontSize: 14, fontWeight: '900', letterSpacing: 0.2, lineHeight: 16 },
  xpLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  xpBadgeDivider: {
    height: 1,
    alignSelf: 'stretch',
    marginVertical: 2,
    opacity: 0.6,
  },
  coinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  coinText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  particleLayer: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    height: 30,
  },

  // Locked
  lockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(35,34,34,0.55)',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  lockedIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  lockedTitle: { fontSize: 13, fontWeight: '800', color: colors.button1, letterSpacing: 1 },
  lockedDesc: { fontSize: 11, color: '#7A7A7A', lineHeight: 14 },
  lockBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  barTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: { height: 3, borderRadius: 2 },
  progressLabel: {
    fontSize: 9,
    color: '#7A7A7A',
    minWidth: 50,
    textAlign: 'right',
    fontWeight: '600',
  },
});

// ─── Modal styles ──────────────────────────────────────────

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 32,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 22,
    opacity: 0,
  },
  card: {
    width: '100%',
    borderRadius: 22,
    padding: 22,
    paddingTop: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  rarityBanner: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 14,
  },
  rarityBannerText: { fontSize: 10, fontWeight: '900', letterSpacing: 2.4 },
  modalStars: { flexDirection: 'row', marginBottom: 18 },
  modalIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 18,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 12,
    color: '#B5B5B5',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  modalReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalRewardLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.4,
    opacity: 0.7,
  },
  modalRewardXP: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  modalRewardCoinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  modalRewardCoin: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  modalProgressLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9F9F9F',
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  modalBarTrack: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  modalBarFill: { height: 5, borderRadius: 3 },
});

const seasonStyles = StyleSheet.create({
  scroll: { padding: 16, paddingTop: 20, gap: 14 },

  // ── Hero banner ──────────────────────────────────────────
  banner: {
    borderRadius: 22,
    padding: 18,
    gap: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  bannerShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 110,
    transform: [{ skewX: '-18deg' }],
  },
  bannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  seasonBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  seasonBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  bannerTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  levelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  levelChipLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  levelChipNum: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  daysLeftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  daysLeftNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#E5E5E5',
    letterSpacing: 0.2,
  },
  daysLeftLabel: {
    fontSize: 9,
    color: colors.button1,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginLeft: 4,
  },
  bannerKicker: {
    fontSize: 9,
    fontWeight: '900',
    color: '#9F9F9F',
    letterSpacing: 2.4,
    marginBottom: -8,
  },
  bannerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  // ── Current tier hero ────────────────────────────────────
  currentRankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 2,
  },
  currentRankPlate: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentRankCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  currentRankNum: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: -1,
  },
  // Disk-shaped clip so the shimmer sweep only shows inside the tier circle.
  currentRankShimmerClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    overflow: 'hidden',
  },
  currentRankShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 28,
    left: '50%',
    marginLeft: -14,
  },
  heroParticleLayer: {
    position: 'absolute',
    width: 90,
    height: 30,
    bottom: -4,
  },
  currentRankInfo: { flex: 1, gap: 2 },
  currentRankLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 1,
  },
  currentRankLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  currentRankTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  currentRankSub: {
    fontSize: 11,
    color: '#9F9F9F',
    fontStyle: 'italic',
  },

  // ── Banner progress bar ──────────────────────────────────
  bannerProgressWrap: { gap: 6 },
  bannerProgressTrack: {
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  bannerProgressFill: { height: 7, borderRadius: 4 },
  bannerProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerXP: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  bannerNext: {
    fontSize: 10,
    color: '#E5E5E5',
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // ── Section header ───────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 2,
    paddingHorizontal: 2,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#E5E5E5',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  sectionCountPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  sectionCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.titleText,
    letterSpacing: 0.4,
  },

  // ── Tier card ────────────────────────────────────────────
  tierCard: {
    backgroundColor: colors.container,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.2,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 4,
  },
  tierGlowHalo: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 22,
  },
  tierParticleLayer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 6,
    height: 30,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  tierIconWrap: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 30,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  tierIconChip: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  tierNumBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  tierNumBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  tierInfo: { flex: 1, gap: 2 },
  tierChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  tierTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  tierTitleLocked: { color: colors.button1 },
  tierSub: {
    fontSize: 11,
    color: '#9F9F9F',
    fontStyle: 'italic',
  },
  tierMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  tierXpReq: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tierUnlockDate: {
    fontSize: 9,
    color: colors.button1,
    fontWeight: '600',
  },

  // ── Tier ladder + connector ──────────────────────────────
  // Wrapper has no internal gap — TierConnector controls the
  // spacing between TierCards so the column reads as one ladder.
  tierLadder: {},
  tierConnectorWrap: {
    height: 36,
    position: 'relative',
  },
  // Aligned with TierCard icon-chip center:
  // card padding (14) + tierIconWrap half-width (28) = 42px.
  // Single continuous line spanning the full wrap — the filled
  // sparkle (rendered after the line in JSX, so on top) covers
  // the line wherever they overlap. No gap, no T-tip.
  tierConnectorLine: {
    position: 'absolute',
    left: 41,
    top: 0,
    bottom: 0,
    width: 2,
    borderRadius: 1,
  },
  // Subtle backdrop halo — four concentric circles centered on
  // the sparkle at (42, 18). Decreasing alpha as radius grows
  // composites into a smooth 360° radial fade. No shadow, so
  // perfectly centered on iOS and Android.
  tierConnectorGlow1: {
    position: 'absolute',
    left: 33,
    top: 9,
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  tierConnectorGlow2: {
    position: 'absolute',
    left: 30,
    top: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  tierConnectorGlow3: {
    position: 'absolute',
    left: 27,
    top: 3,
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  tierConnectorGlow4: {
    position: 'absolute',
    left: 24,
    top: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  // Midpoint gem — 22px 4-point sparkle icon (MaterialCommunity
  // "star-four-points"). Centered on the line at x=42: left =
  // 42 - 11 = 31. Vertical center in 36px wrap: top = 7.
  tierConnectorNode: {
    position: 'absolute',
    left: 31,
    top: 7,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Horizontal accent from the sparkle toward the right. Stops
  // at the wrap's right edge (right: 0) — pushing past with
  // negative offsets caused horizontal layout overflow that
  // cascaded through the ScrollView and broke tier-card widths.
  // Hairline 1.5px weight + rarity-to-transparent gradient
  // dissolves into the edge — accent, not a second primary line.
  tierConnectorSideLine: {
    position: 'absolute',
    left: 63,
    right: 0,
    top: 17.25,
    height: 1.5,
    borderRadius: 0.75,
  },
  // Dotted accent on the left of the sparkle — 5 small dots
  // at 5px spacing, fading opacity outward. Visual counterpoint
  // to the solid line on the right (line continues; dots trail).
  tierConnectorSideDot: {
    position: 'absolute',
    top: 17,
    width: 2,
    height: 2,
    borderRadius: 1,
  },

  // ── State chips ──────────────────────────────────────────
  currentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
  },
  currentDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  currentChipText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  unlockedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
  },
  unlockedChipText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  // ── Title cards (horizontal scroll) ──────────────────────
  titlesScroll: {
    marginHorizontal: -16,
  },
  titlesScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  titlesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  seeMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  seeMoreText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.button1,
  },
});

const allTitlesStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '78%',
    borderRadius: 18,
    backgroundColor: colors.container,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  closeBtnPlaceholder: {
    width: 30,
    height: 30,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.titleText,
    paddingVertical: 0,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 2,
    zIndex: 10,
  },
  filterWrap: {
    flex: 1,
    position: 'relative',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dropdownLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.button1,
  },
  dropdownValuePill: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'center',
  },
  dropdownValueText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
    textAlign: 'center',
  },
  dropdownPanel: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownOptionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dropdownOptionText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 16,
    justifyContent: 'flex-start',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: colors.button1,
    fontWeight: '600',
  },
});

const achStyles = StyleSheet.create({
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 24,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.highlight,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
});

export default AchievementsScreen;
