// src/components/ui/Avatar.tsx
import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

type AvatarProps = {
  uri?: string | number;           // remote URL or local require
  size?: number;                   // width/height
  borderColor?: string;            // optional border color
  borderWidth?: number;            // optional border thickness
  style?: ViewStyle | ViewStyle[]; // allows parent to pass extra styles
};

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  size = 50,
  borderColor,
  borderWidth = 0,
  style,
}) => {
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor,
          borderWidth,
        },
        style, // override/additional styles from parent
      ]}
    >
      {uri ? (
        <Image
          source={typeof uri === 'number' ? uri : { uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        // No avatar set — render a neutral person-icon placeholder.
        <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
          <Feather name="user" size={size * 0.55} color={colors.highlight} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'transparent', // fallback background
  },
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.container,
  },
});
