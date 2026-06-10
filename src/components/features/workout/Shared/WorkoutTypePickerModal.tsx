// src/components/features/workout/Shared/WorkoutTypePickerModal.tsx
//
// Modal picker for choosing the workout's TYPE (its name), e.g.
// "Push / Pull / Strength". Same filter / list pattern as
// ExercisePickerModal: a Category dropdown selector, a search input,
// and a grouped list. Multi-select with chips at the top — up to
// `maxParts` (default 3) parts joined by " / ".

import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../../../theme/colors';
import { useAccent } from '../../../../services/SettingsContext';

type Category = 'Muscle Groups' | 'Training Styles' | 'Conditioning';

const WORKOUT_TYPE_SECTIONS: { category: Category; items: string[] }[] = [
  {
    category: 'Muscle Groups',
    items: [
      'Full Body', 'Upper Body', 'Lower Body', 'Chest', 'Back', 'Shoulders',
      'Biceps', 'Triceps', 'Glutes', 'Core', 'Quads', 'Hamstrings', 'Calves',
    ],
  },
  {
    category: 'Training Styles',
    items: [
      'Push', 'Push (Light)', 'Pull', 'Pull (Light)', 'Legs (Light)',
      'Strength', 'Hypertrophy', 'Deload', 'Functional Training',
      'Olympic Lifting', 'Calisthenics', 'Plyometrics',
    ],
  },
  {
    category: 'Conditioning',
    items: ['HIIT', 'Conditioning', 'Cardio', 'Mobility', 'Stability', 'Rehab'],
  },
];

const ALL_CATEGORIES: Category[] = WORKOUT_TYPE_SECTIONS.map((s) => s.category);

type ListRow =
  | { type: 'header'; label: Category }
  | { type: 'item'; label: string; category: Category };

type Props = {
  visible: boolean;
  currentValue: string | null;
  onChange: (next: string | null) => void;
  onClose: () => void;
  maxParts?: number;
};

export default function WorkoutTypePickerModal({
  visible,
  currentValue,
  onChange,
  onClose,
  maxParts = 3,
}: Props) {
  const { accent } = useAccent();
  const { height: winH } = useWindowDimensions();
  // Give the sheet a definite pixel height so the inner flex:1 FlatList has a
  // bounded container to scroll inside. On web a percentage height resolves to
  // 0 inside the modal portal; on native, a parent with only `maxHeight` (no
  // explicit `height`) lets flex:1 children collapse to 0 — so the type list
  // renders nothing. A concrete height fixes both. (Mirrors ExercisePickerModal.)
  const sheetHeight = Math.round(winH * 0.85);
  const [categoryFilter, setCategoryFilter] = useState<Category | null>(null);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (visible) {
      setCategoryFilter(null);
      setCategoryDropdownOpen(false);
      setSearchQuery('');
    }
  }, [visible]);

  // Parse the current value into selected parts. Same logic as the old
  // inline picker so renames stay non-destructive.
  const parts = useMemo(
    () =>
      (currentValue ?? '')
        .split(/\s*\/\s*/)
        .map((p) => p.trim())
        .filter(Boolean),
    [currentValue],
  );
  const usedSet = useMemo(() => new Set(parts.map((p) => p.toLowerCase())), [parts]);
  const reachedMax = parts.length >= maxParts;

  const addPart = (label: string) => {
    if (reachedMax) return;
    if (usedSet.has(label.toLowerCase())) return;
    const current = (currentValue ?? '').trim().replace(/\s*\/\s*$/, '').trim();
    const next = current.length === 0 ? label : `${current} / ${label}`;
    onChange(next);
  };

  const removePart = (i: number) => {
    const next = parts.filter((_, idx) => idx !== i).join(' / ');
    onChange(next || null);
  };

  const filteredItems: ListRow[] = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const sections = categoryFilter
      ? WORKOUT_TYPE_SECTIONS.filter((s) => s.category === categoryFilter)
      : WORKOUT_TYPE_SECTIONS;

    const result: ListRow[] = [];
    for (const section of sections) {
      const matches = section.items
        .filter((item) => !usedSet.has(item.toLowerCase()))
        .filter((item) => (query ? item.toLowerCase().includes(query) : true));
      if (matches.length === 0) continue;
      result.push({ type: 'header', label: section.category });
      matches.forEach((item) =>
        result.push({ type: 'item', label: item, category: section.category }),
      );
    }
    return result;
  }, [categoryFilter, searchQuery, usedSet]);

  const renderItem = ({ item }: { item: ListRow }) => {
    if (item.type === 'header') {
      return (
        <View style={pickerStyles.sectionHeaderContainer}>
          <Text style={pickerStyles.sectionHeaderText}>{item.label}</Text>
        </View>
      );
    }
    return (
      <Pressable
        style={({ pressed }) => [
          pickerStyles.pickerRow,
          pressed && pickerStyles.pickerRowActive,
          reachedMax && pickerStyles.pickerRowDisabled,
        ]}
        onPress={() => addPart(item.label)}
        disabled={reachedMax}
      >
        <Text style={pickerStyles.pickerRowText}>{item.label}</Text>
        <Feather name="plus" size={16} color={reachedMax ? colors.button2 : colors.button1} />
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={pickerStyles.overlay}>
        <BlurView intensity={40} tint="dark" style={pickerStyles.blur} />

        <View
          style={[
            pickerStyles.pickerSheet,
            // Definite pixel height on every platform so the FlatList's flex:1
            // gets bounds (native collapses it to 0 with only maxHeight).
            { height: sheetHeight, maxHeight: sheetHeight },
          ]}
        >
          <View style={pickerStyles.pickerHandle} />

          <Text
            style={[pickerStyles.pickerTitle, Platform.OS === 'web' && pickerStyles.pickerTitleWeb]}
            numberOfLines={1}
          >
            Choose Workout Type
          </Text>

          {/* Selected chips */}
          {parts.length > 0 && (
            <View style={pickerStyles.chipRow}>
              {parts.map((part, i) => (
                <Pressable
                  key={`${part}-${i}`}
                  style={({ pressed }) => [
                    pickerStyles.selectedChip,
                    { backgroundColor: accent },
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => removePart(i)}
                  hitSlop={4}
                >
                  <Text style={pickerStyles.selectedChipText}>{part}</Text>
                  <Feather name="x" size={16} color={colors.background} />
                </Pressable>
              ))}
            </View>
          )}

          {reachedMax && (
            <View style={pickerStyles.maxBanner}>
              <Feather name="info" size={12} color={colors.button1} />
              <Text style={pickerStyles.maxBannerText}>
                Maximum {maxParts} selections — remove one to add another
              </Text>
            </View>
          )}

          {/* Category filter dropdown */}
          <View style={pickerStyles.filterRow}>
            <Pressable
              style={pickerStyles.dropdown}
              onPress={() => setCategoryDropdownOpen((v) => !v)}
            >
              <Text style={pickerStyles.dropdownLabel}>Category</Text>
              <View style={pickerStyles.dropdownValueRow}>
                <Text style={pickerStyles.dropdownValue} numberOfLines={1}>
                  {categoryFilter ?? 'All'}
                </Text>
                <Feather
                  name={categoryDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.titleText}
                />
              </View>
            </Pressable>

            {categoryFilter !== null && (
              <Pressable
                style={pickerStyles.clearButton}
                onPress={() => {
                  setCategoryFilter(null);
                  setCategoryDropdownOpen(false);
                }}
                hitSlop={6}
              >
                <Feather name="x" size={14} color={colors.button1} />
              </Pressable>
            )}
          </View>

          {categoryDropdownOpen && (
            <View style={pickerStyles.dropdownPanel}>
              <ScrollView
                style={pickerStyles.dropdownPanelScroll}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                <Pressable
                  style={pickerStyles.dropdownOption}
                  onPress={() => {
                    setCategoryFilter(null);
                    setCategoryDropdownOpen(false);
                  }}
                >
                  <Text
                    style={[
                      pickerStyles.dropdownOptionText,
                      categoryFilter === null && pickerStyles.dropdownOptionTextActive,
                    ]}
                  >
                    All
                  </Text>
                  {categoryFilter === null && (
                    <Feather name="check" size={16} color={colors.titleText} />
                  )}
                </Pressable>
                {ALL_CATEGORIES.map((c) => {
                  const isSelected = categoryFilter === c;
                  return (
                    <Pressable
                      key={c}
                      style={pickerStyles.dropdownOption}
                      onPress={() => {
                        setCategoryFilter(c);
                        setCategoryDropdownOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          pickerStyles.dropdownOptionText,
                          isSelected && pickerStyles.dropdownOptionTextActive,
                        ]}
                      >
                        {c}
                      </Text>
                      {isSelected && <Feather name="check" size={16} color={colors.titleText} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Search */}
          <TextInput
            style={pickerStyles.searchInput}
            placeholder="Search..."
            placeholderTextColor={colors.button2}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />

          {/* List — wrapped in flex:1/minHeight:0 so RN-web gives the
              FlatList's inner scroller a definite bounded height. Do NOT
              add overflow:'hidden' on the FlatList style — it clips the
              inner scroll div from outside on RN-web. */}
          <View style={{ flex: 1, minHeight: 0 }}>
            <FlatList
              data={filteredItems}
              keyExtractor={(item, i) =>
                item.type === 'header' ? `h_${item.label}` : `i_${item.label}_${i}`
              }
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              bounces={false}
              style={{ flex: 1, minHeight: 0 }}
              contentContainerStyle={{ flexGrow: 1 }}
              ListEmptyComponent={
                <Text style={pickerStyles.emptyText}>
                  {reachedMax ? 'Limit reached' : 'No matches'}
                </Text>
              }
            />
          </View>

          {/* Footer */}
          <View style={pickerStyles.footer}>
            <Pressable
              style={pickerStyles.footerCancel}
              onPress={() => {
                onChange(null);
                onClose();
              }}
            >
              <Text style={pickerStyles.footerCancelText}>Clear</Text>
            </Pressable>
            <Pressable style={[pickerStyles.footerDone, { backgroundColor: accent }]} onPress={onClose}>
              <Text style={pickerStyles.footerDoneText}>Done</Text>
            </Pressable>
          </View>
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
  // Web: smaller font + tighter spacing so the full title fits without clipping.
  pickerTitleWeb: {
    fontSize: 12,
    letterSpacing: 0.8,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },

  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    // backgroundColor applied inline via accent hook
  },

  selectedChipText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  maxBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.background,
    borderRadius: 8,
    marginBottom: 10,
  },

  maxBannerText: {
    color: colors.button1,
    fontSize: 11,
    fontWeight: '500',
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
    maxHeight: 200,
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
    color: colors.titleText,
    fontWeight: '700',
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

  pickerRowDisabled: {
    opacity: 0.4,
  },

  pickerRowText: {
    color: colors.titleText,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.4,
  },

  emptyText: {
    color: colors.button2,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
    opacity: 0.5,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },

  footerCancel: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 30,
    backgroundColor: colors.background + '88',
  },

  footerCancelText: {
    color: colors.button1,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.4,
  },

  footerDone: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 30,
    // backgroundColor applied inline via accent hook
  },

  footerDoneText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.4,
  },
});
