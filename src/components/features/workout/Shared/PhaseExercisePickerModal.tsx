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
      // Treadmill / walking / jogging
      'Treadmill Walk', 'Brisk Walk', 'Treadmill Incline Walk',
      'Treadmill Light Jog', 'Light Jog', 'Jog in Place', 'March in Place',
      // Bikes
      'Stationary Bike', 'Recumbent Bike Easy', 'Air Bike Easy', 'Assault Bike Warm-Up',
      // Rowers / ergs / climbers
      'Rowing Machine', 'Light Row', 'Ski Erg', 'Ski Erg Easy',
      'Elliptical', 'Cross-Trainer Easy', 'Stair Climber', 'VersaClimber Easy',
      // Jump rope variants
      'Jump Rope', 'Single-Leg Skip', 'Alternate-Foot Skip', 'Double-Unders (Easy)',
      // Bodyweight cardio primers
      'Jumping Jacks', 'Step Jacks', 'High Knees', 'Butt Kicks', 'Mountain Climbers',
      'Boxer Shuffle', 'Shadow Boxing (Light)',
      // Lateral / hop primers
      'Carioca (Warm-Up Pace)', 'Side Shuffle (Easy)', 'Skater Hops (Low)',
      'Pogo Hops (Easy)', 'Line Hops', 'Lateral Step-Outs', 'Toe Taps (Low Box)',
    ],
  },
  {
    label: 'Dynamic',
    defaultMode: 'reps',
    items: [
      // Leg / hip swings
      'Leg Swings (Front-Back)', 'Leg Swings (Side-Side)', 'Pendulum Leg Swing',
      // Arms / shoulders
      'Arm Circles (Forward)', 'Arm Circles (Backward)', 'Arm Crossovers',
      // Trunk / hips
      'Hip Circles', 'Torso Twists', 'Ankle Circles', 'Windmills',
      // Walking knee / quad / hamstring drills
      'Walking Knee Hugs', 'Walking Knee Pulls', 'Cradle Walk',
      'Walking Quad Stretch', 'High Knee Walk', 'Straight-Leg March', 'A-March',
      'Walking Hamstring Sweep', 'Inverted Hamstring Stretch',
      'Walking RDL (Single-Leg Reach)',
      // Lunge family
      'Walking Lunge', 'Reverse Lunge with Rotation', 'Lateral Lunge',
      'Lateral Lunge with Reach', 'Drop Lunge', 'Curtsy Lunge (Bodyweight)',
      // World's-greatest + spiderman family
      'World\'s Greatest Stretch', 'Spiderman Lunge', 'Walking Spiderman',
      'Spiderman with T-Spine Rotation',
      // Mid-body kicks / walks
      'Frankenstein Walk', 'Toy Soldier Walk', 'Tin Soldier Kicks',
      // Misc dynamic primers
      'Knee-to-Wall Stretch', 'Iron Cross Stretch', 'Scorpions',
      'Side-to-Side Squat', 'Prisoner Squat', 'Power Position Wall Drill',
      // Flows + transitional drills
      'Inchworm Walkout', 'Down-Dog to Up-Dog Flow',
      'Walking Toe Touches', 'Knee Hug to Reverse Lunge',
      'Lateral Lunge to Drop Step',
      'Shoulder Rolls (Forward)', 'Shoulder Rolls (Backward)',
      'Squat-to-Stand (Toe-Touch)',
    ],
  },
  {
    label: 'Static',
    defaultMode: 'timed',
    items: [
      // Quads
      'Standing Quad Stretch', 'Quad Stretch on Stomach',
      // Forward folds
      'Standing Forward Fold', 'Standing Half Forward Fold',
      // Hamstrings
      'Standing Hamstring Stretch', 'Seated Hamstring Stretch',
      'Lying Hamstring Stretch', 'Banded Hamstring Floss',
      // Hip openers
      'Half Splits', 'Saddle Stretch', 'Shoelace Stretch',
      'Butterfly Stretch', 'Figure Four Stretch',
      'Standing Glute Stretch', 'Lying Glute Stretch', 'Pretzel Stretch',
      'Standing IT Band Stretch',
      // Hip flexors
      'Kneeling Hip Flexor Stretch', 'Runner\'s Lunge', 'Frog Stretch',
      // Calves
      'Wall Calf Stretch', 'Standing Calf Stretch', 'Seated Calf Stretch',
      'Soleus Stretch',
      // Chest / pecs
      'Doorway Pec Stretch', 'Standing Wall Pec Stretch',
      'Chest Opener Stretch', 'Lying Pectoral Stretch',
      // Shoulders / lats
      'Crossbody Shoulder Stretch', 'Standing Cross-Body Lat Stretch',
      'Wall Lat Stretch',
      // Triceps / forearms
      'Overhead Triceps Stretch', 'Forearm Flexor Stretch', 'Forearm Extensor Stretch',
      // Neck / upper body
      'Seated Neck Release', 'Extended Puppy Pose',
      // Spinal twists / back
      'Knee-to-Chest Stretch', 'Reclined Spinal Twist',
      'Seated Spinal Twist', 'Supine Spinal Twist',
      // Side body
      'Kneeling Side Bend', 'Standing Side Bend',
      // Yoga / floor poses
      'Pigeon Pose', 'Half Pigeon Pose', 'Lizard Pose',
      'Child\'s Pose', 'Downward Dog', 'Cobra Pose', 'Sphinx Pose',
      'Happy Baby', 'Reclined Figure Four',
      'Single-Leg Forward Fold (Standing)', 'Single-Leg Forward Fold (Seated)',
      'Straddle Forward Fold', 'Wall-Assisted Kneeling Quad Stretch',
      // Recovery
      'Legs-Up-the-Wall',
    ],
  },
  {
    label: 'Mobility',
    defaultMode: 'timed',
    items: [
      // CARs (Controlled Articular Rotations)
      'Neck CARs', 'Neck Rolls', 'Shoulder CARs', 'Standing Hip CARs',
      'Hip CARs', 'Knee CARs', 'Ankle CARs',
      'Wrist CARs', 'Elbow CARs', 'Spine CARs', 'Thoracic CARs',
      // Hip mobility
      '90/90 Hip Stretch', '90/90 Hip Switches', 'T-Spine 90/90 Rotation',
      'Couch Stretch', 'Hip Flexor Lunge', 'Half-Kneeling Hip Flexor with Side Bend',
      // Squat / Cossack work
      'Cossack Squat Hold', 'Cossack Reach', 'Deep Squat Hold',
      // Adductors / hip openers
      'Frog Rockback', 'Pancake Pose Hold', 'Adductor Rockback', 'Adductor Pulse',
      // T-spine
      'Thread the Needle', 'Open Book', 'Quadruped Thoracic Rotation',
      'Thoracic Extension', 'Side-Lying Windmill', 'Bretzel Stretch',
      // Spine extension
      'Sphinx Press-Up', 'Cobra Reach', 'Prone Press-Up',
      // Hip + spine combo
      'Lizard with Twist', 'Crab Reach', 'Shin Box to Pigeon',
      // Shoulder
      'Wall Slides', 'Single-Arm Wall Slides', 'Back-to-Wall Shoulder Flexion',
      'Scapular Circles', 'Band Overhead Reach',
      // Banded distractions
      'Banded Hip Internal Rotation', 'Banded Hip Distraction',
      'Banded Shoulder Distraction', 'Banded Pec Distraction',
      // Ankle
      'Rocking Ankle Mobilization', 'Half-Kneeling Ankle Rockback',
      'Heel Walks', 'Toe Walks',
      // Side body
      'Seated Side Stretch',
      // Additional mobility drills
      '90/90 Hip Lift-Off', 'Pigeon with Forward Fold',
      'Downward Dog Heel Drop', 'Thoracic Bridge',
      'Jefferson Curl', 'Wrist Rocks (Palm Up)', 'Wrist Rocks (Palm Down)',
      'Wrist Push-Up Prep', 'Loaded Beast', 'Side Kick-Through',
    ],
  },
  {
    label: 'Foam Roll',
    defaultMode: 'timed',
    items: [
      // Lower body
      'Foam Roll Quads', 'Foam Roll Hamstrings', 'Foam Roll IT Band', 'Foam Roll TFL',
      'Foam Roll Glutes', 'Foam Roll Glute Medius',
      'Foam Roll Adductors', 'Foam Roll Hip Flexors',
      // Calves / shins
      'Foam Roll Calves', 'Foam Roll Soleus', 'Foam Roll Shins', 'Foam Roll Peroneals',
      // Back
      'Foam Roll Upper Back', 'Foam Roll Mid-Back', 'Foam Roll Erectors',
      'Foam Roll Thoracic Extension',
      // Lats / chest / arms
      'Foam Roll Lats', 'Foam Roll Lats Side-Lying',
      'Foam Roll Chest', 'Foam Roll Pec', 'Foam Roll Forearms',
      // Lacrosse ball
      'Lacrosse Ball Feet', 'Lacrosse Ball Glutes', 'Lacrosse Ball Calves',
      'Lacrosse Ball Upper Traps', 'Lacrosse Ball Suboccipitals',
      'Lacrosse Ball Pec', 'Lacrosse Ball Forearm', 'Lacrosse Ball Rotator Cuff',
      // Other tools
      'Peanut Ball Thoracic',
      'Massage Gun Quads', 'Massage Gun Hamstrings', 'Massage Gun Calves',
      'Trigger Point Glutes',
    ],
  },
  {
    label: 'Activation',
    defaultMode: 'reps',
    items: [
      // Glute activation
      'Glute Bridge', 'Single-Leg Glute Bridge', 'B-Stance Glute Bridge',
      'Glute Bridge Hold (Isometric)',
      'Hip Thrust Bodyweight', 'Hip Thrust March', 'Single-Leg Hip Bridge with Pulse',
      'Frog Pump (Bodyweight)',
      'Clamshell', 'Fire Hydrant', 'Donkey Kick', 'Quadruped Hip Extension',
      'Lateral Band Walk', 'Monster Walk', 'Banded Squat Walk', 'Crossover Step-Up',
      '90-90 Glute Hold', 'Hip Airplane', 'Bowler Squat',
      // Balance
      'Single-Leg Balance Hold', 'Single-Leg Stance Eyes Closed',
      // Rotator cuff / scap
      'Band External Rotation', 'Side-Lying External Rotation', 'Sleeper Stretch',
      'Band Face Pulls', 'Band Pull Aparts', 'Band No-Money Exercise',
      'Prone Y-T-W Raises', 'Prone Cobra Hold',
      'Scap Push-Ups', 'Scap Pull-Ups',
      'Wall Angels', 'Banded Wall Slides', 'Light Cuban Press',
      'Cross-Body Reach', 'Standing Banded Row',
      // Core / anti-rotation
      'Dead Bug', 'Banded Dead Bug', 'Bird Dog', 'McGill Curl-Up',
      'Pallof Press', 'Half-Kneeling Pallof Press', 'Tall-Kneeling Pallof Press',
      'Banded Anti-Rotation Press', 'Cable Lift', 'Cable Chop',
      // Plank family
      'Side Plank', 'Side Plank Reach Through', 'Bear Plank Hold', 'Copenhagen Plank',
      'Hollow Body Hold', 'Plank Shoulder Taps', 'Toe Touch Plank',
      'Knee-to-Elbow Plank', 'Renegade Plank', 'Stir-the-Pot Plank',
      'Reverse Plank', 'Reverse Plank with Leg Lift',
      // Carry / iso
      'Suitcase Hold',
      // Knee / quad
      'Nordic Hamstring Curl', 'Terminal Knee Extension',
      'Spanish Squat', 'Cyclist Squat (Bodyweight)',
      'Step-Up with Knee Drive',
      // Foot / ankle
      'Short Foot Drill', 'Toe Yoga', 'Big Toe Lifts',
      'Banded Ankle Eversion', 'Banded Ankle Inversion',
    ],
  },
  {
    label: 'Movement',
    defaultMode: 'reps',
    items: [
      // Crawls
      'Bear Crawl', 'Bear Crawl Backward', 'Lateral Bear Crawl', 'Spiderman Crawl',
      'Leopard Crawl', 'Crab Walk', 'Lizard Crawl', 'Duck Walk',
      // Walkouts
      'Inchworm', 'Hand Walkout', 'Squat to Stand', 'Hip Hinge Walkout',
      // Rotational get-ups
      'T-Rotation', 'Shin Box Rotation', 'Shin Box Get-Up', 'Hip Switch Get-Up',
      // Tumbling / gymnastic
      'Forward Roll', 'Backward Roll', 'Cartwheel',
      // Lunge prep
      'Three-Way Lunge', 'Lunge Jump', 'Single-Leg RDL (Bodyweight)',
      // Skipping / bounding
      'Power Skips', 'Pogo Skips', 'Bounders', 'Quick Feet',
      // Jumps (plyo prep)
      'Broad Jump', 'Tuck Jump', 'Squat Jumps', 'Lateral Jumps', 'Ankle Bounces',
      'Lateral Plyo Step', 'Skater Hops', 'Hop-to-Box (Low)',
      'Single-Leg Hop in Place', 'Rotational Jump',
      // Lateral footwork
      'Lateral Shuffle', 'Crossover Step', 'Drop Step',
    ],
  },
  {
    label: 'Sports',
    defaultMode: 'timed',
    items: [
      // Sprint mechanics
      'A-Skip', 'B-Skip', 'Ankling', 'Stride Frequency Drill',
      'High Knee March', 'Butt Kick Run',
      'Wall Drill (A)', 'Wall Drill (B)',
      'Falling Start', '3-Point Start', 'Get-Up Sprint',
      'Acceleration Sprints', 'Strides', 'Sprint Build-Up', 'Tempo Run',
      // Lateral / change-of-direction
      'Carioca', 'Crossover Run', 'Backpedal', 'Drop-Step Sprint',
      'Side Shuffle', 'Lateral Shuffle to Sprint', 'Forward-Backward Hops',
      // Plyo / jump primers
      'Pogo to Sprint', 'Approach Run-Up', 'Bound to Stick', 'Skater Reach',
      'Straight-Leg Bounds',
      // Agility cones / shuttle
      'T-Drill', 'Box Drill', 'Cone Weave', 'Zig-Zag Run',
      '5-10-5 Pro Agility', '5-Cone Drill', 'L-Drill', 'W-Drill',
      // Agility ladder
      'Dot Drill', 'Quick Feet Ladder', 'In-and-Out Ladder', 'Icky Shuffle',
      'Two-Foot Run Ladder', 'Single-Leg Ladder Hop',
      // Combat sports
      'Shadowboxing', 'Shadow Kicking', 'Stance Switches',
      'Hip Escapes', 'Bridge & Roll',
      // Rope
      'Jump Rope Footwork',
      // Basketball
      'Defensive Slide', 'Form Shooting', 'Layup Lines', 'Box-Out Drill',
      // Soccer
      'Toe Taps (Soccer)', 'Cone Dribble', 'Soccer Juggling', 'Inside-Outside Touches',
      // Racquet sports
      'Split-Step', 'Open-Stance Forehand Shadow', 'Volley Shadow',
      // Baseball / softball
      'Throwing Progression', 'Long Toss', 'Tee Swings', 'Dry Swings', 'Plyo Ball Throws',
      // Climbing
      'Hangboard Light Edges', 'Campus Board Easy', 'Open-Hand Hold',
      'Climbing Finger Rolls',
      // Swimming
      'Swim Arm Swings', 'Streamline Drill', 'Easy Kick Set', 'Pull Buoy Easy',
      // Golf
      'Trunk Rotation with Club', 'Hip Hinge with Club', 'Shoulder Pass-Throughs with Club',
    ],
  },
  {
    label: 'Stretching',
    defaultMode: 'timed',
    items: [
      // Flows / cat-cow
      'Cat-Cow', 'Sun Salutation A',
      // Downward dog family
      'Downward-Facing Dog', 'Child\'s Pose',
      // Lunges
      'Low Lunge', 'High Lunge', 'Lizard Pose',
      // Warriors / standing
      'Warrior I', 'Warrior II', 'Triangle Pose', 'Half-Moon Pose', 'Eagle Pose',
      // Forward fold family
      'Pyramid Pose', 'Wide-Legged Forward Fold', 'Garland Pose',
      // Backbends
      'Cobra Pose', 'Upward-Facing Dog', 'Sphinx Pose', 'Camel Pose',
      'Bridge Pose', 'Wheel Pose', 'Bow Pose', 'Locust Pose',
      // Inversions
      'Plough Pose', 'Shoulder Stand', 'Headstand', 'Crow Pose',
      // Pigeon family
      'Pigeon Pose', 'Reclined Pigeon', 'Half-Pigeon',
      // Seated postures
      'Hero Pose', 'Cow Face Pose', 'Mermaid Stretch',
      'Half-Lord-of-the-Fishes', 'Toe Sit',
      // Hip opener / restorative
      'Happy Baby Pose', 'Bound Angle Pose',
      // Seated finishers
      'Seated Forward Fold', 'Supine Twist', 'Savasana',
    ],
  },
  {
    label: 'Cooldown',
    defaultMode: 'timed',
    items: [
      // Easy machine cooldowns
      'Easy Walk', 'Cooldown Treadmill Walk', 'Decline Treadmill Walk',
      'Easy Jog to Walk', 'Walking Recovery Lap',
      'Easy Bike', 'Cooldown Bike Spin',
      'Easy Row', 'Cooldown Row',
      'Easy Elliptical', 'Cooldown Ski Erg', 'Easy Swim',
      // Slow articulation
      'March in Place (Slow)', 'Arm Circles (Slow)',
      'Slow Torso Twists', 'Slow Hip Circles', 'Neck Stretch (Slow)',
      // Recovery holds
      'Standing Forward Fold (Hold)',
      'Supine Knee Hugs', 'Constructive Rest Position',
      // Breathwork (parasympathetic down-regulation)
      'Supine Recovery Breathing', 'Diaphragmatic Breathing', 'Box Breathing',
      '4-7-8 Breathing', 'Nasal Breathing Walk', 'Crocodile Breathing',
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
