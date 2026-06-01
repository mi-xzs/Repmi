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
} from 'react-native';
import Reanimated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInRight,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import SwipeTabs from '../components/ui/SwipeTabs';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { useAuth } from '../services/AuthContext';
import { loadAllSessions as sbLoadAllSessions } from '../services/sessionService';
import { useXP } from '../services/XPContext';
import { useProfile } from '../services/ProfileContext';
import { XPLogEntry } from '../services/xpService';
import { useSettings } from '../services/SettingsContext';
import { WorkoutSession } from './WorkoutScreen';
import { dayKey, getCurrentStreak, getLongestStreak } from '../utils/analyticsHelpers';


type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

interface RarityToken {
  key: Rarity;
  label: string;
  stars: number;        // 1–5 star indicator
  color: string;        // primary tint
  glow: string;         // outer glow color
  gradient: [string, string, ...string[]]; // card backdrop gradient
  borderActive: string;
  borderIdle: string;
  ringOuter: string;    // outer halo
  particle: boolean;    // floats particles
}

const RARITY: Record<Rarity, RarityToken> = {
  common: {
    key: 'common',
    label: 'COMMON',
    stars: 1,
    color: '#7B968A',
    glow: 'rgba(123,150,138,0.16)',
    gradient: ['#1D2321', '#161B19'],
    borderActive: 'rgba(123,150,138,0.46)',
    borderIdle: 'rgba(123,150,138,0.20)',
    ringOuter: 'rgba(123,150,138,0.10)',
    particle: false,
  },
  uncommon: {
    key: 'uncommon',
    label: 'UNCOMMON',
    stars: 2,
    color: '#5FAB8C',
    glow: 'rgba(95,171,140,0.20)',
    gradient: ['#1A2622', '#13201C'],
    borderActive: 'rgba(95,171,140,0.52)',
    borderIdle: 'rgba(95,171,140,0.22)',
    ringOuter: 'rgba(95,171,140,0.11)',
    particle: false,
  },
  rare: {
    key: 'rare',
    label: 'RARE',
    stars: 3,
    color: '#2EC891',
    glow: 'rgba(46,200,145,0.24)',
    gradient: ['#172A24', '#0F221C'],
    borderActive: 'rgba(46,200,145,0.58)',
    borderIdle: 'rgba(46,200,145,0.25)',
    ringOuter: 'rgba(46,200,145,0.12)',
    particle: false,
  },
  epic: {
    key: 'epic',
    label: 'EPIC',
    stars: 4,
    color: '#00DC88',
    glow: 'rgba(0,220,136,0.28)',
    gradient: ['#142E25', '#0C241D'],
    borderActive: 'rgba(0,220,136,0.62)',
    borderIdle: 'rgba(0,220,136,0.28)',
    ringOuter: 'rgba(0,220,136,0.13)',
    particle: false,
  },
  legendary: {
    key: 'legendary',
    label: 'LEGENDARY',
    stars: 5,
    color: '#00FA9A',
    glow: 'rgba(0,250,154,0.34)',
    gradient: ['#143527', '#0B281F'],
    borderActive: 'rgba(0,250,154,0.72)',
    borderIdle: 'rgba(0,250,154,0.32)',
    ringOuter: 'rgba(0,250,154,0.16)',
    particle: true,
  },
};

function rarityFromXP(xp: number): Rarity {
  if (xp >= 201) return 'legendary';
  if (xp >= 101) return 'epic';
  if (xp >= 51)  return 'rare';
  if (xp >= 30)  return 'uncommon';
  return 'common';
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

function StarRow({ count, color, dim, size = 10 }: { count: number; color: string; dim?: boolean; size?: number }) {
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
      withRepeat(
        withTiming(-26, { duration: 2200, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      ),
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
  const o = useSharedValue(intense ? 0.55 : 0.30);

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
  const tier = RARITY[rarityFromXP(achievement.xp)];
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
        entering={FadeInDown.delay(index * 50).duration(220).easing(Easing.out(Easing.quad))}
        exiting={FadeOut.duration(150)}
      >
        <Pressable
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <Reanimated.View style={[cardStyles.lockedCard, pressStyle]}>
            <View style={cardStyles.lockedIconWrap}>
              <Feather name={achievement.icon} size={18} color={colors.button1} style={{ opacity: 0.2 }} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <View style={cardStyles.starRow}>
                {Array.from({ length: tier.stars }).map((_, i) => (
                  <Text
                    key={i}
                    style={{ color: colors.button2, fontSize: 9, lineHeight: 9, marginRight: 1.5 }}
                  >★</Text>
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
      entering={FadeInDown.delay(index * 60).duration(220).easing(Easing.out(Easing.quad)).springify().damping(14)}
      exiting={FadeOut.duration(150)}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Reanimated.View style={pressStyle}>
          {/* Outer glow halo */}
          <GlowHalo tier={tier} intense={tier.key === 'legendary' || tier.key === 'epic'} />

          {/* Card body */}
          <View
            style={[
              cardStyles.card,
              { borderColor: tier.borderActive, shadowColor: tier.color },
            ]}
          >
            <LinearGradient
              colors={tier.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />

            {/* Rarity ribbon top */}
            <View style={[cardStyles.rarityRibbon, { backgroundColor: tier.color + '22', borderColor: tier.color + '55' }]}>
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
  const tier = achievement ? RARITY[rarityFromXP(achievement.xp)] : RARITY.common;
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
            style={[
              modalStyles.flash,
              { backgroundColor: tier.color },
              flashStyle,
            ]}
          />

          <View style={[modalStyles.card, { borderColor: tier.borderActive }]}>
            <LinearGradient
              colors={tier.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />

            {/* Rarity banner */}
            <View style={[modalStyles.rarityBanner, { backgroundColor: tier.color + '22', borderColor: tier.color + '88' }]}>
              <Text style={[modalStyles.rarityBannerText, { color: tier.color }]}>{tier.label}</Text>
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
                >★</Text>
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
            <Text style={modalStyles.modalTitle}>
              {unlocked ? achievement.title : '???'}
            </Text>
            <Text style={modalStyles.modalDesc}>{achievement.description}</Text>

            {/* XP reward */}
            <View style={[modalStyles.modalReward, { backgroundColor: tier.color + '18', borderColor: tier.color + '66' }]}>
              <Text style={[modalStyles.modalRewardLabel, { color: tier.color }]}>REWARD</Text>
              <Text style={[modalStyles.modalRewardXP, { color: tier.color }]}>+{achievement.xp} XP</Text>
            </View>

            {/* Progress (if locked) */}
            {!unlocked && achievement.target != null && (
              <View style={{ width: '100%', marginTop: 14, gap: 6 }}>
                <Text style={modalStyles.modalProgressLabel}>
                  PROGRESS · {Math.min(achievement.progress ?? 0, achievement.target)}/{achievement.target}
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
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={filterStyles.row}
    >
      {FILTER_ORDER.map((r) => {
        const isActive = active === r;
        const tier = r === 'all' ? null : RARITY[r];
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
                  >★</Text>
                ))}
              </View>
            )}
            <Text
              style={[
                filterStyles.chipText,
                { color: isActive ? color : colors.button1 },
              ]}
            >
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

// Dummy rivals — preview the populated state until the real
// leaderboard feed is wired up. Greek hero names mirror the
// season tier aesthetic (Spartan → Zeus). XP values span the
// full rarity ladder so every tier is represented on screen.
const DUMMY_LEADERS: { name: string; xp: number; weeklyXP: number }[] = [
  { name: 'Kratos',    xp: 24800, weeklyXP: 2150 },
  { name: 'Achilles',  xp: 19200, weeklyXP: 1840 },
  { name: 'Hercules',  xp: 14300, weeklyXP: 1290 },
  { name: 'Perseus',   xp: 11800, weeklyXP:  980 },
  { name: 'Leonidas',  xp:  9400, weeklyXP: 1420 },
  { name: 'Odysseus',  xp:  6700, weeklyXP:  720 },
  { name: 'Theseus',   xp:  4900, weeklyXP:  480 },
  { name: 'Atlas',     xp:  3300, weeklyXP:  610 },
  { name: 'Ajax',      xp:  2100, weeklyXP:  340 },
  { name: 'Hector',    xp:  1450, weeklyXP:  260 },
  { name: 'Helios',    xp:   820, weeklyXP:  180 },
  { name: 'Castor',    xp:   240, weeklyXP:   90 },
];

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

function getInitials(name?: string | null): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function AvatarTile({
  size,
  color,
  avatarUrl,
  name,
  glow,
}: {
  size: number;
  color: string;
  avatarUrl?: string | null;
  name?: string | null;
  glow?: boolean;
}) {
  const radius = Math.max(6, Math.round(size * 0.25));
  // Initials font scales with tile size — ~40% of size lands well
  // for 26–64px tiles tested in the leaderboard.
  const initialsSize = Math.max(10, Math.round(size * 0.42));
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        borderWidth: 1.5,
        borderColor: color + 'AA',
        backgroundColor: color + '18',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        shadowColor: glow ? color : 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: glow ? 0.7 : 0,
        shadowRadius: glow ? 10 : 0,
        elevation: glow ? 5 : 2,
      }}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius: radius }}
        />
      ) : (
        <Text
          style={{
            color,
            fontSize: initialsSize,
            fontWeight: '900',
            letterSpacing: 0.5,
          }}
        >
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}

function formatXP(xp: number): string {
  if (xp >= 10000) return `${(xp / 1000).toFixed(1)}k`;
  if (xp >= 1000) return `${(xp / 1000).toFixed(2)}k`;
  return xp.toLocaleString();
}

// Static dummy deltas for now — wire up to real period-over-period
// tracking later. Keyed by dummy name so they stay stable across
// sort changes.
const DUMMY_DELTAS: Record<string, number> = {
  Kratos: 0,
  Achilles: 1,
  Hercules: -1,
  Perseus: 2,
  Leonidas: -1,
  Odysseus: 1,
  Theseus: 3,
  Atlas: -2,
  Ajax: 0,
  Hector: 1,
  Helios: -1,
  Castor: 2,
};

// ─── Top three showcase ───────────────────────────────────

interface ShowcaseEntry {
  rank: 1 | 2 | 3;
  name: string;
  xp: number;
}

function TopShowcaseSlot({ entry, avatarUrl, displayName, delay }: { entry: ShowcaseEntry; avatarUrl?: string | null; displayName?: string | null; delay: number }) {
  const r = RARITY[rankToRarity(entry.rank)];
  const isFirst = entry.rank === 1;
  const isSecond = entry.rank === 2;
  const size = isFirst ? 72 : 52;
  const ringSize = size + 14;
  // Podium step — slots 2 & 3 sit lower so the silhouette reads as a real podium
  const podiumOffset = isFirst ? 0 : isSecond ? 18 : 28;

  // Ambient shimmer on rank 1 — uses the existing BannerShimmer pattern but inline
  const shimmer = useSharedValue(0);
  useEffect(() => {
    if (isFirst) {
      shimmer.value = withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    }
  }, [isFirst]);
  const ringPulse = useAnimatedStyle(() => ({
    opacity: isFirst ? interpolate(shimmer.value, [0, 1], [0.55, 1], Extrapolation.CLAMP) : 1,
    transform: [{ scale: isFirst ? interpolate(shimmer.value, [0, 1], [0.98, 1.04], Extrapolation.CLAMP) : 1 }],
  }));

  return (
    <Reanimated.View
      entering={FadeInDown.delay(delay).duration(340).easing(Easing.out(Easing.back(1.2)))}
      style={[topShowcaseStyles.slot, { marginTop: podiumOffset }]}
    >
      <View style={[topShowcaseStyles.tileWrap, { height: ringSize }]}>
        {isFirst && (
          <Reanimated.View
            style={[
              topShowcaseStyles.glowRing,
              {
                width: ringSize,
                height: ringSize,
                borderRadius: Math.round(ringSize * 0.25),
                borderColor: r.color,
                shadowColor: r.color,
              },
              ringPulse,
            ]}
          />
        )}
        <AvatarTile size={size} color={r.color} avatarUrl={avatarUrl} name={displayName ?? entry.name} glow={isFirst} />
      </View>

      <Text style={[topShowcaseStyles.rankLabel, isFirst && { color: r.color }]}>
        {String(entry.rank).padStart(2, '0')}
      </Text>
      <Text style={[topShowcaseStyles.name, isFirst && topShowcaseStyles.nameFirst]} numberOfLines={1}>
        {entry.name}
      </Text>
      <Text style={[topShowcaseStyles.xp, isFirst && topShowcaseStyles.xpFirst, { color: isFirst ? r.color : colors.titleText }]}>
        {formatXP(entry.xp)}
      </Text>
    </Reanimated.View>
  );
}

function TopThreeShowcase({ entries }: { entries: (ShowcaseEntry & { avatarUrl?: string | null; displayName?: string | null })[] }) {
  const first = entries.find((e) => e.rank === 1);
  const second = entries.find((e) => e.rank === 2);
  const third = entries.find((e) => e.rank === 3);
  if (!first || !second || !third) return null;

  const firstColor = RARITY[rankToRarity(1)].color;

  return (
    <View style={topShowcaseStyles.card}>
      <LinearGradient
        colors={['#1F2521', '#171716']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {/* Subtle rarity-1 tint at the top so the card amplifies its winner */}
      <LinearGradient
        colors={[firstColor + '22', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={topShowcaseStyles.row}>
        {/* Rank 2 enters first (left), then 3 (right), then 1 lands last with the beat */}
        <TopShowcaseSlot entry={second} avatarUrl={second.avatarUrl} displayName={second.displayName} delay={40} />
        <TopShowcaseSlot entry={first}  avatarUrl={first.avatarUrl}  displayName={first.displayName}  delay={180} />
        <TopShowcaseSlot entry={third}  avatarUrl={third.avatarUrl}  displayName={third.displayName}  delay={100} />
      </View>
    </View>
  );
}

// ─── Chase row (card-style standings entry) ────────────────

interface ChaseEntry {
  key: string;
  rank: number;
  name: string;
  title: string;
  xp: number;
}

function ChaseRow({ entry, delta, index, isLast }: {
  entry: ChaseEntry;
  delta: number;
  index: number;
  isLast?: boolean;
}) {
  const r = RARITY[rankToRarity(entry.rank)];
  const deltaPositive = delta > 0;
  const deltaNegative = delta < 0;
  const deltaColor = deltaPositive ? colors.accent : deltaNegative ? '#D87575' : colors.button1;

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

  return (
    <Reanimated.View
      entering={FadeInDown.delay(60 + Math.min(index, 7) * 30).duration(220).easing(Easing.out(Easing.cubic))}
      style={[chaseStyles.row, !isLast && chaseStyles.rowDivider]}
    >
      <Reanimated.View
        style={[
          chaseStyles.rankPip,
          { backgroundColor: r.color + '12' },
          pipAnimatedStyle,
        ]}
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
        <Text style={[chaseStyles.xpNum, { color: r.color }]}>
          {formatXP(entry.xp)}
        </Text>
        <Text style={chaseStyles.xpLabel}>XP</Text>
      </View>
    </Reanimated.View>
  );
}

// ─── Sticky "you" bar ─────────────────────────────────────

function YouStickyBar({
  rank,
  xp,
  toClimb,
  avatarUrl,
  username,
  title,
}: {
  rank: number;
  xp: number;
  toClimb: number;
  avatarUrl?: string | null;
  username?: string | null;
  title: string;
}) {
  const r = RARITY.legendary;
  return (
    <View style={youBarStyles.outer}>
      {/* Top edge fade so content underneath dissolves into bar */}
      <LinearGradient
        colors={['rgba(26,25,25,0)', '#1A1919']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={youBarStyles.fadeStrip}
      />

      <View style={youBarStyles.bar}>
        <View style={[youBarStyles.card, { borderColor: r.borderActive, shadowColor: r.color }]}>
          <LinearGradient
            colors={r.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          <View
            style={[
              youBarStyles.rankPip,
              { backgroundColor: r.color + '1A' },
            ]}
          >
            <Text style={[youBarStyles.rankPipHash, { color: r.color }]}>#</Text>
            <Text style={[youBarStyles.rankPipNum, { color: r.color }]}>
              {String(rank).padStart(2, '0')}
            </Text>
          </View>

          <AvatarTile size={40} color={r.color} avatarUrl={avatarUrl} name={username} glow />

          <View style={youBarStyles.info}>
            <View style={youBarStyles.nameRow}>
              <Text style={youBarStyles.name} numberOfLines={1}>You</Text>
              <View style={[youBarStyles.youPill, { backgroundColor: r.color + '22', borderColor: r.color + '88' }]}>
                <Text style={[youBarStyles.youPillText, { color: r.color }]}>YOU</Text>
              </View>
            </View>
            <Text style={youBarStyles.sub} numberOfLines={1}>{title}</Text>
          </View>

          {toClimb > 0 ? (
            <View style={youBarStyles.endCol}>
              <Text style={[youBarStyles.climbNum, { color: r.color }]}>
                +{formatXP(toClimb)}
              </Text>
              <Text style={youBarStyles.climbLabel}>TO CLIMB</Text>
            </View>
          ) : (
            <View style={youBarStyles.endCol}>
              <Text style={[youBarStyles.climbNum, { color: r.color }]}>
                {formatXP(xp)}
              </Text>
              <Text style={youBarStyles.climbLabel}>XP</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Leaderboard ──────────────────────────────────────────

type LeaderboardMode = 'weekly' | 'all-time';

function LeaderboardView() {
  const { totalXP, levelTitle, xpLog } = useXP();
  const { equippedSeasonTitle } = useSettings();
  const { profile } = useProfile();
  const displayTitle = equippedSeasonTitle ?? levelTitle.title;
  const [mode, setMode] = useState<LeaderboardMode>('all-time');

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
  // Top 3 shows the actual leaders (including user if applicable).
  // Chase list (rank 4+) excludes the user — they live in the sticky bar.
  const { top3, chase, yourRank, toClimb } = useMemo(() => {
    const tierTitle = (xp: number) => {
      const tIdx = SEASON_TIERS.reduce(
        (best, t, i) => (xp >= t.xp ? i : best),
        0,
      );
      return SEASON_TIERS[tIdx].title;
    };
    const others = DUMMY_LEADERS.map((d) => {
      const xp = mode === 'weekly' ? d.weeklyXP : d.xp;
      return {
        key: d.name,
        name: d.name,
        title: tierTitle(xp),
        xp,
      };
    });
    const all = [
      ...others,
      { key: '__you__', name: 'You', title: displayTitle, xp: userXP },
    ];
    all.sort((a, b) => b.xp - a.xp);
    const ranked = all.map((e, i) => ({ ...e, rank: i + 1 }));
    const me = ranked.find((e) => e.key === '__you__')!;
    const above = ranked.find((e) => e.rank === me.rank - 1);
    return {
      top3: ranked.slice(0, 3),
      chase: ranked.slice(3).filter((e) => e.key !== '__you__'),
      yourRank: me.rank,
      toClimb: above ? Math.max(0, above.xp - userXP + 1) : 0,
    };
  }, [userXP, displayTitle, mode]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={leaderboardStyles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Mode pill toggle */}
        <View style={leaderboardStyles.modePillBar}>
          {(['weekly', 'all-time'] as const).map(opt => {
            const isActive = mode === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setMode(opt);
                }}
                style={[
                  leaderboardStyles.modePill,
                  isActive && leaderboardStyles.modePillActive,
                ]}
              >
                <Text
                  style={[
                    leaderboardStyles.modePillText,
                    { color: isActive ? colors.accent : colors.button1 },
                  ]}
                >
                  {opt === 'weekly' ? 'WEEKLY' : 'ALL-TIME'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {/* Top 3 showcase */}
        {top3.length === 3 && (
          <TopThreeShowcase
            entries={top3.map((e) => ({
              rank: e.rank as 1 | 2 | 3,
              name: e.name,
              xp: e.xp,
              avatarUrl: e.key === '__you__' ? profile?.avatar_url : null,
              displayName: e.key === '__you__' ? profile?.username : e.name,
            }))}
          />
        )}


        {chase.length > 0 && (
          <View style={{ gap: 8 }}>
            <View style={leaderboardStyles.chaseDivider}>
              <View style={leaderboardStyles.chaseDividerLine} />
              <MaterialCommunityIcons name="star-four-points" size={10} color={colors.accent} />
              <Text style={leaderboardStyles.chaseDividerText}>THE CHASE</Text>
              <MaterialCommunityIcons name="star-four-points" size={10} color={colors.accent} />
              <View style={leaderboardStyles.chaseDividerLine} />
            </View>
            <Reanimated.View
              entering={FadeIn.delay(220).duration(260)}
              style={chaseStyles.panel}
            >
              {chase.map((entry, i) => (
                <ChaseRow
                  key={entry.key}
                  entry={entry}
                  delta={DUMMY_DELTAS[entry.name] ?? 0}
                  index={i}
                  isLast={i === chase.length - 1}
                />
              ))}
            </Reanimated.View>
          </View>
        )}
      </ScrollView>

      <YouStickyBar rank={yourRank} xp={userXP} toClimb={toClimb} avatarUrl={profile?.avatar_url} username={profile?.username} title={displayTitle} />
    </View>
  );
}

// ─── Season Pass ───────────────────────────────────────────

const SEASON_TIERS = [
  { xp: 0,     title: 'Mortal',           subtitle: 'The journey begins'       },
  { xp: 300,   title: 'Spartan',          subtitle: 'Forged in discipline'      },
  { xp: 1200,  title: 'Hero of Athens',   subtitle: 'Courage beyond measure'    },
  { xp: 3500,  title: 'Demigod',          subtitle: 'Half mortal, half divine'  },
  { xp: 7000,  title: 'Olympian',         subtitle: 'Chosen by the gods'        },
  { xp: 11000, title: 'God of Olympus',   subtitle: 'Power beyond reckoning'    },
  { xp: 16000, title: 'Zeus',             subtitle: 'King of all gods'          },
];

const SEASON_END = new Date('2026-08-01');
const SCREEN_WIDTH = Dimensions.get('window').width;
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
  (SCREEN_WIDTH
    - HEX_GRID_OUTER_PAD * 2
    - HEX_GRID_CONTAINER_PAD * 2
    - HEX_GRID_CONTAINER_BORDER * 2
    - HEX_GRID_GAP * 2) / 3
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
  const r = RARITY[rarityFromXP(achievement.xp)];
  return (
    <Reanimated.View
      entering={FadeInDown.delay(40 + index * 50).duration(220).springify()}
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
        <Text style={hexCardStyles.title} numberOfLines={2}>{achievement.title}</Text>
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
    case 0: return 'common';      // Mortal
    case 1: return 'uncommon';    // Spartan
    case 2: return 'rare';        // Hero of Athens
    case 3: return 'rare';        // Demigod
    case 4: return 'epic';        // Olympian
    case 5: return 'epic';        // God of Olympus
    case 6: return 'legendary';   // Zeus
    default: return 'common';
  }
}

const TIER_ICONS: (keyof typeof Feather.glyphMap)[] = [
  'user',       // Mortal
  'shield',     // Spartan
  'award',      // Hero of Athens
  'feather',    // Demigod
  'star',       // Olympian
  'sun',        // God of Olympus
  'zap',        // Zeus
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
    opacity: interpolate(x.value, [-1, -0.5, 0, 0.5, 1], [0, 0.45, 0.7, 0.45, 0], Extrapolation.CLAMP),
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
  const rarity = tierToRarity(index);
  const r = RARITY[rarity];
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
    opacity: isCurrent
      ? interpolate(pulse.value, [0, 1], [0.45, 0.95], Extrapolation.CLAMP)
      : 0.5,
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
  const borderColor = isCurrent ? r.borderActive : unlocked ? r.borderIdle : 'rgba(255,255,255,0.05)';
  const iconColor = unlocked ? r.color : colors.button1;

  return (
    <Reanimated.View
      entering={FadeInDown.delay(40 + index * 50).duration(220).springify()}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
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
            <Reanimated.View
              pointerEvents="none"
              style={[seasonStyles.tierGlowHalo, glowStyle]}
            >
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
                {unlocked
                  ? <Feather name={icon} size={22} color={r.color} />
                  : <Feather name="lock" size={18} color={colors.button1} style={{ opacity: 0.5 }} />
                }
              </View>
              {/* Tier number badge */}
              <View
                style={[
                  seasonStyles.tierNumBadge,
                  { backgroundColor: unlocked ? r.color : colors.button2, borderColor: unlocked ? r.borderActive : 'rgba(255,255,255,0.06)' },
                ]}
              >
                <Text style={[seasonStyles.tierNumBadgeText, { color: unlocked ? '#0E0E0E' : colors.button1 }]}>
                  {index + 1}
                </Text>
              </View>
            </View>

            <View style={seasonStyles.tierInfo}>
              <View style={seasonStyles.tierChipRow}>
                <StarRow count={r.stars} color={iconColor} dim={!unlocked} />
                {isCurrent && (
                  <View style={[seasonStyles.currentChip, { backgroundColor: r.color + '22', borderColor: r.color + '88' }]}>
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
              <Text style={[seasonStyles.tierTitle, !unlocked && seasonStyles.tierTitleLocked]} numberOfLines={1}>
                {unlocked ? tier.title : '???'}
              </Text>
              <Text style={seasonStyles.tierSub} numberOfLines={1}>
                {tier.subtitle}
              </Text>
              <View style={seasonStyles.tierMetaRow}>
                <Text style={[seasonStyles.tierXpReq, { color: unlocked ? r.color : colors.button1 }]}>
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
    opacity: isFrontier
      ? interpolate(pulse.value, [0, 1], [0.78, 1], Extrapolation.CLAMP)
      : 1,
    transform: [
      {
        scale: isFrontier
          ? interpolate(pulse.value, [0, 1], [0.94, 1.06], Extrapolation.CLAMP)
          : 1,
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
  const gemColor = isFrontier
    ? fromColor
    : bothUnlocked
      ? toColor
      : fromColor;
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
      <Reanimated.View
        style={[seasonStyles.tierConnectorNode, nodeStyle]}
      >
        <MaterialCommunityIcons
          name="star-four-points"
          size={22}
          color={gemBorder}
        />
      </Reanimated.View>
      <LinearGradient
        colors={[gemBorder, 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={seasonStyles.tierConnectorSideLine}
      />
      {[0, 1, 2, 3, 4].map(i => (
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
  const { totalXP, levelInfo, levelTitle } = useXP();

  const daysLeft = Math.max(0, Math.ceil((SEASON_END.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const currentTierIndex = SEASON_TIERS.reduce((best, tier, i) => totalXP >= tier.xp ? i : best, 0);
  const currentTier = SEASON_TIERS[currentTierIndex];
  const nextTier = SEASON_TIERS[currentTierIndex + 1];
  const seasonPct = nextTier
    ? Math.min(100, Math.round(((totalXP - currentTier.xp) / (nextTier.xp - currentTier.xp)) * 100))
    : 100;
  const currentRarity = RARITY[tierToRarity(currentTierIndex)];

  return (
    <Reanimated.View
      entering={FadeIn.duration(260).easing(Easing.out(Easing.quad))}
      style={seasonStyles.banner}
    >
      {/* Base diagonal gradient — project-neutral wash */}
      <LinearGradient
        colors={['#1C2521', '#1A1919', '#171716']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Rarity-tinted accent wash from current tier */}
      <LinearGradient
        colors={[currentRarity.glow, 'transparent', currentRarity.ringOuter]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Edge vignette */}
      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'transparent', 'transparent', 'rgba(0,0,0,0.6)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Shimmer pass */}
      <BannerShimmer />

      {/* Top row */}
      <View style={seasonStyles.bannerTop}>
        <View style={[seasonStyles.seasonBadge, { borderColor: currentRarity.borderActive, backgroundColor: currentRarity.color + '14' }]}>
          <View style={[seasonStyles.seasonBadgeDot, { backgroundColor: currentRarity.color }]} />
          <Text style={[seasonStyles.seasonBadgeText, { color: currentRarity.color }]}>SEASON I · FREE TRACK</Text>
        </View>
        <View style={seasonStyles.bannerTopRight}>
          <View style={[seasonStyles.levelChip, { borderColor: levelTitle.color + '66', backgroundColor: levelTitle.color + '14' }]}>
            <Text style={[seasonStyles.levelChipLabel, { color: levelTitle.color }]}>LV</Text>
            <Text style={[seasonStyles.levelChipNum, { color: levelTitle.color }]}>{levelInfo.level}</Text>
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
          {/* Particles for legendary current tier */}
          {currentRarity.particle && (
            <View pointerEvents="none" style={seasonStyles.heroParticleLayer}>
              {PARTICLE_OFFSETS.slice(0, 4).map((p, i) => (
                <Particle key={i} x={p.x * 0.7} delay={p.delay} color={currentRarity.color} />
              ))}
            </View>
          )}
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
            <Text style={[seasonStyles.currentRankLabel, { color: currentRarity.color }]}>CURRENT RANK</Text>
            <StarRow count={currentRarity.stars} color={currentRarity.color} />
          </View>
          <Text style={seasonStyles.currentRankTitle} numberOfLines={1}>{currentTier.title}</Text>
          <Text style={seasonStyles.currentRankSub} numberOfLines={1}>{currentTier.subtitle}</Text>
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
              {nextTier.xp.toLocaleString()} <Text style={{ color: colors.button1 }}>→ {nextTier.title}</Text>
            </Text>
          ) : (
            <Text style={[seasonStyles.bannerNext, { color: currentRarity.color }]}>MAX RANK</Text>
          )}
        </View>
      </View>
    </Reanimated.View>
  );
}

function YourTitlesSection({ equippedTitle, onEquip }: { equippedTitle: string | null; onEquip: (title: string | null) => void }) {
  const { totalXP } = useXP();
  const [modalOpen, setModalOpen] = useState(false);

  const allUnlocked = SEASON_TIERS
    .map((t, i) => ({ ...t, _i: i }))
    .filter(t => totalXP >= t.xp);
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
          const r = RARITY[tierToRarity(tier._i)];
          const isEquipped = equippedTitle === tier.title;
          return (
            <Reanimated.View
              key={tier.title}
              entering={FadeInDown.delay(40 + idx * 50).duration(220).springify()}
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
  { key: 'all',       label: 'ALL'        },
  { key: 'legendary', label: 'LEGENDARY'  },
  { key: 'epic',      label: 'EPIC'       },
  { key: 'rare',      label: 'RARE'       },
  { key: 'uncommon',  label: 'UNCOMMON'   },
  { key: 'common',    label: 'COMMON'     },
];

const SEASON_FILTERS: { key: 'all' | 'season-1'; label: string }[] = [
  { key: 'all',      label: 'ALL'      },
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
  tiers: { title: string; subtitle: string; xp: number; _i: number }[];
  equippedTitle: string | null;
  onEquip: (title: string | null) => void;
}) {
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

  const activeRarity = RARITY_FILTERS.find(f => f.key === rarityFilter) ?? RARITY_FILTERS[0];
  const activeSeason = SEASON_FILTERS.find(f => f.key === seasonFilter) ?? SEASON_FILTERS[0];
  const rarityTint = rarityFilter !== 'all' ? RARITY[rarityFilter].color : colors.accent;
  const seasonTint = colors.accent;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...tiers]
      .reverse()
      .filter(t => rarityFilter === 'all' || tierToRarity(t._i) === rarityFilter)
      .filter(t => seasonFilter === 'all' || seasonFilter === 'season-1')
      .filter(t => !q || t.title.toLowerCase().includes(q) || t.subtitle.toLowerCase().includes(q));
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
            <View style={styles.seasonDividerLine} />
            <MaterialCommunityIcons name="star-four-points" size={10} color={colors.accent} />
            <Text style={styles.seasonDividerText}>YOUR TITLES</Text>
            <MaterialCommunityIcons name="star-four-points" size={10} color={colors.accent} />
            <View style={styles.seasonDividerLine} />
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
                  setOpenDropdown(d => (d === 'rarity' ? null : 'rarity'));
                }}
                style={allTitlesStyles.dropdownBtn}
              >
                <Text style={allTitlesStyles.dropdownLabel}>RARITY</Text>
                <View style={[allTitlesStyles.dropdownValuePill, { backgroundColor: rarityTint + '18' }]}>
                  <Text style={[allTitlesStyles.dropdownValueText, { color: rarityTint }]} numberOfLines={1}>
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
                  {RARITY_FILTERS.map(f => {
                    const isActive = rarityFilter === f.key;
                    const tint = f.key !== 'all' ? RARITY[f.key].color : colors.accent;
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
                        <View style={[allTitlesStyles.dropdownOptionDot, { backgroundColor: tint }]} />
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
                  setOpenDropdown(d => (d === 'season' ? null : 'season'));
                }}
                style={allTitlesStyles.dropdownBtn}
              >
                <Text style={allTitlesStyles.dropdownLabel}>SEASON</Text>
                <View style={[allTitlesStyles.dropdownValuePill, { backgroundColor: seasonTint + '18' }]}>
                  <Text style={[allTitlesStyles.dropdownValueText, { color: seasonTint }]} numberOfLines={1}>
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
                  {SEASON_FILTERS.map(f => {
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
                        <View style={[allTitlesStyles.dropdownOptionDot, { backgroundColor: seasonTint }]} />
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
                const r = RARITY[tierToRarity(tier._i)];
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
  const { totalXP, xpLog, achievementXP } = useXP();
  const currentTierIndex = SEASON_TIERS.reduce((best, tier, i) => totalXP >= tier.xp ? i : best, 0);

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
          const prevColor = i > 0 ? RARITY[tierToRarity(i - 1)].color : '#FFFFFF';
          const thisColor = RARITY[tierToRarity(i)].color;
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
  const icon = TIER_ICONS[tierIndex] ?? 'award';
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
          backgroundColor: isEquipped ? rarity.color + '14' : rarity.gradient[1],
        },
        pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
      ]}
    >
      <View
        style={[
          titleCardStyles.iconWrap,
          {
            backgroundColor: rarity.color + '14',
            borderColor: isEquipped ? rarity.borderActive : rarity.borderIdle,
          },
        ]}
      >
        <Feather name={icon} size={18} color={rarity.color} />
      </View>
      <View style={titleCardStyles.starRow}>
        {Array.from({ length: rarity.stars }).map((_, i) => (
          <Text
            key={i}
            style={{
              color: rarity.color,
              fontSize: 7,
              lineHeight: 7,
              marginRight: 1,
              opacity: isEquipped ? 1 : 0.55,
            }}
          >★</Text>
        ))}
      </View>
      <Text style={titleCardStyles.title} numberOfLines={1}>
        {tier.title}
      </Text>
      <Text
        style={[
          titleCardStyles.action,
          { color: isEquipped ? rarity.color : colors.button1 },
        ]}
      >
        {isEquipped ? 'EQUIPPED' : 'EQUIP'}
      </Text>
    </Pressable>
  );
}

const titleCardStyles = StyleSheet.create({
  card: {
    width: TITLE_CARD_WIDTH,
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 2,
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

// ─── Screen ────────────────────────────────────────────────

const AchievementsScreen: React.FC = () => {
  const { session: authSession } = useAuth();
  const [allSessions, setAllSessions] = useState<WorkoutSession[]>([]);
  const { equippedSeasonTitle, equipSeasonTitle } = useSettings();

  // ── pager ──────────────────────────────────────────────────
  const [tabIndex, setTabIndex] = useState(0);
  const tabIndexRef    = useRef(0);
  const translateX     = useRef(new Animated.Value(0)).current;
  const dragStartValue = useRef(0);
  const isHorizontal   = useRef(false);

  const snapToIndex = useCallback((index: number, velocityX = 0) => {
    tabIndexRef.current = index;
    setTabIndex(index);
    Animated.spring(translateX, {
      toValue: -index * SCREEN_WIDTH,
      useNativeDriver: true,
      velocity: -velocityX,
      tension: 68,
      friction: 11,
      overshootClamping: false,
    }).start();
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, gs) => {
        const horizontal = Math.abs(gs.dx) > Math.abs(gs.dy) * 1.8 && Math.abs(gs.dx) > 8;
        isHorizontal.current = horizontal;
        return horizontal;
      },
      onPanResponderGrant: () => {
        translateX.stopAnimation(v => { dragStartValue.current = v; });
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
        const goPrev = dx >  SWIPE_DISTANCE_THRESHOLD || vx >  SWIPE_VELOCITY_THRESHOLD;
        if      (goNext && idx < TAB_COUNT - 1) snapToIndex(idx + 1, vx);
        else if (goPrev && idx > 0)             snapToIndex(idx - 1, vx);
        else                                    snapToIndex(idx, vx);
      },
      onPanResponderTerminate: () => { snapToIndex(tabIndexRef.current, 0); },
    }),
  ).current;

  useFocusEffect(
    useCallback(() => {
      const userId = authSession?.user.id;
      if (!userId) return;
      sbLoadAllSessions(userId)
        .then(setAllSessions)
        .catch(e => console.error('AchievementsScreen: failed to load sessions', e));
    }, [authSession?.user.id]),
  );

  const totalSessions = allSessions.length;
  const currentStreak = getCurrentStreak(allSessions);
  const longestStreak = getLongestStreak(allSessions);
  const uniqueDays = new Set(allSessions.map(s => dayKey(new Date(s.date)))).size;

  let totalVolume = 0;
  const exerciseNames = new Set<string>();
  let hasMarathon = false;
  let earlyLateCount = 0;
  const maxKgByExercise: Record<string, number> = {};
  let prCount = 0;

  for (const s of allSessions) {
    if (s.duration > 5400) hasMarathon = true;
    const hour = new Date(s.date).getHours();
    if (hour < 8 || hour >= 20) earlyLateCount++;
    for (const ex of s.exercises) {
      if (ex.name === 'Warm-up' || ex.name === 'Cooldown') continue;
      exerciseNames.add(ex.name);
      for (const set of ex.sets) {
        if (set.label === 'W') continue;
        const kg = set.kg ?? 0;
        totalVolume += kg * (set.reps ?? 0);
        if (kg > (maxKgByExercise[ex.name] ?? 0)) {
          if (maxKgByExercise[ex.name] !== undefined) prCount++;
          maxKgByExercise[ex.name] = kg;
        }
      }
    }
  }

  const achievements: Achievement[] = [
    { id: 'first', title: 'First Rep', description: 'Complete your first workout', icon: 'activity', unlocked: totalSessions >= 1, xp: 25, progress: totalSessions, target: 1 },
    { id: '10sessions', title: 'Getting Serious', description: 'Log 10 workout sessions', icon: 'zap', unlocked: totalSessions >= 10, xp: 50, progress: totalSessions, target: 10 },
    { id: '50sessions', title: 'Dedicated Athlete', description: 'Log 50 workout sessions', icon: 'award', unlocked: totalSessions >= 50, xp: 150, progress: totalSessions, target: 50 },
    { id: '100sessions', title: 'Century Club', description: 'Log 100 workout sessions', icon: 'star', unlocked: totalSessions >= 100, xp: 300, progress: totalSessions, target: 100 },
    { id: 'streak3', title: 'On Fire', description: 'Maintain a 3-day streak', icon: 'trending-up', unlocked: currentStreak >= 3, xp: 30, progress: currentStreak, target: 3 },
    { id: 'streak7', title: 'Week Warrior', description: '7-day longest streak', icon: 'calendar', unlocked: longestStreak >= 7, xp: 75, progress: longestStreak, target: 7 },
    { id: 'streak30', title: 'Month of Iron', description: '30-day longest streak', icon: 'sun', unlocked: longestStreak >= 30, xp: 200, progress: longestStreak, target: 30 },
    { id: 'volume10k', title: 'Mover of Iron', description: 'Lift 10,000 kg total', icon: 'layers', unlocked: totalVolume >= 10000, xp: 50, progress: Math.round(totalVolume), target: 10000 },
    { id: 'volume100k', title: 'Iron Giant', description: 'Lift 100,000 kg total', icon: 'shield', unlocked: totalVolume >= 100000, xp: 150, progress: Math.round(totalVolume), target: 100000 },
    { id: 'volume500k', title: 'Titan', description: 'Lift 500,000 kg total', icon: 'hexagon', unlocked: totalVolume >= 500000, xp: 300, progress: Math.round(totalVolume), target: 500000 },
    { id: 'consistency30', title: 'Creature of Habit', description: 'Train on 30 distinct days', icon: 'repeat', unlocked: uniqueDays >= 30, xp: 75, progress: uniqueDays, target: 30 },
    { id: 'early_late', title: 'Dedicated Hours', description: '10 sessions before 8am or after 8pm', icon: 'moon', unlocked: earlyLateCount >= 10, xp: 40, progress: earlyLateCount, target: 10 },
    { id: 'variety', title: 'Variety Pack', description: 'Use 10 different exercises', icon: 'grid', unlocked: exerciseNames.size >= 10, xp: 50, progress: exerciseNames.size, target: 10 },
    { id: 'pr5', title: 'PR Hunter', description: 'Set 5 personal records', icon: 'target', unlocked: prCount >= 5, xp: 75, progress: prCount, target: 5 },
    { id: 'marathon', title: 'Marathon', description: 'Single session over 90 minutes', icon: 'watch', unlocked: hasMarathon, xp: 40, progress: hasMarathon ? 1 : 0, target: 1 },
  ];

  // ── Rarity filter ──
  const [filter, setFilter] = useState<Rarity | 'all'>('all');

  // Count by rarity (across all achievements regardless of unlocked status)
  const counts = useMemo<Record<Rarity | 'all', number>>(() => {
    const c: Record<Rarity | 'all', number> = {
      all: achievements.length,
      legendary: 0, epic: 0, rare: 0, uncommon: 0, common: 0,
    };
    for (const a of achievements) c[rarityFromXP(a.xp)]++;
    return c;
  }, [achievements]);

  const filtered = useMemo(
    () => filter === 'all' ? achievements : achievements.filter(a => rarityFromXP(a.xp) === filter),
    [filter, achievements],
  );

  // Sort: unlocked legendaries first by rarity descending, then locked by rarity descending
  const rarityRank: Record<Rarity, number> = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
  const unlocked = useMemo(
    () => filtered.filter(a => a.unlocked).sort((a, b) => rarityRank[rarityFromXP(a.xp)] - rarityRank[rarityFromXP(b.xp)]),
    [filtered],
  );
  const locked = useMemo(
    () => filtered.filter(a => !a.unlocked).sort((a, b) => rarityRank[rarityFromXP(a.xp)] - rarityRank[rarityFromXP(b.xp)]),
    [filtered],
  );

  const UNLOCKED_VISIBLE = 3;
  const LOCKED_VISIBLE = 5;
  const [unlockedExpanded, setUnlockedExpanded] = useState(false);
  const [lockedExpanded, setLockedExpanded]     = useState(false);
  const [seasonOpen, setSeasonOpen]             = useState(true);
  const [lifetimeOpen, setLifetimeOpen]         = useState(true);

  const visibleUnlocked = unlockedExpanded ? unlocked : unlocked.slice(0, UNLOCKED_VISIBLE);
  const visibleLocked   = lockedExpanded   ? locked   : locked.slice(0, LOCKED_VISIBLE);

  // ── Detail modal ──
  const [selected, setSelected] = useState<Achievement | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <View style={achStyles.header}>

      {/* ── Tab bar + dots ─────────────────────────────────── */}
      <SwipeTabs
        tabs={[...TAB_LABELS]}
        translateX={translateX}
        screenWidth={SCREEN_WIDTH}
        activeIndex={tabIndex}
        onTabPress={snapToIndex}
      />
      </View>{/* end header */}

      {/* ── Pager ──────────────────────────────────────────── */}
      <View style={{ flex: 1, overflow: 'hidden' }} {...panResponder.panHandlers}>
        <Animated.View style={{ flexDirection: 'row', width: SCREEN_WIDTH * TAB_COUNT, flexGrow: 1, alignSelf: 'stretch', transform: [{ translateX }] }}>

          {/* Page 0 — Achievements */}
          <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <SeasonBanner />

            <Pressable
              style={styles.seasonDivider}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setSeasonOpen(o => !o);
              }}
            >
              <View style={styles.seasonDividerSpacer} />
              <View style={styles.seasonDividerLine} />
              <MaterialCommunityIcons name="star-four-points" size={10} color={colors.accent} />
              <Text style={styles.seasonDividerText}>CURRENT SEASON</Text>
              <MaterialCommunityIcons name="star-four-points" size={10} color={colors.accent} />
              <View style={styles.seasonDividerLine} />
              <Feather
                name={seasonOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.accent}
              />
            </Pressable>

            {seasonOpen && (
              <>
                <YourTitlesSection equippedTitle={equippedSeasonTitle} onEquip={equipSeasonTitle} />
                <AllRanksSection />
              </>
            )}

            <Pressable
              style={styles.seasonDivider}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setLifetimeOpen(o => !o);
              }}
            >
              <View style={styles.seasonDividerSpacer} />
              <View style={styles.seasonDividerLine} />
              <MaterialCommunityIcons name="star-four-points" size={10} color={colors.accent} />
              <Text style={styles.seasonDividerText}>LIFETIME ACHIEVEMENTS</Text>
              <MaterialCommunityIcons name="star-four-points" size={10} color={colors.accent} />
              <View style={styles.seasonDividerLine} />
              <Feather
                name={lifetimeOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.accent}
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
                    <View style={styles.sectionDot} />
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
                      setUnlockedExpanded(e => !e);
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather name={unlockedExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.button1} />
                    <Text style={styles.expandLabel}>{unlockedExpanded ? 'Show less' : `${unlocked.length - UNLOCKED_VISIBLE} more`}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {locked.length > 0 && (
              <View style={styles.section}>
                <Reanimated.View
                  entering={SlideInRight.delay(80).duration(220).easing(Easing.out(Easing.quad))}
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
                      setLockedExpanded(e => !e);
                    }}
                    activeOpacity={0.7}
                  >
                    <Feather name={lockedExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.button1} />
                    <Text style={styles.expandLabel}>{lockedExpanded ? 'Show less' : `${locked.length - LOCKED_VISIBLE} more`}</Text>
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
          <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
            <LeaderboardView />
          </View>

          {/* Page 2 — Store */}
          <View style={{ width: SCREEN_WIDTH, flex: 1 }} />

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
  sectionCountText: { fontSize: 10, fontWeight: '800', color: colors.titleText, letterSpacing: 0.4 },

  // expand button
  expandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
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
    backgroundColor: 'rgba(0, 250, 154, 0.35)',
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

// ─── Leaderboard styles ────────────────────────────────────

const leaderboardStyles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 100,
    gap: 18,
  },
  modePillBar: {
    flexDirection: 'row',
    backgroundColor: colors.button3,
    borderRadius: 999,
    padding: 3,
    gap: 3,
  },
  modePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  modePillActive: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  modePillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  // ── Chase divider (matches CURRENT SEASON style) ─────────
  chaseDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
    marginBottom: 2,
  },
  chaseDividerLine: {
    flex: 1,
    maxWidth: 56,
    height: 1,
    backgroundColor: 'rgba(0, 250, 154, 0.35)',
  },
  chaseDividerText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
    color: colors.accent,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

const topShowcaseStyles = StyleSheet.create({
  card: {
    borderRadius: 18,
    paddingTop: 16,
    paddingBottom: 22,
    paddingHorizontal: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
  },
  slot: {
    alignItems: 'center',
    flex: 1,
  },
  tileWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  glowRing: {
    position: 'absolute',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 6,
  },
  rankLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.button1,
    letterSpacing: 1,
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E5E5E5',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  nameFirst: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F4F4F4',
  },
  xp: {
    fontSize: 13,
    fontWeight: '700',
    fontStyle: 'italic',
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
  xpFirst: {
    fontSize: 16,
  },
});

const chaseStyles = StyleSheet.create({
  panel: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(255,255,255,0.015)',
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

const youBarStyles = StyleSheet.create({
  outer: {
    position: 'relative',
  },
  fadeStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -20,
    height: 20,
  },
  bar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 18,
    backgroundColor: '#1A1919',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.container,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.4,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 6,
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
  youPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
  },
  youPillText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
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
  endCol: {
    alignItems: 'flex-end',
    gap: 1,
    minWidth: 56,
  },
  climbNum: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
  climbLabel: {
    fontSize: 9,
    color: colors.button1,
    fontWeight: '800',
    letterSpacing: 0.6,
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
    minWidth: 50,
  },
  xpText: { fontSize: 14, fontWeight: '900', letterSpacing: 0.2, lineHeight: 16 },
  xpLabel: { fontSize: 8, fontWeight: '800', letterSpacing: 1 },

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
  barTrack: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 3, borderRadius: 2 },
  progressLabel: { fontSize: 9, color: '#7A7A7A', minWidth: 50, textAlign: 'right', fontWeight: '600' },
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
    top: 0, left: 0, right: 0, bottom: 0,
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
