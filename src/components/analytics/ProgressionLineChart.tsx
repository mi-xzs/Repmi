// src/components/analytics/ProgressionLineChart.tsx

import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Modal, Pressable } from "react-native";
import Svg, {
  Path,
  Circle,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { colors } from "../../theme/colors";
import { useAccent } from "../../services/SettingsContext";
import { HeatmapEntry, AnalyticsMode } from "../../types/analytics";

type Period = "W" | "M" | "Y";

interface Props {
  data: HeatmapEntry[];
  exerciseName?: string;
  height?: number;
  mode?: AnalyticsMode;
  title?: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const estimate1RM = (kg: number, reps: number): number =>
  reps === 1 ? kg : Math.round(kg * (1 + reps / 30));

const getEntryValue = (entry: HeatmapEntry, mode: AnalyticsMode): number => {
  if (mode === "bodyweight") return entry.topBwReps ?? 0;
  if (mode === "timed")      return entry.topSeconds ?? 0;
  return entry.topKg;
};

const fmtValue = (val: number, mode: AnalyticsMode): string => {
  if (mode === "timed") {
    const m = Math.floor(val / 60);
    const s = val % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  if (mode === "bodyweight") return `${Math.round(val)}`;
  return `${Math.round(val)} kg`;
};

const fmtGain = (gain: number, mode: AnalyticsMode): string => {
  const pre = gain >= 0 ? "+" : "";
  if (mode === "timed")      return `${pre}${Math.round(gain)}s`;
  if (mode === "bodyweight") return `${pre}${Math.round(gain)}`;
  return `${pre}${Math.round(gain)} kg`;
};

// Compact label for y-axis (tight space)
const fmtAxis = (val: number, mode: AnalyticsMode): string => {
  if (mode === "timed") {
    const m = Math.floor(val / 60);
    const s = val % 60;
    return s === 0 ? `${m}m` : `${m}:${String(s).padStart(2, "0")}`;
  }
  return Math.round(val).toString();
};

const filterByPeriod = (data: HeatmapEntry[], period: Period): HeatmapEntry[] => {
  if (!data.length) return data;
  const now = new Date();
  const daysBack = period === "W" ? 7 : period === "M" ? 30 : 365;
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - daysBack);
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
  return data.filter((d) => d.date >= cutoffStr);
};

const PERIODS: Period[] = ["W", "M", "Y"];
const PERIOD_LABELS: Record<Period, string> = { W: "W", M: "M", Y: "Y" };

// ─── component ────────────────────────────────────────────────────────────────

const ProgressionLineChart: React.FC<Props> = ({
  data,
  exerciseName = "Exercise",
  height = 200,
  mode = "weight",
  title,
}) => {
  const { accent } = useAccent();
  const [period,   setPeriod]   = useState<Period>("M");
  const [infoOpen, setInfoOpen] = useState(false);

  const screenWidth = Dimensions.get("window").width;
  // Chart sits inside scroll (paddingHorizontal: 24) + card (padding: 16) = 80px of horizontal chrome.
  const width = screenWidth - 80;

  const filteredData = useMemo(() => filterByPeriod(data, period), [data, period]);

  const stats = useMemo(() => {
    const valid = filteredData.filter((d) => getEntryValue(d, mode) > 0);
    if (!valid.length) return null;

    const first  = valid[0];
    const latest = valid[valid.length - 1];
    const latestVal = getEntryValue(latest, mode);
    const firstVal  = getEntryValue(first,  mode);

    let allTimePR = getEntryValue(data[0] ?? latest, mode);
    for (const entry of data) {
      const v = getEntryValue(entry, mode);
      if (v > allTimePR) allTimePR = v;
    }

    const gain = latestVal - firstVal;
    const reps = latest.topReps ?? 1;
    const orm  = mode === "weight" && reps <= 12
      ? estimate1RM(latest.topKg, reps)
      : undefined;

    return { currentMax: latestVal, prVal: allTimePR, gain, orm };
  }, [filteredData, data, mode]);

  const chartData = useMemo(() => {
    const valid = filteredData.filter((d) => getEntryValue(d, mode) > 0);
    if (valid.length < 2) return null;

    const values    = valid.map((d) => getEntryValue(d, mode));
    const minVal    = Math.min(...values);
    const maxVal    = Math.max(...values);
    const padding   = Math.max((maxVal - minVal) * 0.25, mode === "timed" ? 5 : 2.5);
    const yMin      = Math.max(0, minVal - padding);
    const yMax      = maxVal + padding;

    const PAD_LEFT   = 38;
    const PAD_RIGHT  = 36;
    const PAD_TOP    = 24;
    const PAD_BOTTOM = 10;
    const chartW     = width - PAD_LEFT - PAD_RIGHT;
    const chartH     = height - PAD_TOP - PAD_BOTTOM;

    const yScale = (v: number) =>
      PAD_TOP + chartH - ((v - yMin) / (yMax - yMin)) * chartH;
    const xScale = (i: number) =>
      PAD_LEFT + (i / Math.max(valid.length - 1, 1)) * chartW;

    let runningMax = 0;
    const points = valid.map((entry, i) => {
      const val = getEntryValue(entry, mode);
      const isPR = val > runningMax;
      if (isPR) runningMax = val;
      return { x: xScale(i), y: yScale(val), val, isPR, date: entry.date };
    });

    const linePath = points
      .map((p, i) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        const prev = points[i - 1];
        const cpX  = (prev.x + p.x) / 2;
        return `C ${cpX} ${prev.y} ${cpX} ${p.y} ${p.x} ${p.y}`;
      })
      .join(" ");

    const baselineY = yScale(yMin);
    const areaPath =
      linePath +
      ` L ${points[points.length - 1].x} ${baselineY}` +
      ` L ${points[0].x} ${baselineY} Z`;

    const yRange    = yMax - yMin || 1;
    const gridLines = [0, 1, 2, 3].map((i) => {
      const v = yMax - (i / 3) * yRange;
      return { y: yScale(v), label: fmtAxis(Math.round(v), mode) };
    });

    const xLabels = [];
    if (points.length) {
      xLabels.push({ x: points[0].x,                   label: formatDate(points[0].date,                   period) });
      xLabels.push({ x: points[points.length - 1].x,   label: formatDate(points[points.length - 1].date,   period) });
    }

    return { points, linePath, areaPath, gridLines, xLabels, chartH, chartW, PAD_LEFT, PAD_TOP };
  }, [filteredData, width, height, period, mode]);

  const hasData      = !!stats;
  const periodLabel  = period === "W" ? "this week" : period === "M" ? "this month" : "this year";
  const sectionLabel = mode === "timed" ? "duration progression" : mode === "bodyweight" ? "rep progression" : "progression";

  const emptyLabels =
    mode === "weight"
      ? ["current max", "gain", "all-time PR", "est. 1RM"]
      : ["current best", "gain", "all-time PR"];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          {title && <Text style={styles.chartTitle}>{title}</Text>}
          <Text style={styles.sectionLabel}>{sectionLabel}</Text>
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
              <Text style={[styles.pillText, period === p && styles.pillTextActive]}>
                {PERIOD_LABELS[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Stat cards */}
      {hasData ? (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
              {fmtValue(stats!.currentMax, mode)}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>current best</Text>
          </View>
          <View style={styles.statCard}>
            <Text
              style={[styles.statValue, stats!.gain >= 0 ? styles.positive : styles.negative]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {fmtGain(stats!.gain, mode)}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>{periodLabel}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
              {fmtValue(stats!.prVal, mode)}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>all-time PR</Text>
          </View>
          {mode === "weight" && stats!.orm != null && (
            <Pressable
              style={styles.statCard}
              onLongPress={() => setInfoOpen(true)}
              delayLongPress={350}
            >
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>~{stats!.orm} kg</Text>
              <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>est. 1RM</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.statsRow}>
          {emptyLabels.map((label) => (
            <View key={label} style={styles.statCard}>
              <Text style={styles.statValueEmpty}>—</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Chart */}
      {chartData ? (
        <View style={styles.chartWrapper}>
          <Svg width={width} height={height + 20}>
            <Defs>
              <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%"   stopColor={colors.highlight} stopOpacity="0.22" />
                <Stop offset="100%" stopColor={colors.highlight} stopOpacity="0.01" />
              </LinearGradient>
            </Defs>

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

            {/* X baseline */}
            <Line
              x1={chartData.PAD_LEFT} y1={chartData.PAD_TOP + chartData.chartH}
              x2={chartData.PAD_LEFT + chartData.chartW} y2={chartData.PAD_TOP + chartData.chartH}
              stroke={colors.button2} strokeWidth={0.5}
            />

            {/* X date labels */}
            {chartData.xLabels.map((xl, i) => (
              <SvgText
                key={`xl-${i}`}
                x={xl.x} y={chartData.PAD_TOP + chartData.chartH + 12}
                fontSize={9} fill={colors.titleText} textAnchor={i === 0 ? "start" : "end"}
              >
                {xl.label}
              </SvgText>
            ))}

            {/* Area fill */}
            <Path d={chartData.areaPath} fill="url(#areaGrad)" />

            {/* Line */}
            <Path
              d={chartData.linePath}
              fill="none" stroke={colors.highlight}
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            />

            {/* Dots — PR points get a gold ring */}
            {chartData.points.map((p, i) => {
              const isLast = i === chartData.points.length - 1;
              return (
                <React.Fragment key={`pt-${i}`}>
                  {p.isPR && (
                    <Circle cx={p.x} cy={p.y} r={8}
                      fill="none" stroke={accent} strokeWidth={1.5} opacity={0.65}
                    />
                  )}
                  <Circle
                    cx={p.x} cy={p.y}
                    r={isLast ? 5 : 3.5}
                    fill={p.isPR ? accent : colors.highlight}
                    opacity={isLast ? 1 : 0.7}
                  />
                </React.Fragment>
              );
            })}

            {/* Latest value label */}
            {(() => {
              const last = chartData.points[chartData.points.length - 1];
              return (
                <SvgText
                  x={last.x} y={last.y - 12}
                  fontSize={11} fontWeight="600"
                  fill={colors.highlight} textAnchor="middle"
                >
                  {fmtValue(last.val, mode).toUpperCase()}
                </SvgText>
              );
            })()}
          </Svg>

          {/* PR legend */}
          <View style={styles.prHint}>
            <View style={[styles.prDot, { backgroundColor: accent }]} />
            <Text style={styles.prHintText}>Personal record</Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No data for this period</Text>
          <Text style={styles.emptySubtext}>
            {period === "W"
              ? "Train this week to see weekly progression"
              : period === "M"
              ? "Complete sessions this month to see monthly trends"
              : "Log sessions throughout the year to track annual progress"}
          </Text>
        </View>
      )}

      <Modal
        visible={infoOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setInfoOpen(false)}
      >
        <Pressable style={styles.infoBackdrop} onPress={() => setInfoOpen(false)}>
          <Pressable style={styles.infoCard} onPress={() => { /* swallow */ }}>
            <Text style={styles.infoTitle}>ESTIMATED 1RM</Text>
            <Text style={styles.infoBody}>
              Your predicted one-rep max — the heaviest weight the formula estimates you could
              lift for a single rep, based on your top working set.
            </Text>
            <Text style={styles.infoSubheading}>HOW IT'S CALCULATED</Text>
            <Text style={styles.infoBody}>
              Using the Epley formula:{"\n"}
              <Text style={[styles.infoFormula, { color: accent }]}>1RM ≈ weight × (1 + reps / 30)</Text>{"\n"}
              Example: 100 kg × 5 reps → ~117 kg estimated 1RM.
            </Text>
            <Text style={styles.infoSubheading}>WHY IT'S USEFUL</Text>
            <Text style={styles.infoBody}>
              Lets you track strength progress without actually testing a true 1RM (risky and
              fatiguing), and compares different rep ranges fairly. Hidden when reps {">"} 12
              since the estimate becomes unreliable past that range.
            </Text>
            <Pressable
              onPress={() => setInfoOpen(false)}
              style={({ pressed }) => [
                styles.infoClose,
                { backgroundColor: accent + '1F' },
                pressed && { backgroundColor: accent + '3D' },
              ]}
            >
              <Text style={[styles.infoCloseText, { color: accent }]}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

function formatDate(dateStr: string | undefined, period: Period): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return "—";
  const date = new Date(y, m - 1, d);
  if (period === "W") return date.toLocaleDateString("en-GB", { weekday: "short" });
  if (period === "M") return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

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
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
    fontWeight: "700",
    color: colors.titleText,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statValueEmpty: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.titleText,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statLabel: {
    fontSize: 9,
    color: colors.titleText,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  positive: { color: "#34d399" },
  negative: { color: "#ef4444" },
  chartWrapper: {
    alignItems: "center",
    paddingHorizontal: 2,
  },
  prHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 8,
    alignSelf: "flex-start",
  },
  prDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  prHintText: {
    fontSize: 11,
    color: colors.titleText,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
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
  infoBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  infoCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.container,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.button3,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.6,
    color: colors.titleText,
  },
  infoSubheading: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: colors.titleText,
    opacity: 0.6,
    marginTop: 6,
  },
  infoBody: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.titleText,
  },
  infoFormula: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  infoClose: {
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 6,
  },
  infoCloseText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});

export default ProgressionLineChart;
