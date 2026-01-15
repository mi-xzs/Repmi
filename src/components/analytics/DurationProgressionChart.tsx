import React, { useMemo } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Svg, { Rect, Line, Text as SvgText } from "react-native-svg";
import { colors } from "../../theme/colors";
import { useAccent } from "../../services/SettingsContext";
import { HeatmapEntry } from "../../types/analytics";
import AnimatedBar from "./AnimatedBar";

const MAX_BARS = 12;

const fmtSecs = (s: number): string => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
};

const getSessionTotal = (entry: HeatmapEntry): number =>
  entry.allSets
    .filter((s) => s.label !== "W")
    .reduce((sum, s) => sum + (s.minutes ?? 0) * 60 + (s.seconds ?? 0), 0);

interface Props {
  data: HeatmapEntry[];
  exerciseName?: string;
  title?: string;
}

export default function DurationProgressionChart({ data, exerciseName = "Exercise", title }: Props) {
  const { accent } = useAccent();
  const chartWidth = Math.min(Dimensions.get("window").width - 32, 345);

  const stats = useMemo(() => {
    const valid = data.filter((e) => getSessionTotal(e) > 0);
    if (!valid.length) return null;
    const latest   = valid[valid.length - 1];
    const previous = valid[valid.length - 2];
    const totalTime = getSessionTotal(latest);
    const diff = previous ? totalTime - getSessionTotal(previous) : null;
    let allTimePR = 0;
    for (const e of data) {
      const t = getSessionTotal(e);
      if (t > allTimePR) allTimePR = t;
    }
    return { totalTime, diff, allTimePR };
  }, [data]);

  const recent  = data.slice(-MAX_BARS);
  const volumes = recent.map(getSessionTotal);
  const maxVol  = Math.max(...volumes, 1);

  const PAD_L   = 44;
  const PAD_R   = 12;
  const PAD_T   = 12;
  const PAD_B   = 8;
  const CHART_H = 120;
  const innerW  = chartWidth - PAD_L - PAD_R;
  const innerH  = CHART_H - PAD_T - PAD_B;

  const barCount = recent.length;
  const barGap   = barCount > 8 ? 3 : 5;
  const barW     = Math.max((innerW - (barCount - 1) * barGap) / Math.max(barCount, 1), 4);

  const yLabels = [0, 1, 2, 3].map((i) => ({
    y:     PAD_T + (i / 3) * innerH,
    label: fmtSecs(Math.round(maxVol * (1 - i / 3))),
  }));

  const latest      = data[data.length - 1];
  const fatigueSets = (latest?.allSets ?? [])
    .filter((s) => s.label !== "W")
    .map((s) => ({ label: s.label, secs: (s.minutes ?? 0) * 60 + (s.seconds ?? 0) }))
    .filter((s) => s.secs > 0);
  const maxFatigue = Math.max(...fatigueSets.map((s) => s.secs), 1);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {title && <Text style={styles.chartTitle}>{title}</Text>}
        <Text style={styles.sectionLabel}>duration progression</Text>
        <Text style={styles.exerciseName}>{exerciseName}</Text>
      </View>

      {/* Stat cards */}
      <View style={styles.statsRow}>
        {stats ? (
          <>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{fmtSecs(stats.totalTime)}</Text>
              <Text style={styles.statLabel}>total time</Text>
            </View>
            <View style={styles.statCard}>
              {stats.diff !== null ? (
                <Text style={[styles.statValue, stats.diff >= 0 ? styles.positive : styles.negative]}>
                  {stats.diff >= 0 ? "+" : "-"}{fmtSecs(Math.abs(stats.diff))}
                </Text>
              ) : (
                <Text style={styles.statValueEmpty}>—</Text>
              )}
              <Text style={styles.statLabel}>vs previous</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{fmtSecs(stats.allTimePR)}</Text>
              <Text style={styles.statLabel}>all-time PR</Text>
            </View>
          </>
        ) : (
          ["total time", "vs previous", "all-time PR"].map((label) => (
            <View key={label} style={styles.statCard}>
              <Text style={styles.statValueEmpty}>—</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))
        )}
      </View>

      {/* Volume bar chart */}
      {recent.length > 0 ? (
        <>
          <Text style={styles.subLabel}>Session Volume</Text>
          <View style={styles.chartWrapper}>
            <Svg width={chartWidth} height={CHART_H + 8}>
              {yLabels.map((yl, i) => (
                <React.Fragment key={`y-${i}`}>
                  <Line
                    x1={PAD_L} y1={yl.y}
                    x2={PAD_L + innerW} y2={yl.y}
                    stroke={colors.button2} strokeWidth={0.5}
                    strokeDasharray="3,3" opacity={0.4}
                  />
                  <SvgText
                    x={PAD_L - 5} y={yl.y + 4}
                    fontSize={8} fill={colors.titleText} textAnchor="end"
                  >
                    {yl.label}
                  </SvgText>
                </React.Fragment>
              ))}

              {recent.map((_entry, i) => {
                const vol  = volumes[i];
                const barH = (vol / maxVol) * innerH;
                const x    = PAD_L + i * (barW + barGap);
                const y    = PAD_T + innerH - barH;
                const isLatest = i === recent.length - 1;
                return (
                  <Rect
                    key={`bar-${i}`}
                    x={x} y={Math.max(y, PAD_T)}
                    width={barW} height={Math.max(barH, 1)}
                    rx={3}
                    fill={isLatest ? accent : colors.button2}
                    opacity={isLatest ? 1 : 0.55}
                  />
                );
              })}

              <Line
                x1={PAD_L} y1={PAD_T + innerH}
                x2={PAD_L + innerW} y2={PAD_T + innerH}
                stroke={colors.button2} strokeWidth={0.5}
              />

              {(() => {
                const vol = volumes[volumes.length - 1];
                if (!vol) return null;
                const barH = (vol / maxVol) * innerH;
                const x    = PAD_L + (recent.length - 1) * (barW + barGap) + barW / 2;
                const y    = PAD_T + innerH - barH - 6;
                return (
                  <SvgText x={x} y={y} fontSize={9} fill={accent}
                    textAnchor="middle" fontWeight="600">
                    {fmtSecs(vol)}
                  </SvgText>
                );
              })()}
            </Svg>
          </View>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No data yet</Text>
        </View>
      )}

      {/* Fatigue curve — last session's set breakdown */}
      {fatigueSets.length >= 2 && (
        <>
          <Text style={[styles.subLabel, { marginTop: 16 }]}>Last Session</Text>
          <View style={styles.fatigueContainer}>
            {fatigueSets.map((set, i) => (
              <View key={`fs-${i}`} style={styles.fatigueRow}>
                <Text style={styles.fatigueSetLabel}>{set.label}</Text>
                <AnimatedBar
                  percent={Math.round((set.secs / maxFatigue) * 100)}
                  delay={Math.min(i, 6) * 60}
                  trackStyle={styles.fatigueTrack}
                  fillStyle={[
                    styles.fatigueBar,
                    {
                      backgroundColor: accent,
                      opacity: Math.max(0.32, 0.88 - i * 0.1),
                    },
                  ]}
                />
                <Text style={styles.fatigueDuration}>{fmtSecs(set.secs)}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
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
  subLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.titleText,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  chartWrapper: {
    paddingHorizontal: 2,
  },
  emptyState: {
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: colors.titleText,
    fontWeight: "500",
  },
  fatigueContainer: {
    paddingHorizontal: 14,
    gap: 8,
  },
  fatigueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  fatigueSetLabel: {
    width: 22,
    fontSize: 11,
    fontWeight: "600",
    color: colors.titleText,
    textAlign: "right",
  },
  fatigueTrack: {
    flex: 1,
    height: 20,
    backgroundColor: colors.button3,
    borderRadius: 4,
    overflow: "hidden",
  },
  fatigueBar: {
    height: "100%",
    borderRadius: 4,
  },
  fatigueDuration: {
    width: 34,
    fontSize: 11,
    fontWeight: "600",
    color: colors.highlight,
    textAlign: "right",
  },
});
