// src/components/analytics/MuscleVolumeChart.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAccent } from '../../services/SettingsContext';
import AnimatedBar from './AnimatedBar';

interface Props {
  volumeByGroup: Record<string, number>;
  kgByGroup?: Record<string, number>;
  unit?: string;            // label after the value, e.g. "sets" (default) or "times"
  modalTitle?: string;      // default "Muscle Distribution"
}

const VISIBLE_COUNT = 3;

type Entry = { group: string; vol: number };

const MuscleVolumeChart: React.FC<Props> = ({
  volumeByGroup,
  kgByGroup,
  unit = "sets",
  modalTitle = "Muscle Distribution",
}) => {
  const { accent } = useAccent();
  const [showAll, setShowAll] = useState(false);

  const entries: Entry[] = Object.entries(volumeByGroup)
    .map(([group, vol]) => ({ group, vol }))
    .filter(e => e.vol > 0)
    .sort((a, b) => b.vol - a.vol);

  if (entries.length === 0) return null;

  const max = entries[0].vol;
  const visible = entries.slice(0, VISIBLE_COUNT);
  const hasMore = entries.length > VISIBLE_COUNT;

  const renderRow = ({ group, vol }: Entry, index: number) => {
    const kg = kgByGroup ? kgByGroup[group] ?? 0 : 0;
    return (
      <View key={group} style={styles.row}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{group}</Text>
          <Text style={styles.value}>
            {vol} {unit}{kg > 0 ? `  ·  ${Math.round(kg).toLocaleString()} kg` : ''}
          </Text>
        </View>
        <AnimatedBar
          percent={Math.round((vol / max) * 100)}
          delay={Math.min(index, 6) * 60}
          trackStyle={styles.barTrack}
          fillStyle={[styles.barFill, { backgroundColor: accent }]}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {visible.map(renderRow)}

      {hasMore && (
        <Pressable
          style={({ pressed }) => [styles.showAll, pressed && { opacity: 0.6 }]}
          onPress={() => setShowAll(true)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={styles.showAllText}>Show all ({entries.length})</Text>
          <Feather name="chevron-right" size={13} color={colors.button1} />
        </Pressable>
      )}

      <Modal
        visible={showAll}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAll(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAll(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.modalCard}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {entries.map(renderRow)}
            </ScrollView>
            <Pressable
              style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}
              onPress={() => setShowAll(false)}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </Pressable>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default MuscleVolumeChart;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.container,
    borderRadius: 10,
    padding: 12,
    gap: 10,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'column',
    gap: 6,
    marginBottom: 2,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    color: colors.titleText,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    textTransform: 'uppercase',
    marginRight: 8,
  },
  value: {
    color: colors.titleText,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  barTrack: {
    height: 6,
    backgroundColor: colors.button2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  showAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    marginTop: 2,
  },
  showAllText: {
    color: colors.titleText,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '80%',
    backgroundColor: colors.container,
    borderRadius: 16,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  modalTitle: {
    color: colors.mainText,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    gap: 10,
    paddingBottom: 4,
  },
  closeButton: {
    marginTop: 12,
    alignSelf: 'center',
    backgroundColor: colors.button2,
    paddingVertical: 8,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  closeButtonText: {
    color: colors.mainText,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
