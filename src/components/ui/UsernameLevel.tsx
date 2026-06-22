import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type UsernameLevelProps = {
  username: string;
  level: number;
  style?: object;
};

export const UsernameLevel: React.FC<UsernameLevelProps> = ({
  username,
  level,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.username}>{username}</Text>
      <Text style={styles.level}>Level {level}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  username: {
    fontSize: 15,
    color: '#555',
    marginRight: 10,
    fontWeight: 'bold',
  },
  level: {
    fontSize: 14,
    color: '#555',
    marginTop: 1,
    fontWeight: 'bold'
  },
});
