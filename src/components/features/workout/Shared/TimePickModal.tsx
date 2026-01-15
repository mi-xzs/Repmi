import React, { useState, useEffect } from 'react';
import { Modal, View, Text, Pressable, TouchableOpacity } from 'react-native';
import { styles } from './SharedStyles';
import DrumWheel from './DrumWheel';
import { ExerciseRowBase } from '../../../../types/exercise';

const MINUTES = Array.from({ length: 100 }, (_, i) => i);
const SECONDS = Array.from({ length: 60 }, (_, i) => i);

type Props = {
  visible: boolean;
  selectedRowIndex: number | null;
  exercises: ExerciseRowBase[];
  onUpdate: <K extends keyof ExerciseRowBase>(index: number, key: K, value: ExerciseRowBase[K]) => void;
  onClose: () => void;
};

export default function TimePickerModal({ visible, selectedRowIndex, exercises, onUpdate, onClose }: Props) {
  const [initMin, setInitMin] = useState(0);
  const [initSec, setInitSec] = useState(0);

  useEffect(() => {
    if (visible && selectedRowIndex !== null) {
      setInitMin(exercises[selectedRowIndex]?.minutes ?? 0);
      setInitSec(exercises[selectedRowIndex]?.seconds ?? 0);
    }
  }, [visible, selectedRowIndex]);

  const handleMinutes = (val: number) => {
    if (selectedRowIndex === null) return;
    onUpdate(selectedRowIndex, 'minutes', val);
  };

  const handleSeconds = (val: number) => {
    if (selectedRowIndex === null) return;
    onUpdate(selectedRowIndex, 'seconds', val);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Duration</Text>
            <View style={styles.timeContainer}>
              <DrumWheel items={MINUTES} initialIndex={initMin} label="min" onSelect={handleMinutes} />
              <Text style={styles.timeSeparator}>:</Text>
              <DrumWheel items={SECONDS} initialIndex={initSec} label="sec" onSelect={handleSeconds} />
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
