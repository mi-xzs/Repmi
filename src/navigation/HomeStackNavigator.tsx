import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import CreateWorkoutScreen from '../screens/CreateWorkoutScreen';
import WorkoutScreen from '../screens/WorkoutScreen';
import { WorkoutData } from '../types/exercise'; // <-- import correct type

export type HomeStackParamList = {
  Home: undefined;
  CreateWorkout: { existingWorkout?: WorkoutData; workoutIndex?: number } | undefined;
  WorkoutScreen: { workoutData: WorkoutData; workoutIndex: number };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="CreateWorkout"
        component={CreateWorkoutScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="WorkoutScreen"
        component={WorkoutScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
