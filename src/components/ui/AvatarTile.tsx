// src/components/ui/AvatarTile.tsx
//
// Compact avatar that prefers a remote image, falls back to colored
// initials. Used across achievements/leaderboard tiles and the
// user-peek modal so a single visual treatment travels everywhere.

import React from 'react';
import { View, Image, Text } from 'react-native';

export function getInitials(name?: string | null): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function AvatarTile({
  size,
  color,
  avatarUrl,
  name,
  glow,
  shape = 'square',
}: {
  size: number;
  color: string;
  avatarUrl?: string | null;
  name?: string | null;
  glow?: boolean;
  // 'square' keeps the rounded-rectangle tile used by ChaseRow +
  // YourStandingCard. 'circle' is for podium pillars and peek cards.
  shape?: 'square' | 'circle';
}) {
  const radius = shape === 'circle' ? size / 2 : Math.max(6, Math.round(size * 0.25));
  // Initials font scales with tile size — ~42% lands well for the
  // 26–92px tiles tested across leaderboard + peek surfaces.
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
