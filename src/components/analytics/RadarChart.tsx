// src/components/analytics/RadarChart.tsx

import React from "react";
import { Dimensions, Text, View } from "react-native";
import { getContentWidth } from "../../hooks/useResponsive";
import Svg, {
  Circle,
  Line,
  Polygon,
  Text as SvgText,
  TSpan,
} from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import { styles } from "../../screens/Analytics.Styles";
import { colors } from "../../theme/colors";
import { useAccent } from "../../services/SettingsContext";
import { RadarPoint } from "../../types/analytics";

// Chart sits inside scroll (24) + card (16) padding = 80px chrome on each side total.
// Cap at 360 so it doesn't get absurd on tablets.
const SCREEN_W = getContentWidth(Dimensions.get("window").width);
const SIZE     = Math.min(SCREEN_W - 80, 360);
// Bleed past radarContainer's 12px padding AND into the screen's 16px gutter
// (12 + 16 = 28) so the SVG canvas reaches the screen edge on small phones,
// giving long labels like SHOULDERS / HAMSTRINGS room before they clip.
// Applied via marginHorizontal on the chart's wrapper View below.
const BLEED    = 28;
const CHART    = SIZE + BLEED * 2;
// ViewBox is larger than the rendered canvas so SvgText doesn't get clipped at
// the edges. Polygon radius is scaled up by the same factor so the chart still
// renders at its absolute target px size after the viewBox is fitted into CHART.
const PAD_X    = 64;
const PAD_Y    = 64;                     // symmetric with PAD_X so the square viewBox fits the square SVG canvas without letterboxing
const VB_W     = CHART + PAD_X * 2;
const VB_H     = CHART + PAD_Y * 2;
const SCALE    = VB_W / CHART;           // viewBox shrink factor when fit into CHART
const CX       = VB_W / 2;
const CY       = VB_H / 2;
const RADIUS   = 100 * SCALE;            // polygon — 100px rendered radius (max that fits long labels on small phones after the BLEED)
const LABEL_R  = RADIUS + 8 * SCALE;     // 8px gap between polygon and label
const LEVELS   = 4;



interface Props {
  data:         RadarPoint[];
  title:        string;
  color:        keyof typeof colors;
  emptyMessage: string;
}



const angle = (i: number, n: number): number =>
  (Math.PI * 2 * i) / n - Math.PI / 2;

const px = (i: number, r: number, n: number): number =>
  CX + r * Math.cos(angle(i, n));

const py = (i: number, r: number, n: number): number =>
  CY + r * Math.sin(angle(i, n));

const levelPolygon = (level: number, n: number): string =>
  Array.from(
    { length: n },
    (_, i) => `${px(i, (RADIUS * level) / LEVELS, n)},${py(i, (RADIUS * level) / LEVELS, n)}`
  ).join(" ");

/** Uppercases the label and wraps long text across two lines so it fits inside the chart. */
const wrapLabel = (text: string): string[] => {
  const upper = text.toUpperCase();
  const words = upper.split(" ").filter(Boolean);
  // Short single word — keep on one line
  if (words.length === 1 && upper.length <= 11) return [upper];
  // Long single word — split mid-word with hyphen
  if (words.length === 1) {
    const mid = Math.ceil(upper.length / 2);
    return [upper.slice(0, mid) + "-", upper.slice(mid)];
  }
  // Multi-word — find the split point that balances the two lines by char length
  // (rather than by word count). Keeps 3-4 word names like
  // "BENT OVER BARBELL ROW" from going lopsided.
  const total = upper.length;
  let bestSplit = 1;
  let bestDelta = Infinity;
  let running = 0;
  for (let i = 0; i < words.length - 1; i++) {
    running += words[i].length + 1; // +1 for the space
    const delta = Math.abs(running * 2 - total);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestSplit = i + 1;
    }
  }
  return [
    words.slice(0, bestSplit).join(" "),
    words.slice(bestSplit).join(" "),
  ];
};



const MIN_ENTRIES = 4;

const RadarChart: React.FC<Props> = ({ data, title, color, emptyMessage }) => {
  const { accent, accentDim } = useAccent();
  if (data.length === 0) {
    return (
      <View style={styles.radarContainer}>
        <Text style={styles.radarTitle}>{title}</Text>
        <View style={styles.radarEmpty}>
          <Feather
            name="radio"
            size={28}
            color={colors.button1}
            style={{ marginBottom: 8 }}
          />
          <Text style={styles.emptyText}>{emptyMessage}</Text>
          <Text style={[styles.radarCountdown, { color: accent }]}>
            {MIN_ENTRIES} entries required — {MIN_ENTRIES} more to unlock
          </Text>
        </View>
      </View>
    );
  }

  if (data.length < MIN_ENTRIES) {
    const remaining = MIN_ENTRIES - data.length;
    return (
      <View style={styles.radarContainer}>
        <Text style={styles.radarTitle}>{title}</Text>
        <View style={styles.radarEmpty}>
          <Feather
            name="radio"
            size={28}
            color={colors.button1}
            style={{ marginBottom: 8 }}
          />
          <Text style={styles.emptyText}>4 entries required to show chart</Text>
          <Text style={[styles.radarCountdown, { color: accent }]}>
            {remaining} more needed
          </Text>
        </View>
      </View>
    );
  }

  const n         = data.length;
  const maxVal    = Math.max(...data.map((d) => d.value), 1);
  // Font size is in viewBox units; scale up so the rendered pixel size matches
  // the original (the viewBox is larger than the pixel canvas by SCALE).
  const fontSize  = (n > 5 ? 10 : 11) * SCALE;
  const lineGap   = 12 * SCALE;

  const dataPolygon = data
    .map((d, i) => {
      const r = (d.value / maxVal) * RADIUS;
      return `${px(i, r, n)},${py(i, r, n)}`;
    })
    .join(" ");

  return (
    <View style={styles.radarContainer}>
      <Text style={styles.radarTitle}>{title}</Text>

      <View style={{ alignItems: "center", marginHorizontal: -BLEED }}>
        {/* Canvas is CHART = SIZE + 2*BLEED so labels have room past the polygon.
            Negative marginHorizontal on the wrapper pulls the chart out past the
            radarContainer's 12px padding so the chart fills the card edge-to-edge. */}
        <Svg width={CHART} height={CHART} viewBox={`0 0 ${VB_W} ${VB_H}`}>

          {/* Grid levels */}
          {Array.from({ length: LEVELS }, (_, lvl) => (
            <Polygon
              key={`level-${lvl}`}
              points={levelPolygon(lvl + 1, n)}
              fill="none"
              stroke={colors.button2}
              strokeWidth={SCALE}
              opacity="0.6"
            />
          ))}

          {/* Axis lines */}
          {data.map((_, i) => (
            <Line
              key={`axis-${i}`}
              x1={CX}
              y1={CY}
              x2={px(i, RADIUS, n)}
              y2={py(i, RADIUS, n)}
              stroke={colors.button2}
              strokeWidth={SCALE}
              opacity="0.6"
            />
          ))}
            <Polygon
            points={dataPolygon}
            fill={accent}
            fillOpacity={0.2}
            stroke={accentDim}
            strokeWidth={2 * SCALE}
            />
                     {/* Data points */}
          {data.map((d, i) => {
            const r = (d.value / maxVal) * RADIUS;
            return (
              <Circle
                key={`dot-${i}`}
                cx={px(i, r, n)}
                cy={py(i, r, n)}
                r={4 * SCALE}
                fill={accentDim}
              />
            );
          })}

          {/* Labels */}
          {data.map((d, i) => {
            const lx     = px(i, LABEL_R, n);
            const ly     = py(i, LABEL_R, n);
            const anchor =
              lx < CX - 4 * SCALE ? "end" :
              lx > CX + 4 * SCALE ? "start" :
              "middle";
            // Bias each label outward from the polygon's vertical center based on
            // its vertex angle. Top-region labels drift up into the canvas-top
            // space; bottom-region labels drift down into the canvas-bottom space.
            // Bottom shift is larger so lower-diagonal labels (e.g. n=5 / n=7
            // bottom corners) get enough breathing room from the polygon.
            const verticalBias = (ly - CY) / LABEL_R;   // -1 (top vertex) … +1 (bottom vertex)
            const TOP_SHIFT    = 12 * SCALE;
            const BOTTOM_SHIFT = 20 * SCALE;
            const adjustedLy   = ly + verticalBias * (verticalBias < 0 ? TOP_SHIFT : BOTTOM_SHIFT);
            const lines = wrapLabel(d.label);

            return (
              <SvgText
                key={`label-${i}`}
                x={lx}
                y={adjustedLy}
                textAnchor={anchor}
                fontSize={fontSize}
                fontWeight="600"
                fill={accentDim}
              >
                {lines.map((line, index) => (
                  <TSpan
                    key={index}
                    x={lx}
                    dy={
                      index === 0
                        ? (lines.length === 2 ? -lineGap / 2 : 0)
                        : lineGap
                    }
                  >
                    {line}
                  </TSpan>
                ))}
              </SvgText>
            );
          })}
        </Svg>
      </View>
    </View>
  );
};

export default RadarChart;