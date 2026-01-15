import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Modal, View, Text, Pressable, FlatList, TextInput, ScrollView, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../../../theme/colors';
import { useAccent } from '../../../../services/SettingsContext';
import { ExerciseRowBase } from '../../../../types/exercise';
import {
  EXERCISE_CATALOG,
  MUSCLE_GROUPS,
  EQUIPMENT_TYPES,
  Exercise,
  MuscleGroup,
  Equipment,
} from '../../../../constants/exerciseCatalog';

type ExerciseRow =
  | { type: 'header'; label: string }
  | { type: 'item'; exercise: Exercise };

type Props = {
  visible: boolean;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  selectedRowIndex: number | null;
  onSelect: <K extends keyof ExerciseRowBase>(index: number, key: K, value: ExerciseRowBase[K]) => void;
  onClose: () => void;
  // Hide entire muscle groups from results. Existing callers passed legacy
  // section names like 'Warm Up' which no longer exist — those become no-ops.
  excludeSections?: string[];
  // Optional title override (e.g. "Swap Exercise" vs default "Select Exercise").
  title?: string;
};

export default function ExercisePickerModal({
  visible,
  searchQuery,
  onSearchChange,
  selectedRowIndex,
  onSelect,
  onClose,
  excludeSections,
  title,
}: Props) {
  const { accent } = useAccent();
  const flatListRef = useRef<FlatList>(null);
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | null>(null);
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | null>(null);
  // Which dropdown is currently expanded — at most one at a time.
  const [openDropdown, setOpenDropdown] = useState<'muscle' | 'equipment' | null>(null);

  // Reset filters whenever the modal is reopened so it doesn't carry stale
  // state across different rows / sections.
  useEffect(() => {
    if (visible) {
      setMuscleFilter(null);
      setEquipmentFilter(null);
      setOpenDropdown(null);
    }
  }, [visible]);

  const hasActiveFilter = muscleFilter !== null || equipmentFilter !== null;

  const filteredItems: ExerciseRow[] = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const excluded = new Set(excludeSections ?? []);

    // Filter pass
    const matches = EXERCISE_CATALOG.filter((ex) => {
      if (excluded.has(ex.muscle)) return false;
      if (muscleFilter && ex.muscle !== muscleFilter) return false;
      if (equipmentFilter && ex.equipment !== equipmentFilter) return false;
      if (query && !ex.name.toLowerCase().includes(query)) return false;
      return true;
    });

    // Group by muscle so headers reflect the category each result belongs to.
    // Order follows MUSCLE_GROUPS so sections stay stable as filters change.
    const byMuscle = new Map<MuscleGroup, Exercise[]>();
    for (const ex of matches) {
      const bucket = byMuscle.get(ex.muscle) ?? [];
      bucket.push(ex);
      byMuscle.set(ex.muscle, bucket);
    }

    const result: ExerciseRow[] = [];
    for (const muscle of MUSCLE_GROUPS) {
      const items = byMuscle.get(muscle);
      if (!items || items.length === 0) continue;
      result.push({ type: 'header', label: muscle });
      items.forEach((exercise) => result.push({ type: 'item', exercise }));
    }
    return result;
  }, [searchQuery, muscleFilter, equipmentFilter, excludeSections]);

  const handleSelectExercise = (exercise: Exercise) => {
    if (selectedRowIndex !== null) {
      onSelect(selectedRowIndex, 'name', exercise.name);
    }
    onClose();
  };

  const renderItem = ({ item }: { item: ExerciseRow }) => {
    if (item.type === 'header') {
      return (
        <View style={pickerStyles.sectionHeaderContainer}>
          <Text style={pickerStyles.sectionHeaderText}>{item.label}</Text>
        </View>
      );
    }
    const ex = item.exercise;
    return (
      <Pressable
        style={({ pressed }) => [
          pickerStyles.pickerRow,
          pressed && pickerStyles.pickerRowActive,
        ]}
        onPress={() => handleSelectExercise(ex)}
      >
        <View style={{ flex: 1 }}>
          <Text style={pickerStyles.pickerRowText}>{ex.name}</Text>
          <Text style={pickerStyles.pickerRowMeta}>
            {ex.equipment}
            {ex.tags && ex.tags.length > 0 ? ` · ${ex.tags.join(', ')}` : ''}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={pickerStyles.overlay}>
        <BlurView intensity={40} tint="dark" style={pickerStyles.blur} />

        <View style={pickerStyles.pickerSheet}>
          <View style={pickerStyles.pickerHandle} />

          <Text style={pickerStyles.pickerTitle}>{title ?? 'Select Exercise'}</Text>

          {/* Filter dropdowns */}
          <View style={pickerStyles.filterRow}>
            <Pressable
              style={[pickerStyles.dropdown, muscleFilter !== null && pickerStyles.dropdownActive, muscleFilter !== null && { borderColor: accent }]}
              onPress={() => setOpenDropdown(openDropdown === 'muscle' ? null : 'muscle')}
            >
              <Text style={pickerStyles.dropdownLabel}>Muscle</Text>
              <View style={pickerStyles.dropdownValueRow}>
                <Text
                  style={[
                    pickerStyles.dropdownValue,
                    muscleFilter !== null && pickerStyles.dropdownValueActive,
                    muscleFilter !== null && { color: accent },
                  ]}
                  numberOfLines={1}
                >
                  {muscleFilter ?? 'All'}
                </Text>
                <Feather
                  name={openDropdown === 'muscle' ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={muscleFilter !== null ? accent : colors.titleText}
                />
              </View>
            </Pressable>

            <Pressable
              style={[pickerStyles.dropdown, equipmentFilter !== null && pickerStyles.dropdownActive, equipmentFilter !== null && { borderColor: accent }]}
              onPress={() => setOpenDropdown(openDropdown === 'equipment' ? null : 'equipment')}
            >
              <Text style={pickerStyles.dropdownLabel}>Equipment</Text>
              <View style={pickerStyles.dropdownValueRow}>
                <Text
                  style={[
                    pickerStyles.dropdownValue,
                    equipmentFilter !== null && pickerStyles.dropdownValueActive,
                    equipmentFilter !== null && { color: accent },
                  ]}
                  numberOfLines={1}
                >
                  {equipmentFilter ?? 'All'}
                </Text>
                <Feather
                  name={openDropdown === 'equipment' ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={equipmentFilter !== null ? accent : colors.titleText}
                />
              </View>
            </Pressable>

            {hasActiveFilter && (
              <Pressable
                style={pickerStyles.clearButton}
                onPress={() => {
                  setMuscleFilter(null);
                  setEquipmentFilter(null);
                  setOpenDropdown(null);
                }}
                hitSlop={6}
              >
                <Feather name="x" size={14} color={colors.button1} />
              </Pressable>
            )}
          </View>

          {/* Expanded dropdown panel */}
          {openDropdown !== null && (
            <View style={pickerStyles.dropdownPanel}>
              <ScrollView
                style={pickerStyles.dropdownPanelScroll}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                <Pressable
                  style={pickerStyles.dropdownOption}
                  onPress={() => {
                    if (openDropdown === 'muscle') setMuscleFilter(null);
                    else setEquipmentFilter(null);
                    setOpenDropdown(null);
                  }}
                >
                  <Text
                    style={[
                      pickerStyles.dropdownOptionText,
                      ((openDropdown === 'muscle' && muscleFilter === null) ||
                        (openDropdown === 'equipment' && equipmentFilter === null)) &&
                        pickerStyles.dropdownOptionTextActive,
                      ((openDropdown === 'muscle' && muscleFilter === null) ||
                        (openDropdown === 'equipment' && equipmentFilter === null)) &&
                        { color: accent },
                    ]}
                  >
                    All
                  </Text>
                  {((openDropdown === 'muscle' && muscleFilter === null) ||
                    (openDropdown === 'equipment' && equipmentFilter === null)) && (
                    <Feather name="check" size={16} color={accent} />
                  )}
                </Pressable>

                {(openDropdown === 'muscle'
                  ? MUSCLE_GROUPS.filter((m) => !(excludeSections ?? []).includes(m))
                  : EQUIPMENT_TYPES
                ).map((opt) => {
                  const isSelected =
                    openDropdown === 'muscle' ? muscleFilter === opt : equipmentFilter === opt;
                  return (
                    <Pressable
                      key={opt}
                      style={pickerStyles.dropdownOption}
                      onPress={() => {
                        if (openDropdown === 'muscle') {
                          setMuscleFilter(opt as MuscleGroup);
                        } else {
                          setEquipmentFilter(opt as Equipment);
                        }
                        setOpenDropdown(null);
                      }}
                    >
                      <Text
                        style={[
                          pickerStyles.dropdownOptionText,
                          isSelected && pickerStyles.dropdownOptionTextActive,
                          isSelected && { color: accent },
                        ]}
                      >
                        {opt}
                      </Text>
                      {isSelected && <Feather name="check" size={16} color={accent} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Search */}
          <TextInput
            style={pickerStyles.searchInput}
            placeholder="Search exercises..."
            placeholderTextColor={colors.button2}
            value={searchQuery}
            onChangeText={onSearchChange}
          />

          {/* List */}
          <FlatList
            ref={flatListRef}
            data={filteredItems}
            keyExtractor={(item, i) => (item.type === 'header' ? `h_${item.label}_${i}` : `x_${item.exercise.name}`)}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            bounces={false}
            style={{ overflow: 'hidden' }}
            ListEmptyComponent={
              <Text style={pickerStyles.emptyText}>No exercises match your filters</Text>
            }
          />

          {/* Cancel */}
          <Pressable style={pickerStyles.cancelButton} onPress={onClose}>
            <Text style={pickerStyles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  blur: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },

  pickerSheet: {
    backgroundColor: colors.container,
    width: '90%',
    maxHeight: '85%',
    borderRadius: 24,
    paddingTop: 18,
    paddingBottom: 10,
    paddingHorizontal: 15,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 15 },
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },

  pickerHandle: {
    width: 45,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 14,
  },

  pickerTitle: {
    color: colors.titleText,
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    marginBottom: 12,
    opacity: 0.65,
    textAlign: 'center',
  },

  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },

  dropdown: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.button2,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  dropdownActive: {
    // borderColor applied inline via accent hook
  },

  dropdownLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.button1,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },

  dropdownValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dropdownValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.titleText,
    letterSpacing: 0.2,
  },

  dropdownValueActive: {
    // color applied inline via accent hook
  },

  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.button3,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dropdownPanel: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.button2,
    marginBottom: 10,
    maxHeight: 240,
    overflow: 'hidden',
  },

  dropdownPanelScroll: {
    flexGrow: 0,
  },

  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.button3,
  },

  dropdownOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.titleText,
    letterSpacing: 0.2,
  },

  dropdownOptionTextActive: {
    fontWeight: '700',
    // color applied inline via accent hook
  },

  searchInput: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: colors.mainText,
    marginBottom: 10,
  },

  sectionHeaderContainer: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 6,
    marginBottom: 2,
  },

  sectionHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.button2,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    opacity: 0.6,
  },

  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderRadius: 16,
  },

  pickerRowActive: {
    backgroundColor: colors.background + '55',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  pickerRowText: {
    color: colors.button1,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.4,
  },

  pickerRowMeta: {
    color: colors.button2,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 0.2,
  },

  emptyText: {
    color: colors.button2,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
    opacity: 0.5,
  },

  cancelButton: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 30,
    backgroundColor: colors.background + '88',
  },

  cancelButtonText: {
    color: colors.button2,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.4,
  },
});
