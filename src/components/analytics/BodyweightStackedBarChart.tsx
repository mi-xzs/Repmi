import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
import Svg, { Rect, Line, Text as SvgText } from "react-native-svg";
import { colors } from "../../theme/colors";
import { useAccent } from "../../services/SettingsContext";
import { HeatmapEntry } from "../../types/analytics";

type Period = "W" | "M" | "Y";

interface BarData {
  date: string;
  sets: number[];
  totalReps: number;
  isPR: boolean;
}

interface Props {
  data: HeatmapEntry[];
  exerciseName?: string;
  height?: number;
  title?: string;
}

const MAX_BARS = 12;
const PERIODS: Period[] = ["W", "M", "Y"];

const filterByPeriod = (data: HeatmapEntry[], period: Period): HeatmapEntry[] => {
  if (!data.length) return data;
  const now = new Date();
  const daysBack = period === "W" ? 7 : period === "M" ? 30 : 365;
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - daysBack);
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
  return data.filter((d) => d.date >= cutoffStr);
};

const formatDate = (dateStr: string | undefined, period: Period): string => {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return "—";
  const date = new Date(y, m - 1, d);
  if (period === "W") return date.toLocaleDateString("en-GB", { weekday: "short" });
  if (period === "M") return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return date.toLocaleDateString("en-GB", { month: "short" });
};

const segmentOpacity = (idx: number, total: number): number => {
  if (total === 1) return 0.88;
  const max = 0.88;
  const min = 0.32;
  return max - (idx / (total - 1)) * (max - min);
};

const BodyweightStackedBarChart: React.FC<Props> = ({
  data,
  exerciseName = "Exercise",
  height = 180,
  title,
}) => {
  const { accent } = useAccent();
  const [period, setPeriod] = useState<Period>("M");

  const screenWidth = Dimensions.get("window").width;
  const width = Math.min(screenWidth - 32, 345);

  const filteredData = useMemo(() => filterByPeriod(data, period), [data, period]);

  const bars = useMemo((): BarData[] => {
    const entries = filteredData.slice(-MAX_BARS);
    let runningMaxTotal = 0;
    return entries.map((entry) => {
      const sets = entry.allSets
        .filter((s) => s.label !== "W")
        .map((s) => s.reps ?? 0)
        .filter((r) => r > 0);
      const totalReps = sets.reduce((sum, r) => sum + r, 0);
      const isPR = totalReps > runningMaxTotal;
      if (isPR) runningMaxTotal = totalReps;
      return { date: entry.date, sets, totalReps, isPR };
    });
  }, [filteredData]);

  const stats = useMemo(() => {
    const valid = bars.filter((b) => b.totalReps > 0);
    if (!valid.length) return null;
    const latest = valid[valid.length - 1];
    const first = valid[0];
    const gain = latest.totalReps - first.totalReps;
    let allTimePR = 0;
    for (const entry of data) {
      const total = entry.allSets
        .filter((s) => s.label !== "W")
        .reduce((sum, s) => sum + (s.reps ?? 0), 0);
      if (total > allTimePR) allTimePR = total;
    }
    return { totalReps: latest.totalReps, gain, allTimePR };
  }, [bars, data]);

  const chartData = useMemo(() => {
    const validBars = bars.filter((b) => b.totalReps > 0);
    if (!validBars.length) return null;

    const PAD_LEFT = 36;
    const PAD_RIGHT = 12;
    const PAD_TOP = 16;
    const PAD_BOTTOM = 24;
    const chartW = width - PAD_LEFT - PAD_RIGHT;
    const chartH = height - PAD_TOP - PAD_BOTTOM;

    const maxTotal = Math.max(...validBars.map((b) => b.totalReps));
    const yMax = Math.ceil(maxTotal / 5) * 5 || 10;

    const n = validBars.length;
    const gap = n > 8 ? 3 : 5;
    const barW = Math.max(8, (chartW - (n - 1) * gap) / n);

    const gridLines = [0, 1, 2, 3].map((i) => {
      const v = Math.round((yMax / 3) * (3 - i));
      const y = PAD_TOP + chartH - (v / yMax) * chartH;
      return { y, label: String(v) };
    });

    const barItems = validBars.map((bar, i) => {
      const x = PAD_LEFT + i * (barW + gap);
      const baselineY = PAD_TOP + chartH;
      let currentY = baselineY;

      const segments = bar.sets.map((reps, si) => {
        const segH = (reps / yMax) * chartH;
        const segY = currentY - segH;
        currentY = segY;
        return { reps, y: segY, height: Math.max(segH, 0), opacity: segmentOpacity(si, bar.sets.length) };
      });

      return { bar, x, barW, segments, topY: currentY };
    });

    return { barItems, gridLines, chartW, PAD_LEFT, PAD_TOP, PAD_BOTTOM, chartH };
  }, [bars, width, height]);

  const periodLabel = period === "W" ? "this week" : period === "M" ? "this month" : "this year";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          {title && <Text style={styles.chartTitle}>{title}</Text>}
          <Text style={styles.sectionLabel}>rep volume</Text>
          <Text style={styles.exerciseName}>{exerciseName}</Text>
        </View>
        <View style={styles.pillRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.pill, period === p && styles.pillActive]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, period === p && styles.pillTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Stat cards */}
      <View style={styles.statsRow}>
        {stats ? (
          <>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalReps}</Text>
              <Text style={styles.statLabel}>total reps</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, stats.gain >= 0 ? styles.positive : styles.negative]}>
                {stats.gain >= 0 ? "+" : ""}{stats.gain}
              </Text>
              <Text style={styles.statLabel}>{periodLabel}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.allTimePR}</Text>
              <Text style={styles.statLabel}>all-time PR</Text>
            </View>
          </>
        ) : (
          ["total reps", "gain", "all-time PR"].map((label) => (
            <View key={label} style={styles.statCard}>
              <Text style={styles.statValueEmpty}>—</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))
        )}
      </View>

      {/* Chart */}
      {chartData ? (
        <View style={styles.chartWrapper}>
          <Svg width={width} height={height + 20}>
            {/* Grid lines */}
            {chartData.gridLines.map((line, i) => (
              <React.Fragment key={`g-${i}`}>
                <Line
                  x1={chartData.PAD_LEFT} y1={line.y}
                  x2={chartData.PAD_LEFT + chartData.chartW} y2={line.y}
                  stroke={colors.button2} strokeWidth={0.5} strokeDasharray="4,4" opacity={0.5}
                />
                <SvgText
                  x={chartData.PAD_LEFT - 6} y={line.y + 4}
                  fontSize={9} fill={colors.titleText} textAnchor="end"
                >
                  {line.label}
                </SvgText>
              </React.Fragment>
            ))}

            {/* Baseline */}
            <Line
              x1={chartData.PAD_LEFT} y1={chartData.PAD_TOP + chartData.chartH}
              x2={chartData.PAD_LEFT + chartData.chartW} y2={chartData.PAD_TOP + chartData.chartH}
              stroke={colors.button2} strokeWidth={0.5}
            />

            {/* Bars */}
            {chartData.barItems.map(({ bar, x, barW, segments, topY }, bi) => (
              <React.Fragment key={`bar-${bi}`}>
                {segments.map((seg, si) => (
                  <Rect
                    key={`seg-${bi}-${si}`}
                    x={x}
                    y={seg.y}
                    width={barW}
                    height={seg.height}
                    rx={si === 0 ? 3 : 0}
                    ry={si === 0 ? 3 : 0}
                    fill={accent}
                    opacity={seg.opacity}
                  />
                ))}

                {/* PR dot above bar */}
                {bar.isPR && segments.length > 0 && (
                  <Rect
                    x={x + barW / 2 - 2}
                    y={topY - 7}
                    width={4}
                    height={4}
                    rx={2}
                    fill={colors.fav}
                    opacity={0.9}
                  />
                )}

                {/* Date label */}
                <SvgText
                  x={x + barW / 2}
                  y={chartData.PAD_TOP + chartData.chartH + 14}
                  fontSize={8}
                  fill={colors.titleText}
                  textAnchor="middle"
                >
                  {formatDate(bar.date, period)}
                </SvgText>
              </React.Fragment>
            ))}
          </Svg>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>PR session</Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No data for this period</Text>
          <Text style={styles.emptySubtext}>
            {period === "W"
              ? "Train this week to see weekly rep volume"
              : period === "M"
              ? "Complete sessions this month to see monthly trends"
              : "Log sessions throughout the year to track annual progress"}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.container,
    borderRadius: 18,
    paddingTop: 14,
    paddingBottom: 14,
    marginVertical: 12,
    overflow: "hidden",
    alignSelf: "stretch",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.titleText,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  sectionLabel: {
    fontSize: 10,
    color: colors.titleText,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.highlight,
  },
  pillRow: {
    flexDirection: "row",
    backgroundColor: colors.button3,
    borderRadius: 9,
    padding: 3,
    gap: 2,
  },
  pill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 7,
  },
  pillActive: { backgroundColor: colors.button2 },
  pillText: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.titleText,
  },
  pillTextActive: { color: colors.highlight },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    gap: 6,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.button3,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: "center",
    gap: 3,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.highlight,
    textAlign: "center",
  },
  statValueEmpty: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.titleText,
    textAlign: "center",
  },
  statLabel: {
    fontSize: 9,
    color: colors.titleText,
    fontWeight: "500",
    textAlign: "center",
  },
  positive: { color: "#34d399" },
  negative: { color: "#ef4444" },
  chartWrapper: {
    alignItems: "center",
    paddingHorizontal: 2,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 8,
    alignSelf: "flex-start",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.fav,
  },
  legendText: {
    fontSize: 11,
    color: colors.titleText,
    fontWeight: "500",
  },
  emptyState: {
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 6,
  },
  emptyText: {
    fontSize: 14,
    color: colors.titleText,
    fontWeight: "500",
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.titleText,
    opacity: 0.55,
    textAlign: "center",
    lineHeight: 18,
  },
});

export default BodyweightStackedBarChart;
