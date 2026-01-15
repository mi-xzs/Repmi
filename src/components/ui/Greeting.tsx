import React from 'react';
import { Text, StyleSheet } from 'react-native';

type GreetingProps = {
  style?: object; // optional extra styling
};

export const Greeting: React.FC<GreetingProps> = ({ style }) => {
  const getGreeting = (): string => {
    const hour = new Date().getHours(); // 0-23
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Hello!';
    return 'Good Evening!';
  };

  return <Text style={[styles.text, style]}>{getGreeting()}</Text>;
};

const styles = StyleSheet.create({
  text: {
    fontSize: 20, // ✅ set a normal readable font size
    color: '#555',
    fontWeight: 'bold'
  },
});
