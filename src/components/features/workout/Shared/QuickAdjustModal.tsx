import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../../../../theme/colors';
import { useAccent } from '../../../../services/SettingsContext';
import { styles } from './SharedStyles';

type Props = {
  visible: boolean;
  title: string;
  unit?: string;
  initialValue: number;
  steps: number[];
  min?: number;
  max?: number;
  onSave: (value: number) => void;
  onClose: () => void;
};

export default function QuickAdjustModal({
  visible,
  title,
  unit,
  initialValue,
  steps,
  min = 0,
  max = 999,
  onSave,
  onClose,
}: Props) {
  const { accent } = useAccent();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const clamp = (n: number) => Math.max(min, Math.min(max, n));

  const adjust = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setValue((prev) => clamp(prev + delta));
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(value);
    onClose();
  };

  const negSteps = steps.filter((s) => s < 0).sort((a, b) => a - b);
  const posSteps = steps.filter((s) => s > 0).sort((a, b) => a - b);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={[styles.modalContent, local.content]}>
            <Text style={styles.modalTitle}>{title}</Text>

            <View style={local.stepRow}>
              {negSteps.map((s) => (
                <Pressable
                  key={`neg-${s}`}
                  style={({ pressed }) => [local.stepPill, pressed && local.stepPillPressed]}
                  onPress={() => adjust(s)}
                >
                  <Text style={local.stepPillText}>{s}</Text>
                </Pressable>
              ))}

              <View style={local.valueWrap}>
                <TextInput
                  style={[local.valueInput, { color: accent }]}
                  keyboardType="numeric"
                  maxLength={4}
                  value={value === 0 ? '' : value.toString()}
                  placeholder="0"
                  placeholderTextColor={colors.button1}
                  onChangeText={(text) => {
                    const n = parseInt(text, 10);
                    setValue(clamp(Number.isFinite(n) ? n : 0));
                  }}
                  selectTextOnFocus
                />
                {unit ? <Text style={local.unitText}>{unit}</Text> : null}
              </View>

              {posSteps.map((s) => (
                <Pressable
                  key={`pos-${s}`}
                  style={({ pressed }) => [local.stepPill, pressed && local.stepPillPressed]}
                  onPress={() => adjust(s)}
                >
                  <Text style={local.stepPillText}>+{s}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={local.hint}>Tap the number to type a custom value</Text>

            <Pressable style={styles.doneButtonModal} onPress={handleSave}>
              <Text style={styles.doneButtonText}>Save</Text>
            </Pressable>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const local = StyleSheet.create({
  content: {
    width: Platform.OS === 'web' ? '92%' : undefined,
    maxWidth: Platform.OS === 'web' ? 360 : undefined,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 8,
  },
  stepPill: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.button2,
    minWidth: 56,
    alignItems: 'center',
  },
  stepPillPressed: {
    backgroundColor: colors.button3,
  },
  stepPillText: {
    color: colors.mainText,
    fontWeight: '700',
    fontSize: 16,
  },
  valueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 8,
    minWidth: 90,
    justifyContent: 'center',
  },
  valueInput: {
    fontSize: 36,
    fontWeight: 'bold',
    minWidth: 60,
    textAlign: 'center',
    padding: 0,
  },
  unitText: {
    color: colors.mainText,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  hint: {
    color: colors.button1,
    fontSize: 11,
    marginTop: 10,
    marginBottom: 4,
    textAlign: 'center',
  },
});
