import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface DeleteButtonProps {
  onPress: () => void;
}

export default function DeleteButton({ onPress }: DeleteButtonProps) {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Text style={styles.text}>✕</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 24,             // smaller width
    height: 24,            // smaller height
    backgroundColor: colors.container,
    borderRadius: 12,      // half of width/height for perfect circle
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 12,          // smaller font to fit the smaller circle
    color: colors.button2,
    fontWeight: 'bold',
  },
});
