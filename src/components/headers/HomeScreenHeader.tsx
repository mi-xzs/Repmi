import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Image, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { useXP } from '../../services/XPContext';
import { useProfile } from '../../services/ProfileContext';
import { useAccent } from '../../services/SettingsContext';
import { useNavigation } from '@react-navigation/native';

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export const HomeScreenHeader = () => {
  const { levelInfo, levelTitle } = useXP();
  const { profile } = useProfile();
  const navigation = useNavigation<any>();

  const { accent } = useAccent();
  const displayName = profile?.username || levelTitle.title;
  const xpProgress = Math.max(0, Math.min(1, levelInfo.progress));
  const green = accent;

  // Animate the XP bar fill — spring on each change so XP gains read as a felt event.
  const xpWidth = useSharedValue(xpProgress);
  useEffect(() => {
    xpWidth.value = withSpring(xpProgress, {
      damping: 18,
      stiffness: 120,
      mass: 0.6,
    });
  }, [xpProgress, xpWidth]);

  const xpFillStyle = useAnimatedStyle(() => ({
    width: `${xpWidth.value * 100}%`,
  }));

  return (
    <View style={styles.header}>
      {/* Avatar */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Profile')}
        style={[styles.avatarWrapper, { borderColor: colors.button2}]}
      >
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: colors.container }]}>
            <Text style={[styles.avatarLevel, { color: green }]}>
              {levelInfo.level}
            </Text>
          </View>
        )}
        {/* Level badge */}
        <View style={[styles.levelBadge, { backgroundColor: green }]}>
          <Text style={styles.levelBadgeText}>{levelInfo.level}</Text>
        </View>
      </TouchableOpacity>

      {/* Text + XP bar */}
      <View style={styles.textContainer}>
        <Text style={styles.greetingText}>{getGreeting()}</Text>
        <Text style={styles.nameText} numberOfLines={1}>{displayName}</Text>

        {/* XP bar row */}
        <View style={styles.xpRow}>
          <View style={styles.xpBarTrack}>
            <Animated.View style={[styles.xpBarFill, xpFillStyle, { backgroundColor: green }]} />
          </View>
          <Text style={[styles.xpLabel, { color: green }]}>
            {levelInfo.currentLevelXP}/{levelInfo.xpForNextLevel} XP
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    gap: 14,
  },

  avatarWrapper: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    overflow: 'visible',
    position: 'relative',
    flexShrink: 0,
  },
  avatarImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  avatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLevel: {
    fontSize: 18,
    fontWeight: '800',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  levelBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.background,
  },

  textContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  greetingText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
    color: colors.titleText,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  nameText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.highlight,
    letterSpacing: -0.3,
  },

  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  xpBarTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.container,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  xpLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
    flexShrink: 0,
  },
});
