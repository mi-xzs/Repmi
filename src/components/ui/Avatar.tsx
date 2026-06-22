import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

type AvatarProps = {
  uri?: string | number;
  size?: number;
  borderColor?: string;
  borderWidth?: number;
  style?: ViewStyle | ViewStyle[];
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
        style,
      ]}
    >
      {uri ? (
        <Image
          source={typeof uri === 'number' ? uri : { uri }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
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
    backgroundColor: 'transparent',
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
