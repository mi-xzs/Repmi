// src/components/analytics/RPEProgression.tsx

import React, { useMemo, useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { getContentWidth } from "../../hooks/useResponsive";
import Svg, {
  Path,
  Circle,
  Line,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { colors } from "../../theme/colors";
import { useAccent } from "../../services/SettingsContext";
import { WorkoutSession } from "../../screens/WorkoutScreen";
import { useAuth } from "../../services/AuthContext";
import { loadRPEEntries as sbLoadRPEEntries } from "../../services/sessionService";
import { logError } from "../../services/logger";

interface RPEData {
  date: string;
  rpe: number;
}

interface Props {
  workouts: any[];
  sessions: WorkoutSession[];
  workoutId?: string;
}

// Zones + per-rpe color are derived from the active accent at render time
// so equipping a cosmetic theme (Crimson / Pink) re-tints the bands.
const makeZones = (accent: string) => [
  { min: 1, max: 4,  color: accent,         label: "Easy",     fill: accent + "28" },
  { min: 4, max: 6,  color: accent + "BB",  label: "Moderate", fill: accent + "1C" },
  { min: 6, max: 8,  color: accent + "88",  label: "Hard",     fill: accent + "12" },
  { min: 8, max: 10, color: accent + "55",  label: "Max",      fill: accent + "08" },
];

const getRPEColor = (rpe: number, accent: string): string => {
  if (rpe <= 4) return accent;
  if (rpe <= 6) return accent + "BB";
  if (rpe <= 8) return accent + "88";
  return accent + "55";
};

const RPEProgression: React.FC<Props> = ({ workouts, sessions, workoutId }) => {
  const { accent } = useAccent();
  const ZONES = useMemo(() => makeZones(accent), [accent]);
  const { session: authSession } = useAuth();
  const userId = authSession?.user.id ?? '';
  const [rpeData, setRpeData] = useState<RPEData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRPEData = async () => {
      if (!workoutId || !userId) {
        setRpeData([]);
        setLoading(false);
        return;
      }
      try {
        const entries = await sbLoadRPEEntries(userId, workoutId);
        const data: RPEData[] = entries.map(entry => ({
          date: new Date(entry.recordedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          }),
          rpe: entry.rating,
        }));
        setRpeData(data);
      } catch (error) {
        logError('rpe.progression.load.failed', { name: (error as Error)?.name });
      } finally {
        setLoading(false);
      }
    };

    loadRPEData();
  }, [userId, workoutId]);

  // Size to the actual container width (measured) so the chart fits whatever
  // cell it sits in. Falls back to the window-derived width before layout.
  const [boxW, setBoxW] = useState(0);
  const screenWidth = getContentWidth(Dimensions.get("window").width);
  const WIDTH = boxW > 0 ? boxW : screenWidth - 80;
  const HEIGHT = 220;

  const PAD_LEFT = 32;
  const PAD_RIGHT = 16;
  const PAD_TOP = 12;
  const PAD_BOTTOM = 28;
  const chartW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const chartH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const RPE_MIN = 1;
  const RPE_MAX = 10;

  const yScale = (rpe: number) =>
    PAD_TOP + chartH - ((rpe - RPE_MIN) / (RPE_MAX - RPE_MIN)) * chartH;

  const xScale = (i: number, total: number) =>
    total === 1
      ? PAD_LEFT + chartW / 2
      : PAD_LEFT + (i / (total - 1)) * chartW;

  const chartData = useMemo(() => {
    if (rpeData.length === 0) return null;

    const points = rpeData.map((entry, i) => ({
      x: xScale(i, rpeData.length),
      y: yScale(entry.rpe),
      rpe: entry.rpe,
      date: entry.date,
    }));

    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");

    const avg = rpeData.reduce((s, d) => s + d.rpe, 0) / rpeData.length;
    const latest = rpeData[rpeData.length - 1].rpe;
    const first = rpeData[0].rpe;
    const trend = latest > first ? "↑ Harder" : latest < first ? "↓ Easier" : "→ Stable";
    const trendColor = latest > first ? "#e05555" : latest < first ? "#55c47a" : colors.highlight;

    return { points, linePath, avg, latest, trend, trendColor };
  }, [rpeData]);

  if (loading || !chartData) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>RPE Over Time</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {loading ? "Loading..." : "No RPE data yet"}
          </Text>
        </View>
      </View>
    );
  }

  const { points, linePath, avg, latest, trend, trendColor } = chartData;
  const lastPoint = points[points.length - 1];
  const yAxisValues = [2, 4, 6, 8, 10];

  return (
    <View
      style={styles.container}
      onLayout={(e) => setBoxW(e.nativeEvent.layout.width)}
    >

      <Svg width={WIDTH} height={HEIGHT}>
        {/* Zone bands */}
        {ZONES.map((zone) => {
          const y1 = yScale(zone.max);
          const y2 = yScale(zone.min);
          return (
            <Rect
              key={zone.label}
              x={PAD_LEFT}
              y={y1}
              width={chartW}
              height={y2 - y1}
              fill={zone.fill}
            />
          );
        })}

        {/* Y-axis grid lines + labels */}
        {yAxisValues.map((v) => {
          const y = yScale(v);
          return (
            <React.Fragment key={`y-${v}`}>
              <Line
                x1={PAD_LEFT}
                y1={y}
                x2={PAD_LEFT + chartW}
                y2={y}
                stroke="#2a2a2a"
                strokeWidth={0.75}
              />
              <SvgText
                x={PAD_LEFT - 6}
                y={y + 4}
                fontSize={9}
                fill={colors.titleText}
                textAnchor="end"
              >
                {v}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* X baseline */}
        <Line
          x1={PAD_LEFT}
          y1={PAD_TOP + chartH}
          x2={PAD_LEFT + chartW}
          y2={PAD_TOP + chartH}
          stroke={colors.button2}
          strokeWidth={0.75}
        />

        {/* X-axis labels: first + last */}
        <SvgText
          x={PAD_LEFT}
          y={HEIGHT - 6}
          fontSize={9}
          fill={colors.titleText}
          textAnchor="start"
        >
          {String(rpeData[0].date).toUpperCase()}
        </SvgText>
        <SvgText
          x={PAD_LEFT + chartW}
          y={HEIGHT - 6}
          fontSize={9}
          fill={colors.titleText}
          textAnchor="end"
        >
          {String(rpeData[rpeData.length - 1].date).toUpperCase()}
        </SvgText>

        {/* Connecting line */}
        {points.length > 1 && (
          <Path
            d={linePath}
            fill="none"
            stroke={colors.highlight}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.4}
          />
        )}

        {/* Data point dots */}
        {points.map((p, i) => {
          const isLast = i === points.length - 1;
          return (
            <Circle
              key={`dot-${i}`}
              cx={p.x}
              cy={p.y}
              r={isLast ? 6 : 4}
              fill={getRPEColor(p.rpe, accent)}
              opacity={isLast ? 1 : 0.7}
            />
          );
        })}

        {/* Latest RPE label */}
        <SvgText
          x={lastPoint.x}
          y={lastPoint.y - 11}
          fontSize={12}
          fontWeight="600"
          fill={getRPEColor(lastPoint.rpe, accent)}
          textAnchor="middle"
        >
          {lastPoint.rpe}
        </SvgText>
      </Svg>

      {/* Zone legend */}
      <View style={styles.zoneLegend}>
        {ZONES.map((zone) => (
          <View key={zone.label} style={styles.zonePill}>
            <View style={[styles.zoneDot, { backgroundColor: zone.color }]} />
            <Text style={styles.zoneLabel}>{zone.label}</Text>
          </View>
        ))}
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{avg.toFixed(1)}</Text>
          <Text style={styles.statLabel}>avg</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: getRPEColor(latest, accent) }]}>
            {latest}
          </Text>
          <Text style={styles.statLabel}>latest</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: trendColor }]}>{trend}</Text>
          <Text style={styles.statLabel}>trend</Text>
        </View>
      </View>
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
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.highlight,
    paddingHorizontal: 16,
    paddingBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  zoneLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  zonePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  zoneDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  zoneLabel: {
    fontSize: 11,
    color: colors.titleText,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.button2,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.highlight,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statLabel: {
    fontSize: 10,
    color: colors.titleText,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.button2,
  },
  emptyState: {
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.titleText,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

export default RPEProgression;