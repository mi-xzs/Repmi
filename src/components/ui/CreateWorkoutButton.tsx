import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/HomeStackNavigator';
import { Feather } from '@expo/vector-icons';
import { useAccent } from '../../services/SettingsContext';

type HomeStackNavProp = NativeStackNavigationProp<HomeStackParamList, 'CreateWorkout'>;

export const CreateWorkoutButton = () => {
  const navigation = useNavigation<HomeStackNavProp>();
  const { accent } = useAccent();

  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={() => navigation.navigate('CreateWorkout')}
      activeOpacity={0.8}
    >
      <Feather name="plus" size={30} color={accent} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 88,
    right: 24,
  },
});
