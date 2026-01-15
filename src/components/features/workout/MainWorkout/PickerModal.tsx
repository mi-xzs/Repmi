import React, { useRef, useEffect } from 'react';
import { Modal, View, Text, Pressable, FlatList } from 'react-native';
import { styles } from '../Shared/SharedStyles';

const ROW_HEIGHT = 80;
const VISIBLE_ITEMS = 3;

type Props = {
  visible: boolean;
  modalType: 'sets' | 'kg' | 'reps';
  pickerData: (string | number)[];
  selectedRowIndex: number;
  rows: { sets: number; kg: number; reps: number; done: boolean }[];
  onUpdate: (index: number) => void;
  onClose: () => void;
};

export default function PickerModal({ visible, modalType, pickerData, selectedRowIndex, rows, onUpdate, onClose }: Props) {
  const wheelRef = useRef<FlatList>(null);

  const getSelectedIndex = (offset: number) => Math.round(offset / ROW_HEIGHT);

  useEffect(() => {
    if (visible) {
      const value = rows[selectedRowIndex][modalType] as number;
      setTimeout(() => {
        wheelRef.current?.scrollToOffset({
          offset: value * ROW_HEIGHT,
          animated: false,
        });
      }, 50);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select {modalType.toUpperCase()}</Text>
          <View style={styles.timeContainer}>
            <View style={[styles.highlightOverlay, { top: ROW_HEIGHT * Math.floor(VISIBLE_ITEMS / 2) }]} />
            <FlatList
              ref={wheelRef}
              data={pickerData}
              keyExtractor={item => item.toString()}
              renderItem={({ item }) => (
                <View style={styles.wheelItem}>
                  <Text style={styles.wheelText}>{item}</Text>
                </View>
              )}
              showsVerticalScrollIndicator={false}
              snapToInterval={ROW_HEIGHT}
              decelerationRate="fast"
              onMomentumScrollEnd={e => onUpdate(getSelectedIndex(e.nativeEvent.contentOffset.y))}
              style={styles.wheel}
              contentContainerStyle={{ paddingVertical: ROW_HEIGHT * Math.floor(VISIBLE_ITEMS / 2) }}
            />
          </View>
          <Pressable style={styles.doneButtonModal} onPress={onClose}>
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

