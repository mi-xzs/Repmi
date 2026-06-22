import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { colors } from '../../theme/colors';

type Props = {
  onPress: () => void;
  label?: string;
};


export default function CancelButton({ onPress, label = 'Cancel' }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.2}
      style={{
        backgroundColor: colors.button1,
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 20,
      }}
    >
      <Text style={{ color: colors.button2, fontWeight: '600' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}