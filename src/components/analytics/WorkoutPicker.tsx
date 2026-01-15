// src/components/analytics/WorkoutPicker.tsx

import React, { useEffect, useRef } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import { styles } from "../../screens/Analytics.Styles";
import { WorkoutPickerProps } from "../../types/analytics";

const WorkoutPicker: React.FC<WorkoutPickerProps> = ({
  visible,
  workouts,
  selectedIndex,
  onSelect,
  onClose,
}) => {

  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0.92);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >

      <Pressable style={styles.overlay} onPress={onClose}>

        <BlurView
          intensity={25}
          tint="dark"
          style={styles.blur}
        />

        <Animated.View
          style={[
            styles.pickerSheet,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >

          {/* Prevent closing when tapping inside */}
          <Pressable>

            <View style={styles.pickerHandle} />

            <Text style={styles.pickerTitle}>
              Workouts
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 10 }}
            >

              {workouts.map((w, i) => (

                <TouchableOpacity
                  key={w.id ?? `workout-${i}`}
                  activeOpacity={0.7}

                  style={[
                    styles.pickerRow,
                    i === selectedIndex && styles.pickerRowActive,
                  ]}

                  onPress={() => {
                    onSelect(i);
                    onClose();
                  }}
                >

                  <Text
                    style={[
                      styles.pickerRowText,
                      i === selectedIndex &&
                      styles.pickerRowTextActive,
                    ]}
                  >
                    {w.workoutName || `Workout ${i + 1}`}
                  </Text>

                  {i === selectedIndex && (
                    <Feather
                      name="check"
                      size={18}
                      color="#4CAF50"
                    />
                  )}

                </TouchableOpacity>

              ))}

            </ScrollView>

          </Pressable>

        </Animated.View>

      </Pressable>

    </Modal>
  );
};

export default WorkoutPicker;