import React from 'react';
import { Modal, View, Text, Pressable, TouchableOpacity } from 'react-native';
import { styles } from './SharedStyles';

type RowWithReps = { reps: number };

type Props<T extends RowWithReps> = {
  visible: boolean;
  selectedRowIndex: number | null;
  exercises: T[];
  onUpdate: <K extends keyof T>(index: number, key: K, value: T[K]) => void;
  onClose: () => void;
};

const MIN_REPS = 1;
const MAX_REPS = 30;
const DEFAULT_REPS = 3;

export default function RepsModal<T extends RowWithReps>({
  visible,
  selectedRowIndex,
  exercises,
  onUpdate,
  onClose,
}: Props<T>) {
  const currentReps =
    selectedRowIndex !== null
      ? exercises[selectedRowIndex]?.reps || DEFAULT_REPS
      : DEFAULT_REPS;

  const updateReps = (value: number) => {
    if (selectedRowIndex === null) return;
    const clamped = Math.max(MIN_REPS, Math.min(MAX_REPS, value));
    onUpdate(selectedRowIndex, 'reps', clamped);
  };

  const isMin = currentReps <= MIN_REPS;
  const isMax = currentReps >= MAX_REPS;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select REPS</Text>

            <View style={styles.stepperContainer}>
              <Pressable
                onPress={() => !isMin && updateReps(currentReps - 1)}
                disabled={isMin}
                style={[styles.stepButton, isMin && styles.stepButtonDisabled]}
              >
                <Text style={styles.stepButtonText}>−</Text>
              </Pressable>

              <Text style={styles.repsValue}>{currentReps}</Text>

              <Pressable
                onPress={() => !isMax && updateReps(currentReps + 1)}
                disabled={isMax}
                style={[styles.stepButton, isMax && styles.stepButtonDisabled]}
              >
                <Text style={styles.stepButtonText}>+</Text>
              </Pressable>
            </View>

            <Pressable style={styles.doneButtonModal} onPress={onClose}>
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
