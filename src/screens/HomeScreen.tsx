// src/screens/HomeScreen.tsx
import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
  Animated,
  TextInput,
  Keyboard,
  Share,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Reanimated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import Screen from '../components/ui/Screen';
import {
  Skeleton,
  SkeletonWorkoutCard,
  SkeletonSectionLabel,
  useStableLoading,
} from '../components/ui/Skeleton';
import { HomeScreenHeader } from '../components/headers/HomeScreenHeader';

import { useNavigation , useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../navigation/HomeStackNavigator';
import { useWorkouts } from '../services/WorkoutContext';
import WorkoutCard from '../components/features/workout/WorkoutCard';
import { colors } from '../theme/colors';
import { useResponsive } from '../hooks/useResponsive';

import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { WeekStreakBar } from '../components/ui/WeekStreakBar';
import { WaterIntakeBar } from '../components/ui/WaterIntakeBar';
import { shareWorkout, importWorkoutFromLink } from '../services/sharingService';
import { useProfile } from '../services/ProfileContext';
import { useSettings, useAccent } from '../services/SettingsContext';
import { useDemoGuard } from '../services/demoMode';

import Swipeable from 'react-native-gesture-handler/Swipeable';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

type HomeNavProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

const CARD_BORDER_RADIUS = 18;
const ACTION_WIDTH = 90;

///////////////////////////////////////////////////////////////
// Action panels

function LeftAction({
  onDelete,
  progress,
}: {
  onDelete: () => void;
  progress: Animated.AnimatedInterpolation<number>;
}) {
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.actionOuter}>
      <TouchableOpacity style={styles.leftInner} onPress={onDelete} activeOpacity={0.75}>
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center', gap: 5 }}>
          <Feather name="trash-2" size={20} color={colors.button1} />
          <Animated.Text style={styles.actionLabel}>Delete</Animated.Text>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

function RightAction({
  onShare,
  progress,
}: {
  onShare: () => void;
  progress: Animated.AnimatedInterpolation<number>;
}) {
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.actionOuter}>
      <TouchableOpacity style={styles.rightInner} onPress={onShare} activeOpacity={0.75}>
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center', gap: 5 }}>
          <Feather name="share" size={20} color={colors.button1} />
          <Animated.Text style={styles.actionLabel}>Share</Animated.Text>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

///////////////////////////////////////////////////////////////
// Swipeable card

interface SwipeableWorkoutCardProps {
  workout: any;
  workoutIndex: number;
  refreshKey: number;
  onPress: () => void;
  onDelete: () => void;
  onShare: () => void;
  allRefs: React.MutableRefObject<(Swipeable | null)[]>;
  refIndex: number;
  enterIndex: number;
  // On wide web the cards lay out in a grid; this sizes each card to a
  // grid cell. Undefined on mobile (full-width stacked).
  containerStyle?: StyleProp<ViewStyle>;
}

function SwipeableWorkoutCard({
  workout,
  workoutIndex,
  refreshKey,
  onPress,
  onDelete,
  onShare,
  allRefs,
  refIndex,
  enterIndex,
  containerStyle,
}: SwipeableWorkoutCardProps) {
  const swipeableRef = useRef<Swipeable>(null);
  const demoGuard = useDemoGuard();

  const setRef = (ref: Swipeable | null) => {
    swipeableRef.current = ref;
    allRefs.current[refIndex] = ref;
  };

  const closeAll = () => {
    allRefs.current.forEach((ref) => ref?.close());
  };

  const handleSwipeOpen = () => {
    allRefs.current.forEach((ref, i) => {
      if (i !== refIndex) ref?.close();
    });
  };

  const handleShare = () => {
    closeAll();
    onShare();
  };

  const handleDelete = () => {
    closeAll();
    if (!demoGuard('Deleting a workout')) return;
    Alert.alert(
      'Delete workout',
      `Delete "${workout.name ?? 'this workout'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  const entering = FadeInDown
    .duration(220)
    .delay(Math.min(enterIndex, 5) * 40)
    .reduceMotion(ReduceMotion.System);

  return (
    <Reanimated.View entering={entering} style={containerStyle}>
      <Swipeable
        ref={setRef}
        friction={2}
        leftThreshold={ACTION_WIDTH * 0.6}
        rightThreshold={ACTION_WIDTH * 0.6}
        overshootLeft={false}
        overshootRight={false}
        onSwipeableOpen={handleSwipeOpen}
        renderLeftActions={(progress) => <LeftAction onDelete={handleDelete} progress={progress} />}
        renderRightActions={(progress) => <RightAction onShare={handleShare} progress={progress} />}
        childrenContainerStyle={styles.swipeableChildren}
      >
        <WorkoutCard
          workout={workout}
          workoutIndex={workoutIndex}
          refreshKey={refreshKey}
          onPress={onPress}
        />
      </Swipeable>
    </Reanimated.View>
  );
}

///////////////////////////////////////////////////////////////
// Section label

function SectionLabel({ title, onAdd }: { title: string; onAdd?: () => void }) {
  return (
    <View style={styles.sectionLabelRow}>
      <MaterialCommunityIcons name="star-four-points" size={10} color={colors.titleText} />
      <Text style={styles.sectionLabel}>{title}</Text>
      <MaterialCommunityIcons name="star-four-points" size={10} color={colors.titleText} />
      <View style={styles.sectionLabelLine} />
      {onAdd && (
        <TouchableOpacity onPress={onAdd} activeOpacity={0.85} style={styles.addButton}>
          <View style={styles.addButtonCavity}>
            <Feather name="plus" size={12} color={colors.titleText} />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

///////////////////////////////////////////////////////////////
// Empty state

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Feather name="inbox" size={32} color={colors.button2} />
      <Text style={styles.emptyText}>No current workouts</Text>
      <Text style={styles.emptySubText}>Add or import a workout to get started ദ്ദി ˉ͈̀꒳ˉ͈́ )✧</Text>
    </View>
  );
}

///////////////////////////////////////////////////////////////
// Import link input

function ImportLinkInput({ onImport }: { onImport: (link: string) => Promise<void> }) {
  const { accent } = useAccent();
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    const trimmed = link.trim();
    if (!trimmed) return;
    Keyboard.dismiss();
    setLoading(true);
    try {
      await onImport(trimmed);
      setLink('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.importCard}>
      <View style={styles.importRow}>
        <Feather name="link-2" size={15} color={accent} style={styles.importIcon} />
        <TextInput
          style={styles.importInput}
          placeholder="Paste a link to import..."
          placeholderTextColor={colors.button1}
          value={link}
          onChangeText={setLink}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={handleImport}
          selectionColor={colors.RadarChart}
          editable={!loading}
        />
        {loading ? (
          <ActivityIndicator size="small" color={colors.RadarChart} style={{ paddingLeft: 10 }} />
        ) : link.trim().length > 0 ? (
          <TouchableOpacity onPress={handleImport} style={styles.importButton} activeOpacity={0.7}>
            <Feather name="arrow-right" size={16} color={colors.RadarChart} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

///////////////////////////////////////////////////////////////
// Loading silhouette

function HomeSkeleton() {
  return (
    <Screen>
      {/* Header silhouette — username + level pill */}
      <View style={styles.skeletonHeader}>
        <Skeleton width={44} height={44} radius={22} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="55%" height={16} radius={4} />
          <Skeleton width="35%" height={11} radius={3} />
        </View>
      </View>

      {/* Week streak bar silhouette — 7 day dots */}
      <View style={styles.skeletonWeekBar}>
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} width={28} height={28} radius={14} />
        ))}
      </View>

      {/* Water bar silhouette */}
      <Skeleton height={56} radius={14} style={{ marginVertical: 10 }} />

      <View style={styles.list}>
        <SkeletonSectionLabel />
        <SkeletonWorkoutCard />
        <SkeletonWorkoutCard />
        <SkeletonSectionLabel />
        <SkeletonWorkoutCard />
      </View>
    </Screen>
  );
}

///////////////////////////////////////////////////////////////
// HomeScreen

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const { workouts, isLoading, deleteWorkout, saveWorkout } = useWorkouts();
  const { profile } = useProfile();
  const { favoriteWorkoutIds: favorites } = useSettings();
  const [refreshKey, setRefreshKey] = React.useState(0);

  // On wide web viewports, lay workout cards out in a horizontal wrapping
  // grid instead of a vertical stack. `gridStyle`/`cardStyle` are undefined
  // on mobile, so the phone UI keeps its full-width vertical list.
  const { isWide } = useResponsive();
  const gridStyle = isWide ? styles.cardGrid : undefined;
  const cardStyle = isWide ? styles.cardItem : undefined;

  const allSwipeableRefs = useRef<(Swipeable | null)[]>([]);

  const closeAllSwipeables = useCallback(() => {
    allSwipeableRefs.current.forEach((ref) => ref?.close());
  }, []);

  useFocusEffect(
    useCallback(() => {
      setRefreshKey(k => k + 1);
      closeAllSwipeables();
    }, [closeAllSwipeables])
  );

  const handleShare = async (workout: any) => {
    try {
      const link = await shareWorkout(workout, profile?.username ?? undefined);
      await Share.share({
        message: `Check out my workout "${workout.workoutName}"!\n${link}`,
      });
    } catch {
      Alert.alert('Error', 'Failed to share workout. Please try again.');
    }
  };

  const handleImportFromLink = async (link: string) => {
    try {
      const { workout: fetched, sharedBy } = await importWorkoutFromLink(link);
      const newId = `w_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      let importedName = sharedBy
        ? `${fetched.workoutName} - ${sharedBy}`
        : fetched.workoutName;
      const existingNames = new Set(workouts.map((w) => w.workoutName.toLowerCase()));
      if (existingNames.has(importedName.toLowerCase())) {
        const toRoman = (n: number): string => {
          const numerals: [number, string][] = [[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
          let result = '';
          for (const [value, symbol] of numerals) {
            while (n >= value) { result += symbol; n -= value; }
          }
          return result;
        };
        let num = 2;
        while (existingNames.has(`${importedName.toLowerCase()} ${toRoman(num).toLowerCase()}`)) {
          num++;
        }
        importedName = `${importedName} ${toRoman(num)}`;
      }
      saveWorkout({ ...fetched, id: newId, workoutName: importedName, imported: true });
      Alert.alert('Imported!', `"${importedName}" added to your workouts.`);
    } catch (e: any) {
      const msg =
        e?.message === 'Invalid share link'
          ? "That doesn't look like a valid share link."
          : 'Could not import workout. Check the link and try again.';
      Alert.alert('Import failed', msg);
    }
  };

  if (useStableLoading(isLoading)) {
    return <HomeSkeleton />;
  }

  // Partition workouts — adjust once you have an `imported` flag on WorkoutData
  const myWorkouts = workouts.filter((w) => !w.imported);
  const importedWorkouts = workouts.filter((w) => w.imported);

  const favoriteWorkouts = workouts.filter((w) => favorites.has(w.id ?? ''));
  const nonFavoriteWorkouts = myWorkouts.filter((w) => !favorites.has(w.id ?? ''));
  const nonFavoriteImported = importedWorkouts.filter((w) => !favorites.has(w.id ?? ''));

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <TouchableWithoutFeedback onPress={closeAllSwipeables}>
        <Screen>
          <HomeScreenHeader />
          <WeekStreakBar />
          <WaterIntakeBar />

          <KeyboardAwareScrollView
            contentContainerStyle={styles.list}
            style={{ backgroundColor: colors.background }}
            onScrollBeginDrag={closeAllSwipeables}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid
            extraScrollHeight={20}
          >
            {/* FAVOURITES */}
            {favoriteWorkouts.length > 0 && (
              <>
                <SectionLabel title="FAVOURITES" />
                <View style={gridStyle}>
                {favoriteWorkouts.map((workout, i) => {
                  const globalIndex = workout.id
                    ? workouts.findIndex(w => w.id === workout.id)
                    : workouts.indexOf(workout);
                  if (globalIndex === -1) return null;
                  return (
                    <SwipeableWorkoutCard
                      key={`fav-${globalIndex}`}
                      workout={workout}
                      workoutIndex={globalIndex}
                      refreshKey={refreshKey}
                      allRefs={allSwipeableRefs}
                      refIndex={globalIndex}
                      enterIndex={i}
                      containerStyle={cardStyle}
                      onPress={() => {
                        closeAllSwipeables();
                        navigation.navigate('WorkoutScreen', {
                          workoutData: workout,
                          workoutIndex: globalIndex,
                        });
                      }}
                      onDelete={() => deleteWorkout(globalIndex)}
                      onShare={() => handleShare(workout)}
                    />
                  );
                })}
                </View>
              </>
            )}

            {/* MY WORKOUTS */}
            <SectionLabel title="MY WORKOUTS" onAdd={() => navigation.navigate('CreateWorkout')} />

            {nonFavoriteWorkouts.length === 0 ? (
              <EmptyState />
            ) : (
              <View style={gridStyle}>
              {nonFavoriteWorkouts.map((workout, i) => {
                const globalIndex = workout.id
                  ? workouts.findIndex(w => w.id === workout.id)
                  : workouts.indexOf(workout);
                if (globalIndex === -1) return null;
                return (
                  <SwipeableWorkoutCard
                    key={globalIndex}
                    workout={workout}
                    workoutIndex={globalIndex}
                    refreshKey={refreshKey}
                    allRefs={allSwipeableRefs}
                    refIndex={globalIndex}
                    enterIndex={i}
                    containerStyle={cardStyle}
                    onPress={() => {
                      closeAllSwipeables();
                      navigation.navigate('WorkoutScreen', {
                        workoutData: workout,
                        workoutIndex: globalIndex,
                      });
                    }}
                    onDelete={() => deleteWorkout(globalIndex)}
                    onShare={() => handleShare(workout)}
                  />
                );
              })}
              </View>
            )}

            {/* IMPORTED WORKOUTS */}
            <SectionLabel title="IMPORTED WORKOUTS" />

            <ImportLinkInput onImport={handleImportFromLink} />

            <View style={gridStyle}>
            {nonFavoriteImported.map((workout, i) => {
              const globalIndex = workout.id
                ? workouts.findIndex(w => w.id === workout.id)
                : workouts.indexOf(workout);
              if (globalIndex === -1) return null;
              return (
                <SwipeableWorkoutCard
                  key={globalIndex}
                  workout={workout}
                  workoutIndex={globalIndex}
                  refreshKey={refreshKey}
                  allRefs={allSwipeableRefs}
                  refIndex={globalIndex}
                  enterIndex={i}
                  containerStyle={cardStyle}
                  onPress={() => {
                    closeAllSwipeables();
                    navigation.navigate('WorkoutScreen', {
                      workoutData: workout,
                      workoutIndex: globalIndex,
                    });
                  }}
                  onDelete={() => deleteWorkout(globalIndex)}
                  onShare={() => handleShare(workout)}
                />
              );
            })}
            </View>
          </KeyboardAwareScrollView>

        </Screen>
      </TouchableWithoutFeedback>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  swipeableChildren: {
    borderRadius: CARD_BORDER_RADIUS,
    overflow: 'hidden',
  },

  // Wide-web only: lay workout cards out in a horizontal wrapping grid.
  // `cardItem` sizes each card to a fixed cell so they flow left-to-right
  // and wrap; more columns appear as the content column gets wider.
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardItem: {
    width: 320,
  },

  actionOuter: {
    width: ACTION_WIDTH,
    backgroundColor: colors.background,
  },

  leftInner: {
    flex: 1,
    marginTop: 3,
    marginBottom: 15,
    borderTopLeftRadius: CARD_BORDER_RADIUS,
    borderBottomLeftRadius: CARD_BORDER_RADIUS,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightInner: {
    flex: 1,
    marginTop: 3,
    marginBottom: 15,
    borderTopRightRadius: CARD_BORDER_RADIUS,
    borderBottomRightRadius: CARD_BORDER_RADIUS,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },

  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.button1,
    letterSpacing: 0.4,
  },

  list: {
    marginTop: 16,
    paddingBottom: 40,
    paddingHorizontal: 16,
  },

  // Skeleton silhouette styles
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 12,
  },
  skeletonWeekBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 12,
  },

  // Section labels
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    marginTop: 8,
  },
  sectionLabelLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(181, 181, 181, 0.25)',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
    color: colors.titleText,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.container,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonCavity: {
    width: 18,
    height: 18,
    borderRadius: 3,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state (MY WORKOUTS)
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 10,
    borderRadius: CARD_BORDER_RADIUS,
    backgroundColor: colors.container,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.highlight,
  },
  emptySubText: {
    fontSize: 13,
    color: colors.button1,
  },

  // Import link card
  importCard: {
    borderRadius: CARD_BORDER_RADIUS,
    backgroundColor: colors.container,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  importRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  importIcon: {
    marginRight: 10,
  },
  importInput: {
    flex: 1,
    fontSize: 13,
    color: colors.highlight,
    paddingVertical: 12,
  },
  importButton: {
    paddingLeft: 10,
    paddingVertical: 8,
  },
});