import React from "react";
import { Dimensions, Platform, Text, View } from "react-native";
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

const SCREEN_W = getContentWidth(Dimensions.get("window").width);
const SIZE     = Math.min(SCREEN_W - 80, 360);
const BLEED    = 28;
const CHART    = SIZE + BLEED * 2;
const PAD_X    = 64;
const PAD_Y    = 64;                     
const VB_W     = CHART + PAD_X * 2;
const VB_H     = CHART + PAD_Y * 2;
const SCALE    = VB_W / CHART;        
const CX       = VB_W / 2;
const CY       = VB_H / 2;
const RADIUS   = 100 * SCALE;            
const LABEL_R  = RADIUS + 8 * SCALE;     
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


const wrapLabel = (text: string): string[] => {
  const upper = text.toUpperCase();
  const words = upper.split(" ").filter(Boolean);
  if (words.length === 1 && upper.length <= 11) return [upper];
  if (words.length === 1) {
    const mid = Math.ceil(upper.length / 2);
    return [upper.slice(0, mid) + "-", upper.slice(mid)];
  }
 
  
  const total = upper.length;
  let bestSplit = 1;
  let bestDelta = Infinity;
  let running = 0;
  for (let i = 0; i < words.length - 1; i++) {
    running += words[i].length + 1;
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
      <View style={[styles.radarContainer, Platform.OS === "web" && { backgroundColor: "transparent", padding: 0, flex: 1, width: "100%", justifyContent: "center" }]}>
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
      <View style={[styles.radarContainer, Platform.OS === "web" && { backgroundColor: "transparent", padding: 0, flex: 1, width: "100%", justifyContent: "center" }]}>
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
  const fontSize  = (n > 5 ? 10 : 11) * SCALE;
  const lineGap   = 12 * SCALE;

  const dataPolygon = data
    .map((d, i) => {
      const r = (d.value / maxVal) * RADIUS;
      return `${px(i, r, n)},${py(i, r, n)}`;
    })
    .join(" ");

  return (
    <View style={[styles.radarContainer, Platform.OS === "web" && { backgroundColor: "transparent", padding: 0, flex: 1, width: "100%", justifyContent: "center" }]}>
      <Text style={styles.radarTitle}>{title}</Text>

      <View style={{ alignItems: "center", marginHorizontal: -BLEED }}>
        <Svg width={CHART} height={CHART} viewBox={`0 0 ${VB_W} ${VB_H}`}>

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
                     {/* data points */}
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

          {/* labels */}
          {data.map((d, i) => {
            const lx     = px(i, LABEL_R, n);
            const ly     = py(i, LABEL_R, n);
            const anchor =
              lx < CX - 4 * SCALE ? "end" :
              lx > CX + 4 * SCALE ? "start" :
              "middle";
            const verticalBias = (ly - CY) / LABEL_R;   
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
