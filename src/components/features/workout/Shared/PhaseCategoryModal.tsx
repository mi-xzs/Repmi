// src/components/features/workout/Shared/PhaseCategoryModal.tsx

import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../../../theme/colors';
import { useAccent } from '../../../../services/SettingsContext';
import { PHASE_CATEGORIES } from './PhaseExercisePickerModal';

const CATEGORY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  Cardio:     'activity',
  Dynamic:    'wind',
  Static:     'pause',
  Mobility:   'rotate-cw',
  'Foam Roll':'disc',
  Activation: 'zap',
  Movement:   'shuffle',
  Sports:     'flag',
  Stretching: 'sun',
  Cooldown:   'moon',
};

type Props = {
  visible: boolean;
  phase: 'warmup' | 'cooldown';
  onSelect: (category: string | null) => void;
  onClose: () => void;
};

export default function PhaseCategoryModal({ visible, phase, onSelect, onClose }: Props) {
  const { accent } = useAccent();
  const title = phase === 'warmup' ? 'What type of warm up?' : 'What type of cooldown?';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />

        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.card}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.grid}
          >
            {PHASE_CATEGORIES.map((cat) => {
              const icon = CATEGORY_ICONS[cat.label] ?? 'circle';
              return (
                <Pressable
                  key={cat.label}
                  style={({ pressed }) => [styles.cell, pressed && styles.cellPressed, pressed && { borderColor: accent }]}
                  onPress={() => onSelect(cat.label)}
                >
                  <View style={styles.iconWrap}>
                    <Feather name={icon} size={22} color={accent} />
                  </View>
                  <Text style={styles.cellLabel}>{cat.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable style={styles.skipButton} onPress={() => onSelect(null)}>
            <Text style={styles.skipText}>No preference — show all</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.container,
    width: '88%',
    maxHeight: '75%',
    borderRadius: 28,
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    color: colors.titleText,
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    opacity: 0.65,
    marginBottom: 16,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 6,
  },
  cell: {
    width: '30%',
    backgroundColor: colors.background,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  cellPressed: {
    backgroundColor: colors.button3,
    // borderColor applied inline via accent hook
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.button3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellLabel: {
    color: colors.mainText,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  skipButton: {
    marginTop: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 30,
    backgroundColor: colors.background + '88',
  },
  skipText: {
    color: colors.button2,
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.7,
  },
});
