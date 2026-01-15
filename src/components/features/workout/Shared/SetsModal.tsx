import React from 'react';
import { Modal, View, Text, Pressable, TouchableOpacity } from 'react-native';
import { styles } from './SharedStyles';

type Props = {
  visible: boolean;
  value: number;
  onUpdate: (value: number) => void;
  onClose: () => void;
};

const MIN_SETS = 1;
const MAX_SETS = 10;

export default function SetsModal({ visible, value, onUpdate, onClose }: Props) {
  const update = (next: number) => {
    onUpdate(Math.max(MIN_SETS, Math.min(MAX_SETS, next)));
  };

  const isMin = value <= MIN_SETS;
  const isMax = value >= MAX_SETS;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select SETS</Text>

            <View style={styles.stepperContainer}>
              <Pressable
                onPress={() => !isMin && update(value - 1)}
                disabled={isMin}
                style={[styles.stepButton, isMin && styles.stepButtonDisabled]}
              >
                <Text style={styles.stepButtonText}>−</Text>
              </Pressable>

              <Text style={styles.repsValue}>{value}</Text>

              <Pressable
                onPress={() => !isMax && update(value + 1)}
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
