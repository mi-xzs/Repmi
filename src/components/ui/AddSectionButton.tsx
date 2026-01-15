import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface AddSectionButtonProps {
  onPress: () => void;
}

export default function AddSectionButton({ onPress }: AddSectionButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        pressed && { opacity: 0.6 }, // <-- opacity effect
      ]}
      onPress={onPress}
    >
      <Text style={styles.text}>+ Section</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.container,
    paddingVertical: 2,
    paddingHorizontal: 10, 
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    borderWidth: 4,
    borderColor: colors.button2,
    alignSelf: 'flex-start', 
  },
  text: {
    color: colors.button2,
    fontWeight: 'bold',
    fontSize: 16,
    textTransform: 'uppercase',
  },
});
