import React, { useState } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

interface AddExerciseButtonProps {
  onPress: () => void;
}

export default function AddExerciseButton({ onPress }: AddExerciseButtonProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.button,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.text}>+ Add</Text>
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
    borderColor: colors.button3,
    alignSelf: 'flex-start', 
    marginTop: 10,
  },
  pressed: {
    opacity: 0.6,
  },
  text: {
    color: colors.button3,
    fontWeight: 'bold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
});
