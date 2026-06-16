
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
import { useAccent } from "../../services/SettingsContext";
import { HeatmapEntry, SessionSet, AnalyticsMode } from "../../types/analytics";
import { WorkoutSession } from "../../screens/WorkoutScreen";
import ProgressionLineChart from "./ProgressionLineChart";
import DurationProgressionChart from "./DurationProgressionChart";
import DistanceProgressionChart from "./DistanceProgressionChart";
import BodyweightStackedBarChart from "./BodyweightStackedBarChart";
import { formatDistance } from "../features/workout/MainWorkout";

interface Props {
  sessions: WorkoutSession[];
  weightExercises: string[];
  bodyweightExercises: string[];
  timedExercises: string[];
  distanceExercises?: string[];
}

const detectMode = (sets: SessionSet[]): AnalyticsMode => {
  const working = sets.filter((s) => s.label !== "W");
  if (working.some((s) => (s.kg ?? 0) > 0)) return "weight";
  if (working.some((s) => (s.meters ?? 0) > 0)) return "distance";
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

      if (mode === "distance") {
        const topMeters = workingSets.length > 0 ? Math.max(...workingSets.map((set) => set.meters ?? 0)) : 0;
        return { date, allSets: ex.sets, topKg: 0, topMeters, mode };
      }

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
  if (mode === "distance")   return (entry.topMeters ?? 0) > 0 ? (entry.topMeters ?? 0) : null;
  return (entry.topSeconds ?? 0) > 0 ? (entry.topSeconds ?? 0) : null;
};

const ExerciseProgression: React.FC<Props> = ({ sessions, weightExercises, bodyweightExercises, timedExercises, distanceExercises = [] }) => {
  const { accent } = useAccent();
  const allExercises = [...weightExercises, ...bodyweightExercises, ...timedExercises, ...distanceExercises];

  const [selected,   setSelected]   = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const currentSelected = allExercises.includes(selected) ? selected : (allExercises[0] ?? "");

  const progressionData = buildProgressionData(sessions, currentSelected);

  const latest   = progressionData[progressionData.length - 1];
  const previous = progressionData[progressionData.length - 2];

  const exerciseMode: AnalyticsMode = latest?.mode ?? "weight";

  const latestVal   = getTopVal(latest,   exerciseMode);
  const previousVal = getTopVal(previous, exerciseMode);
  const previousPR = (() => {
    const prior = progressionData.slice(0, -1);
    if (prior.length === 0) return null;
    const vals = prior
      .map(e =>
        exerciseMode === "weight"     ? e.topKg :
        exerciseMode === "bodyweight" ? (e.topBwReps ?? 0) :
        exerciseMode === "distance"   ? (e.topMeters ?? 0) :
                                        (e.topSeconds ?? 0),
      )
      .filter(v => v > 0);
    return vals.length > 0 ? Math.max(...vals) : null;
  })();
  const prDiff   = latestVal !== null && previousPR  !== null ? latestVal - previousPR  : null;
  const lastDiff = latestVal !== null && previousVal !== null ? latestVal - previousVal : null;

  const totalSets = progressionData.reduce(
    (sum, entry) => sum + entry.allSets.filter(s => s.label !== "W").length,
    0,
  );
  const totalReps = progressionData.reduce(
    (sum, entry) =>
      sum + entry.allSets.filter(s => s.label !== "W").reduce((r, s) => r + (s.reps ?? 0), 0),
    0,
  );

  const timedAllTimePR = progressionData.reduce((max, entry) => Math.max(max, entry.topSeconds ?? 0), 0);
  const totalTimeLastSession = latest
    ? latest.allSets.filter((s) => s.label !== "W").reduce((sum, s) => sum + (s.minutes ?? 0) * 60 + (s.seconds ?? 0), 0)
    : 0;

  const distanceAllTimePR = progressionData.reduce((max, entry) => Math.max(max, entry.topMeters ?? 0), 0);
  const totalDistanceLastSession = latest
    ? latest.allSets.filter((s) => s.label !== "W").reduce((sum, s) => sum + (s.meters ?? 0), 0)
    : 0;

  const sectionTitle =
    exerciseMode === "weight"     ? "PR Tracking" :
    exerciseMode === "bodyweight" ? "Rep Progression" :
    exerciseMode === "distance"   ? "Distance Progression" :
                                    "Duration Progression";

  if (allExercises.length === 0) {
    return (
      <View style={styles.weightEmpty}>
        <Text style={styles.emptyText}>Complete a session to see progression</Text>
      </View>
    );
  }

  return (
    <View>
      {/*trigger */}
      <Text style={styles.exerciseSelectorLabel}>SELECT EXERCISE</Text>
      <TouchableOpacity
        style={styles.exerciseSelector}
        onPress={() => setPickerOpen(true)}
        activeOpacity={0.75}
      >
        <Text style={styles.exerciseSelectorText} numberOfLines={1}>
          {currentSelected}
        </Text>
        <Feather name="chevron-down" size={14} color={accent} />
      </TouchableOpacity>

      {/* picker modal */}
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
              {allExercises.map((name: string) => (
                <TouchableOpacity
                  key={`exercise-${name}`}
                  style={[styles.pickerRow, name === currentSelected && styles.pickerRowActive]}
                  onPress={() => { setSelected(name); setPickerOpen(false); }}
                >
                  <Text style={[styles.pickerRowText, name === currentSelected && styles.pickerRowTextActive]}>
                    {name}
                  </Text>
                  {name === currentSelected && (
                    <Feather name="check" size={16} color={accent} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* weight & bodyweight only */}
      {latest && (exerciseMode === "weight" || exerciseMode === "bodyweight") && (
        <View style={[styles.statStrip, { marginBottom: 10 }]}>
          {exerciseMode === "weight" && (latest.topKg ?? 0) > 0 && (
            <View style={styles.statStripItem}>
              <Text style={styles.statStripValue}>{latest.topKg} kg</Text>
              <Text style={styles.statStripLabel}>Top Set</Text>
            </View>
          )}
          {exerciseMode === "bodyweight" && (latest.topBwReps ?? 0) > 0 && (
            <View style={styles.statStripItem}>
              <Text style={styles.statStripValue}>{latest.topBwReps} reps</Text>
              <Text style={styles.statStripLabel}>Best Set</Text>
            </View>
          )}
          {prDiff !== null && (
            <>
              <View style={styles.statStripDivider} />
              <View style={styles.statStripItem}>
                <Text style={[styles.statStripValue, prDiff < 0 && { color: "#E05C5C" }]}>
                  {prDiff >= 0 ? "+" : ""}{exerciseMode === "weight" ? `${prDiff} kg` : String(prDiff)}
                </Text>
                <Text style={styles.statStripLabel}>vs PR</Text>
              </View>
            </>
          )}
          {lastDiff !== null && (
            <>
              <View style={styles.statStripDivider} />
              <View style={styles.statStripItem}>
                <Text style={[styles.statStripValue, lastDiff < 0 && { color: "#E05C5C" }]}>
                  {lastDiff >= 0 ? "+" : ""}{exerciseMode === "weight" ? `${lastDiff} kg` : String(lastDiff)}
                </Text>
                <Text style={styles.statStripLabel}>vs Last</Text>
              </View>
            </>
          )}
        </View>
      )}

      {/*summary badges */}
      {latest && exerciseMode === "timed" && (
        <View style={[styles.statStrip, { marginBottom: 10 }]}>
          {(latest.topSeconds ?? 0) > 0 && (
            <View style={styles.statStripItem}>
              <Text style={styles.statStripValue}>{fmtSecs(latest.topSeconds ?? 0)}</Text>
              <Text style={styles.statStripLabel}>Best Set</Text>
            </View>
          )}
          {prDiff !== null && (
            <>
              <View style={styles.statStripDivider} />
              <View style={styles.statStripItem}>
                <Text style={[styles.statStripValue, prDiff < 0 && { color: "#E05C5C" }]}>
                  {prDiff >= 0 ? "+" : ""}{prDiff}s
                </Text>
                <Text style={styles.statStripLabel}>vs PR</Text>
              </View>
            </>
          )}
          {lastDiff !== null && (
            <>
              <View style={styles.statStripDivider} />
              <View style={styles.statStripItem}>
                <Text style={[styles.statStripValue, lastDiff < 0 && { color: "#E05C5C" }]}>
                  {lastDiff >= 0 ? "+" : ""}{lastDiff}s
                </Text>
                <Text style={styles.statStripLabel}>vs Last</Text>
              </View>
            </>
          )}
          {timedAllTimePR > 0 && (
            <>
              <View style={styles.statStripDivider} />
              <View style={styles.statStripItem}>
                <Text style={styles.statStripValue}>{fmtSecs(timedAllTimePR)}</Text>
                <Text style={styles.statStripLabel}>All-Time PR</Text>
              </View>
            </>
          )}
          {totalTimeLastSession > 0 && (
            <>
              <View style={styles.statStripDivider} />
              <View style={styles.statStripItem}>
                <Text style={styles.statStripValue}>{fmtSecs(totalTimeLastSession)}</Text>
                <Text style={styles.statStripLabel}>Total Time</Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* summary badges */}
      {latest && exerciseMode === "distance" && (
        <View style={[styles.statStrip, { marginBottom: 10 }]}>
          {(latest.topMeters ?? 0) > 0 && (
            <View style={styles.statStripItem}>
              <Text style={styles.statStripValue}>{formatDistance(latest.topMeters ?? 0) || "0m"}</Text>
              <Text style={styles.statStripLabel}>Best Set</Text>
            </View>
          )}
          {prDiff !== null && (
            <>
              <View style={styles.statStripDivider} />
              <View style={styles.statStripItem}>
                <Text style={[styles.statStripValue, prDiff < 0 && { color: "#E05C5C" }]}>
                  {prDiff >= 0 ? "+" : "-"}{formatDistance(Math.abs(prDiff)) || "0m"}
                </Text>
                <Text style={styles.statStripLabel}>vs PR</Text>
              </View>
            </>
          )}
          {lastDiff !== null && (
            <>
              <View style={styles.statStripDivider} />
              <View style={styles.statStripItem}>
                <Text style={[styles.statStripValue, lastDiff < 0 && { color: "#E05C5C" }]}>
                  {lastDiff >= 0 ? "+" : "-"}{formatDistance(Math.abs(lastDiff)) || "0m"}
                </Text>
                <Text style={styles.statStripLabel}>vs Last</Text>
              </View>
            </>
          )}
          {distanceAllTimePR > 0 && (
            <>
              <View style={styles.statStripDivider} />
              <View style={styles.statStripItem}>
                <Text style={styles.statStripValue}>{formatDistance(distanceAllTimePR) || "0m"}</Text>
                <Text style={styles.statStripLabel}>All-Time PR</Text>
              </View>
            </>
          )}
          {totalDistanceLastSession > 0 && (
            <>
              <View style={styles.statStripDivider} />
              <View style={styles.statStripItem}>
                <Text style={styles.statStripValue}>{formatDistance(totalDistanceLastSession) || "0m"}</Text>
                <Text style={styles.statStripLabel}>Total Distance</Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* stats row */}
      {latest && (
        <View style={[styles.statStrip, { marginBottom: 20 }]}>
          <View style={styles.statStripItem}>
            <Text style={styles.statStripValue}>{totalSets}</Text>
            <Text style={styles.statStripLabel}>Total Sets</Text>
          </View>
          {(exerciseMode === "weight" || exerciseMode === "bodyweight") && (
            <>
              <View style={styles.statStripDivider} />
              <View style={styles.statStripItem}>
                <Text style={styles.statStripValue}>{totalReps}</Text>
                <Text style={styles.statStripLabel}>Total Reps</Text>
              </View>
            </>
          )}
          <View style={styles.statStripDivider} />
          <View style={styles.statStripItem}>
            <Text style={styles.statStripValue}>{progressionData.length}</Text>
            <Text style={styles.statStripLabel}>Sessions</Text>
          </View>
        </View>
      )}

      {/* Chart*/}
      {(() => {
        if (progressionData.length === 0) {
          return (
            <View style={styles.weightEmpty}>
              <Text style={styles.emptyText}>No data for this exercise yet</Text>
            </View>
          );
        }
        if (exerciseMode === "timed") {
          if (progressionData.length < 2) return null;
          return (
            <DurationProgressionChart data={progressionData} exerciseName={currentSelected} title={sectionTitle} />
          );
        }
        if (exerciseMode === "distance") {
          if (progressionData.length < 2) return null;
          return (
            <DistanceProgressionChart data={progressionData} exerciseName={currentSelected} title={sectionTitle} />
          );
        }
        const hasChartData = progressionData.some((entry) =>
          exerciseMode === "weight" ? entry.topKg > 0 : (entry.topBwReps ?? 0) > 0
        );
        if (!hasChartData) return null;
        if (exerciseMode === "bodyweight") {
          return (
            <BodyweightStackedBarChart data={progressionData} exerciseName={currentSelected} title={sectionTitle} />
          );
        }
        return (
          <ProgressionLineChart data={progressionData} mode={exerciseMode} exerciseName={currentSelected} title={sectionTitle} />
        );
      })()}
    </View>
  );
};

export default ExerciseProgression;
