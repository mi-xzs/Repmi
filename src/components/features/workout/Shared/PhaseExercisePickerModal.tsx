// src/components/features/workout/Shared/PhaseExercisePickerModal.tsx

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../../../theme/colors';
import { useAccent } from '../../../../services/SettingsContext';
import { PhaseRowMode } from '../../../../types/exercise';

export type PhaseCategory = {
  label: string;
  defaultMode: PhaseRowMode;
  items: string[];
};

export const PHASE_CATEGORIES: PhaseCategory[] = [
  {
    label: 'Cardio',
    defaultMode: 'timed',
    items: [
      'Treadmill Walk', 'Treadmill Incline Walk', 'Treadmill Light Jog',
      'Stationary Bike', 'Rowing Machine', 'Elliptical',
      'Stair Climber', 'Ski Erg', 'Jump Rope',
      'Jumping Jacks', 'Step Jacks', 'High Knees', 'Butt Kicks',
      'March in Place', 'Mountain Climbers', 'Squat Jumps',
      'Lateral Jumps', 'Ankle Bounces', 'Jog in Place',
    ],
  },
  {
    label: 'Dynamic',
    defaultMode: 'reps',
    items: [
      'Leg Swings (Front-Back)', 'Leg Swings (Side-Side)',
      'Arm Circles (Forward)', 'Arm Circles (Backward)', 'Arm Crossovers',
      'Hip Circles', 'Torso Twists', 'Neck Rolls', 'Ankle Circles',
      'Walking Knee Hugs', 'Walking Quad Stretch', 'Walking Lunge',
      'Reverse Lunge with Rotation', 'Lateral Lunge', 'Curtsy Lunge',
      'Straight-Leg March', 'Inverted Hamstring Stretch',
      'Inchworm', 'World\'s Greatest Stretch', 'Spiderman Lunge',
      'Prisoner Squat', 'Windmills',
    ],
  },
  {
    label: 'Static',
    defaultMode: 'timed',
    items: [
      'Standing Quad Stretch', 'Standing Forward Fold', 'Seated Hamstring Stretch',
      'Half Splits', 'Wall Calf Stretch', 'Seated Calf Stretch',
      'Butterfly Stretch', 'Figure Four Stretch', 'Standing IT Band Stretch',
      'Kneeling Hip Flexor Stretch', 'Runner\'s Lunge', 'Frog Stretch',
      'Crossbody Shoulder Stretch', 'Overhead Triceps Stretch', 'Chest Opener Stretch',
      'Extended Puppy Pose', 'Seated Neck Release', 'Lying Pectoral Stretch',
      'Knee-to-Chest Stretch', 'Reclined Spinal Twist', 'Seated Spinal Twist',
      'Supine Spinal Twist', 'Kneeling Side Bend', 'Legs-Up-the-Wall',
    ],
  },
  {
    label: 'Mobility',
    defaultMode: 'timed',
    items: [
      'Neck CARs', 'Shoulder CARs', 'Wrist CARs', 'Hip CARs',
      'Ankle CARs', 'Thoracic CARs',
      '90/90 Hip Stretch', '90/90 Hip Switches', 'Couch Stretch',
      'Hip Flexor Lunge', 'Cossack Squat', 'Deep Squat Hold',
      'Thread the Needle', 'Open Book', 'Quadruped Thoracic Rotation',
      'Thoracic Extension', 'Wall Slides', 'Back-to-Wall Shoulder Flexion',
      'Scapular Circles', 'Band Overhead Reach',
      'Rocking Ankle Mobilization', 'Heel Walks', 'Toe Walks',
      'Half-Kneeling Ankle Rockback', 'Seated Side Stretch',
    ],
  },
  {
    label: 'Foam Roll',
    defaultMode: 'timed',
    items: [
      'Foam Roll Quads', 'Foam Roll IT Band', 'Foam Roll Hamstrings',
      'Foam Roll Glutes', 'Foam Roll Calves', 'Foam Roll Hip Flexors',
      'Foam Roll Upper Back', 'Foam Roll Lats', 'Foam Roll Mid-Back',
      'Foam Roll Adductors', 'Foam Roll Peroneals', 'Foam Roll Chest',
      'Lacrosse Ball Feet', 'Lacrosse Ball Glutes', 'Lacrosse Ball Upper Traps',
    ],
  },
  {
    label: 'Activation',
    defaultMode: 'reps',
    items: [
      'Glute Bridge', 'Single-Leg Glute Bridge', 'Clamshell',
      'Fire Hydrant', 'Donkey Kick', 'Lateral Band Walk',
      'Monster Walk', 'Banded Squat Walk', 'Hip Thrust Bodyweight',
      'Band External Rotation', 'Band Face Pulls', 'Band Pull Aparts',
      'Band No-Money Exercise', 'Prone Y-T-W Raises', 'Side-Lying External Rotation',
      'Dead Bug', 'Bird Dog', 'Pallof Press',
      'Side Plank', 'Bear Plank Hold', 'Copenhagen Plank',
      'Hollow Body Hold', 'Plank Shoulder Taps',
      'Nordic Hamstring Curl', 'Terminal Knee Extension', 'Single-Leg Balance Hold',
    ],
  },
  {
    label: 'Movement',
    defaultMode: 'reps',
    items: [
      'Bear Crawl', 'Bear Crawl Backward', 'Leopard Crawl',
      'Crab Walk', 'Lizard Crawl', 'Duck Walk',
      'Inchworm', 'Hand Walkout', 'Squat to Stand',
      'Hip Hinge Walkout', 'T-Rotation', 'Shin Box Rotation', 'Shin Box Get-Up',
      'Power Skips', 'Bounders', 'Broad Jump',
      'Tuck Jump', 'Lunge Jump', 'Rotational Jump',
    ],
  },
  {
    label: 'Sports',
    defaultMode: 'timed',
    items: [
      'A-Skip', 'B-Skip', 'High Knee March', 'Butt Kick Run',
      'Carioca', 'Backpedal', 'Side Shuffle', 'Lateral Shuffle to Sprint',
      'Acceleration Sprints', 'Strides', 'Forward-Backward Hops',
      'T-Drill', 'Box Drill', 'Cone Weave', 'Zig-Zag Run', '5-10-5 Pro Agility',
      'Shadowboxing', 'Jump Rope Footwork',
      'Swim Arm Swings', 'Climbing Finger Rolls',
    ],
  },
  {
    label: 'Stretching',
    defaultMode: 'timed',
    items: [
      'Cat-Cow', 'Downward-Facing Dog', 'Child\'s Pose',
      'Low Lunge', 'High Lunge', 'Warrior I', 'Warrior II',
      'Pyramid Pose', 'Cobra Pose', 'Upward-Facing Dog',
      'Sun Salutation A', 'Thread the Needle',
      'Pigeon Pose', 'Reclined Pigeon', 'Lizard Pose',
      'Happy Baby Pose', 'Bound Angle Pose',
      'Seated Forward Fold', 'Supine Twist', 'Savasana',
    ],
  },
  {
    label: 'Cooldown',
    defaultMode: 'timed',
    items: [
      'Easy Walk', 'Easy Bike', 'Easy Row', 'Easy Elliptical', 'Easy Swim',
      'Brisk Walking', 'Easy Jog to Walk', 'March in Place (Slow)',
      'Arm Circles (Slow)', 'Slow Torso Twists', 'Slow Hip Circles',
      'Scorpion Stretch', 'Neck Stretch (Slow)',
    ],
  },
];

// Flat lookup: exercise name → category (for mode auto-select)
const EXERCISE_CATEGORY_MAP = new Map<string, PhaseCategory>();
for (const cat of PHASE_CATEGORIES) {
  for (const item of cat.items) {
    EXERCISE_CATEGORY_MAP.set(item, cat);
  }
}

export function getModeForExercise(name: string): PhaseRowMode | undefined {
  return EXERCISE_CATEGORY_MAP.get(name)?.defaultMode;
}

type ListRow =
  | { type: 'header'; label: string }
  | { type: 'item'; label: string };

type Props = {
  visible: boolean;
  searchQuery: string;
  onSearchChange: (text: string) => void;
  selectedRowIndex: number | null;
  onSelectExercise: (rowIndex: number, name: string, mode: PhaseRowMode) => void;
  onClose: () => void;
  defaultCategory?: string;
};

export default function PhaseExercisePickerModal({
  visible,
  searchQuery,
  onSearchChange,
  selectedRowIndex,
  onSelectExercise,
  onClose,
  defaultCategory,
}: Props) {
  const { accent } = useAccent();
  const [activeCategory, setActiveCategory] = useState<string | null>(defaultCategory ?? null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible) {
      setActiveCategory(defaultCategory ?? null);
      setDropdownOpen(false);
    }
  }, [visible, defaultCategory]);

  const filteredItems: ListRow[] = (() => {
    const query = searchQuery.toLowerCase().trim();
    const categories = activeCategory
      ? PHASE_CATEGORIES.filter((c) => c.label === activeCategory)
      : PHASE_CATEGORIES;

    const result: ListRow[] = [];
    for (const cat of categories) {
      const matches = query
        ? cat.items.filter((item) => item.toLowerCase().includes(query))
        : cat.items;
      if (matches.length > 0) {
        result.push({ type: 'header', label: cat.label });
        matches.forEach((item) => result.push({ type: 'item', label: item }));
      }
    }
    return result;
  })();

  const handleSelect = (name: string) => {
    if (selectedRowIndex === null) return;
    const mode = getModeForExercise(name) ?? 'timed';
    onSelectExercise(selectedRowIndex, name, mode);
    onClose();
  };

  const handlePickCategory = (label: string | null) => {
    setActiveCategory(label);
    setDropdownOpen(false);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  };

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
        ]}
        onPress={() => handleSelect(item.label)}
      >
        <Text style={pickerStyles.pickerRowText}>{item.label}</Text>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={pickerStyles.overlay}>
        <BlurView intensity={40} tint="dark" style={pickerStyles.blur} />

        <View style={pickerStyles.pickerSheet}>
          <View style={pickerStyles.pickerHandle} />
          <Text style={pickerStyles.pickerTitle}>Select Exercise</Text>

          {/* Category dropdown — single filter, mirrors the main workout picker */}
          <View style={pickerStyles.filterRow}>
            <Pressable
              style={[pickerStyles.dropdown, activeCategory !== null && pickerStyles.dropdownActive, activeCategory !== null && { borderColor: accent }]}
              onPress={() => setDropdownOpen((prev) => !prev)}
            >
              <Text style={pickerStyles.dropdownLabel}>Category</Text>
              <View style={pickerStyles.dropdownValueRow}>
                <Text
                  style={[
                    pickerStyles.dropdownValue,
                    activeCategory !== null && pickerStyles.dropdownValueActive,
                    activeCategory !== null && { color: accent },
                  ]}
                  numberOfLines={1}
                >
                  {activeCategory ?? 'All'}
                </Text>
                <Feather
                  name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={activeCategory !== null ? accent : colors.titleText}
                />
              </View>
            </Pressable>

            {activeCategory !== null && (
              <Pressable
                style={pickerStyles.clearButton}
                onPress={() => handlePickCategory(null)}
                hitSlop={6}
              >
                <Feather name="x" size={14} color={colors.button1} />
              </Pressable>
            )}
          </View>

          {dropdownOpen && (
            <View style={pickerStyles.dropdownPanel}>
              <ScrollView
                style={pickerStyles.dropdownPanelScroll}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                <Pressable
                  style={pickerStyles.dropdownOption}
                  onPress={() => handlePickCategory(null)}
                >
                  <Text
                    style={[
                      pickerStyles.dropdownOptionText,
                      activeCategory === null && pickerStyles.dropdownOptionTextActive,
                      activeCategory === null && { color: accent },
                    ]}
                  >
                    All
                  </Text>
                  {activeCategory === null && (
                    <Feather name="check" size={16} color={accent} />
                  )}
                </Pressable>
                {PHASE_CATEGORIES.map((cat) => {
                  const isSelected = activeCategory === cat.label;
                  return (
                    <Pressable
                      key={cat.label}
                      style={pickerStyles.dropdownOption}
                      onPress={() => handlePickCategory(cat.label)}
                    >
                      <Text
                        style={[
                          pickerStyles.dropdownOptionText,
                          isSelected && pickerStyles.dropdownOptionTextActive,
                          isSelected && { color: accent },
                        ]}
                      >
                        {cat.label}
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
            keyExtractor={(item, i) => item.label + i}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            bounces={false}
            style={{ overflow: 'hidden' }}
            ListEmptyComponent={
              <Text style={pickerStyles.emptyText}>No exercises found</Text>
            }
          />

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
    top: 0, bottom: 0, left: 0, right: 0,
  },
  pickerSheet: {
    backgroundColor: colors.container,
    width: '90%',
    maxHeight: '80%',
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
    paddingVertical: 15,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderRadius: 30,
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
