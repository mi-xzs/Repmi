

import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { styles } from "../../screens/Analytics.Styles";
import { colors } from "../../theme/colors";
import { HeatmapEntry } from "../../types/analytics";
import { fmtSetTooltip } from "../../utils/analyticsHelpers";


const CELL   = 36;
const DATE_W = 52;


const fmtDate = (dateStr: string): string => {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
};


interface Props {
  progressionData: HeatmapEntry[];
}

interface TooltipState {
  rowI: number;
  colI: number;
}


const sortLabels = (a: string, b: string): number => {
  if (a === "W") return -1;
  if (b === "W") return 1;
  return parseInt(a) - parseInt(b);
};


const HeatmapLog: React.FC<Props> = ({ progressionData }) => {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const allLabels = useMemo(() => {
    const labelSet = new Set<string>();
    progressionData.forEach((e) => e.allSets.forEach((s) => labelSet.add(s.label)));
    return Array.from(labelSet).sort(sortLabels);
  }, [progressionData]);

// kg 
  const globalMax = useMemo(() => {
    let max = 1;
    progressionData.forEach((e) =>
      e.allSets.forEach((s) => {
        if ((s.kg ?? 0) > max) max = s.kg ?? 0;
      })
    );
    return max;
  }, [progressionData]);

  const getCell = (entry: HeatmapEntry, label: string) => {
    const set = entry.allSets.find((s) => s.label === label);
    if (!set) return { filled: false, intensity: 0, set: null };
    const kg        = set.kg ?? 0;
    const intensity = kg > 0 ? Math.max(0.15, kg / globalMax) : 0.1;
    return { filled: true, intensity, set };
  };


  const rows = useMemo(() => {
    const reversed = [...progressionData].reverse();
    const dateCount: Record<string, number> = {};
    return reversed.filter((entry) => {
      if (!dateCount[entry.date]) {
        dateCount[entry.date] = 0;
      }
      if (dateCount[entry.date] < 5) {
        dateCount[entry.date]++;
        return true;
      }
      return false;
    });
  }, [progressionData]);

  return (
    <View style={styles.heatmapContainer}>

      {/* Headers */}
      <View style={styles.heatmapHeaderRow}>
        <View style={{ width: DATE_W }} />
        {allLabels.map((label) => (
          <View key={label} style={[styles.heatmapHeaderCell, { width: CELL }]}>
            <Text
              style={[
                styles.heatmapHeaderText,
                label === "W" && { color: colors.highlight },
              ]}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* session rows */}
      {rows.map((entry, rowI) => (
        <View key={rowI} style={styles.heatmapRow}>
          <Text style={[styles.heatmapDate, { width: DATE_W }]}>
            {fmtDate(entry.date)}
          </Text>

          {allLabels.map((label, colI) => {
            const { filled, intensity, set } = getCell(entry, label);
            const isActive =
              tooltip?.rowI === rowI && tooltip?.colI === colI;

            return (
              <Pressable
                key={label}
                style={[
                  styles.heatmapCell,
                  {
                    width:           CELL,
                    height:          CELL,
                    backgroundColor: filled
                      ? `rgba(133, 133, 133, ${intensity})`
                      : colors.button2,
                    borderWidth:  isActive ? 1 : 0,
                    borderColor:  colors.highlight,
                  },
                ]}
                onPress={() => {
                  if (!filled) return;
                  setTooltip(isActive ? null : { rowI, colI });
                }}
              >
                {filled && (
                  <Text
                    style={[
                      styles.heatmapCellText,
                      { opacity: intensity > 0.4 ? 1 : 0.6 },
                    ]}
                  >
                    {set?.kg ? `${set.kg}` : "✓"}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}

      
      {tooltip !== null && (() => {
        const entry = rows[tooltip.rowI];
        const label = allLabels[tooltip.colI];
        const set   = entry?.allSets.find((s) => s.label === label);
        if (!set) return null;
        return (
          <View style={styles.heatmapTooltip}>
            <Text style={styles.heatmapTooltipLabel}>
              {label === "W" ? "Warm-up" : `Set ${label}`} · {fmtDate(entry.date)}
            </Text>
            <Text style={styles.heatmapTooltipValue}>
              {fmtSetTooltip(set)}
            </Text>
          </View>
        );
      })()}

      {/* intensity*/}
      <View style={styles.heatmapLegend}>
        <Text style={styles.heatmapLegendLabel}>Low</Text>
        {[0.15, 0.35, 0.55, 0.75, 1].map((op, i) => (
          <View
            key={i}
            style={[
              styles.heatmapLegendCell,
              { backgroundColor: `rgba(133,133,133,${op})` },
            ]}
          />
        ))}
        <Text style={styles.heatmapLegendLabel}>High</Text>
      </View>

    </View>
  );
};

export default HeatmapLog;
