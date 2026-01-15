// src/components/analytics/WeightProgression.tsx

import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { styles } from "../../screens/Analytics.Styles";
import { colors } from "../../theme/colors";
import { HeatmapEntry, SessionSet, AnalyticsMode } from "../../types/analytics";
import { WorkoutSession } from "../../screens/WorkoutScreen";
import ProgressionLineChart from "./ProgressionLineChart";

interface Props {
  sessions: WorkoutSession[];
  exerciseNames: string[];
}

const detectMode = (sets: SessionSet[]): AnalyticsMode => {
  const working = sets.filter((s) => s.label !== "W");
  if (working.some((s) => (s.kg ?? 0) > 0)) return "weight";
  if (working.some((s) => (s.minutes ?? 0) > 0 || (s.seconds ?? 0) > 0)) return "timed";
  return "bodyweight";
};

const fmtSecs = (s: number): string => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
};

const buildProgressionData = (
  sessions: WorkoutSession[],
  exerciseName: string,
): HeatmapEntry[] => {
  return sessions
    .map((s) => {
      const ex = s.exercises.find(
        (e) => e.name.toLowerCase() === exerciseName.toLowerCase(),
      );
      if (!ex || ex.sets.length === 0) return null;

      const workingSets = ex.sets.filter((set) => set.label !== "W");
      const mode = detectMode(ex.sets);
      const d = new Date(s.date);
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      if (mode === "weight") {
        const topKg = workingSets.length > 0 ? Math.max(...workingSets.map((set) => set.kg ?? 0)) : 0;
        const topSet = workingSets.find((set) => (set.kg ?? 0) === topKg);
        return { date, allSets: ex.sets, topKg, topReps: topSet?.reps ?? 1, mode };
      }

      if (mode === "bodyweight") {
        const topBwReps = workingSets.length > 0 ? Math.max(...workingSets.map((set) => set.reps ?? 0)) : 0;
        return { date, allSets: ex.sets, topKg: 0, topBwReps, mode };
      }

      // timed
      const topSeconds = workingSets.length > 0
        ? Math.max(...workingSets.map((set) => (set.minutes ?? 0) * 60 + (set.seconds ?? 0)))
        : 0;
      return { date, allSets: ex.sets, topKg: 0, topSeconds, mode };
    })
    .filter(Boolean) as HeatmapEntry[];
};

const getTopVal = (entry: HeatmapEntry | undefined, mode: AnalyticsMode): number | null => {
  if (!entry) return null;
  if (mode === "weight")     return entry.topKg      > 0 ? entry.topKg                : null;
  if (mode === "bodyweight") return (entry.topBwReps ?? 0) > 0 ? (entry.topBwReps ?? 0) : null;
  return (entry.topSeconds ?? 0) > 0 ? (entry.topSeconds ?? 0) : null;
};

const WeightProgression: React.FC<Props> = ({ sessions, exerciseNames }) => {
  const [selected,   setSelected]   = useState(exerciseNames[0] ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);

  const progressionData = buildProgressionData(sessions, selected);

  const latest   = progressionData[progressionData.length - 1];
  const previous = progressionData[progressionData.length - 2];

  const exerciseMode: AnalyticsMode = latest?.mode ?? "weight";

  const latestVal   = getTopVal(latest,   exerciseMode);
  const previousVal = getTopVal(previous, exerciseMode);
  const diff = latestVal !== null && previousVal !== null ? latestVal - previousVal : null;

  const totalSets = latest?.allSets.length ?? 0;
  const totalReps = latest?.allSets.reduce((sum, set) => sum + (set.reps ?? 0), 0) ?? 0;

  const sectionTitle =
    exerciseMode === "weight"     ? "PR Tracking" :
    exerciseMode === "bodyweight" ? "Rep Progression" :
                                    "Duration Progression";

  if (exerciseNames.length === 0) {
    return (
      <View style={styles.weightEmpty}>
        <Text style={styles.emptyText}>Complete a session to see progression</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Exercise picker trigger */}
      <TouchableOpacity
        style={styles.exerciseSelector}
        onPress={() => setPickerOpen(true)}
        activeOpacity={0.75}
      >
        <Text style={styles.exerciseSelectorText} numberOfLines={1}>
          {selected}
        </Text>
        <Feather name="chevron-down" size={14} color={colors.highlight} />
      </TouchableOpacity>

      {/* Exercise picker modal */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setPickerOpen(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Select Exercise</Text>
            <ScrollView>
              {exerciseNames.map((name) => (
                <TouchableOpacity
                  key={`exercise-${name}`}
                  style={[styles.pickerRow, name === selected && styles.pickerRowActive]}
                  onPress={() => { setSelected(name); setPickerOpen(false); }}
                >
                  <Text style={[styles.pickerRowText, name === selected && styles.pickerRowTextActive]}>
                    {name}
                  </Text>
                  {name === selected && (
                    <Feather name="check" size={16} color={colors.highlight} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Summary badges */}
      {latest && (
        <>
          <Text style={styles.weightSectionTitle}>
            {exerciseMode === "weight" ? "Top Set" : "Best Set"}
          </Text>
          <View style={styles.weightSummaryRow}>
            {exerciseMode === "weight" && (latest.topKg ?? 0) > 0 && (
              <View style={styles.weightSummaryCard}>
                <Text style={styles.statValue}>{latest.topKg} kg</Text>
                <Text style={styles.statLabel}>Top Set</Text>
              </View>
            )}
            {exerciseMode === "bodyweight" && (latest.topBwReps ?? 0) > 0 && (
              <View style={styles.weightSummaryCard}>
                <Text style={styles.statValue}>{latest.topBwReps} reps</Text>
                <Text style={styles.statLabel}>Best Set</Text>
              </View>
            )}
            {exerciseMode === "timed" && (latest.topSeconds ?? 0) > 0 && (
              <View style={styles.weightSummaryCard}>
                <Text style={styles.statValue}>{fmtSecs(latest.topSeconds ?? 0)}</Text>
                <Text style={styles.statLabel}>Best Set</Text>
              </View>
            )}
            {diff !== null && (
              <View style={styles.weightSummaryCard}>
                <Text style={[styles.statValue, { color: diff >= 0 ? "#6fcf97" : "#eb5757" }]}>
                  {diff >= 0 ? "+" : ""}
                  {exerciseMode === "weight"
                    ? `${diff} kg`
                    : exerciseMode === "timed"
                    ? `${diff}s`
                    : String(diff)}
                </Text>
                <Text style={styles.statLabel}>vs Previous</Text>
              </View>
            )}
          </View>
          <View style={styles.weightDivider} />
        </>
      )}

      {/* Stats row */}
      {latest && (
        <View style={styles.weightSummaryRow}>
          <View style={styles.weightSummaryCard}>
            <Text style={styles.statValue}>{totalSets}</Text>
            <Text style={styles.statLabel}>Total Sets</Text>
          </View>
          {exerciseMode !== "timed" && (
            <View style={styles.weightSummaryCard}>
              <Text style={styles.statValue}>{totalReps}</Text>
              <Text style={styles.statLabel}>Total Reps</Text>
            </View>
          )}
          <View style={styles.weightSummaryCard}>
            <Text style={styles.statValue}>{progressionData.length}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
        </View>
      )}

      {/* Chart — only when there's mode-appropriate data */}
      {(() => {
        if (progressionData.length === 0) {
          return (
            <View style={styles.weightEmpty}>
              <Text style={styles.emptyText}>No data for this exercise yet</Text>
            </View>
          );
        }
        const hasChartData = progressionData.some((entry) =>
          exerciseMode === "weight"     ? entry.topKg > 0 :
          exerciseMode === "bodyweight" ? (entry.topBwReps ?? 0) > 0 :
                                          (entry.topSeconds ?? 0) > 0
        );
        if (!hasChartData) return null;
        return (
          <>
            <Text style={styles.sectionTitle}>{sectionTitle}</Text>
            <ProgressionLineChart data={progressionData} mode={exerciseMode} />
          </>
        );
      })()}
    </View>
  );
};

export default WeightProgression;
