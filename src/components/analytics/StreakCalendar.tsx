// src/components/analytics/StreakCalendar.tsx

import React, { useMemo, useState } from "react";
import { Dimensions, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { styles } from "../../screens/Analytics.Styles";
import { colors } from "../../theme/colors";
import { useAccent } from "../../services/SettingsContext";
import { getContentWidth } from "../../hooks/useResponsive";
import { WorkoutSession } from "../../screens/WorkoutScreen";
import { dayKey } from "../../utils/analyticsHelpers";

// ─── constants ────────────────────────────────────────────────────────────────

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const NOW       = new Date();
const NOW_YEAR  = NOW.getFullYear();
const NOW_MONTH = NOW.getMonth();
const TODAY_KEY = dayKey(NOW);

// ─── types ────────────────────────────────────────────────────────────────────

interface Props {
  sessions: WorkoutSession[];
}

interface CalendarDay {
  key:       string;
  date:      Date;
  isToday:   boolean;
  isFuture:  boolean;
  isOutside: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const buildMonthGrid = (year: number, month: number): CalendarDay[] => {
  const now          = new Date();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth  = new Date(year, month + 1, 0);
  const startPad     = firstOfMonth.getDay();
  const endPad       = 6 - lastOfMonth.getDay();
  const gridStart    = new Date(year, month, 1 - startPad);
  const totalDays    = startPad + lastOfMonth.getDate() + endPad;

  return Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    d.setHours(0, 0, 0, 0);
    const key = dayKey(d);
    return {
      key,
      date:      d,
      isToday:   key === TODAY_KEY,
      isFuture:  d > now,
      isOutside: d.getMonth() !== month,
    };
  });
};

// ─── component ────────────────────────────────────────────────────────────────

const StreakCalendar: React.FC<Props> = ({ sessions }) => {
  const { accent } = useAccent();
  // Cap to the content column on wide web so the calendar grid doesn't
  // bleed past the centered column.
  const screenW  = getContentWidth(Dimensions.get("window").width);
  const cellSize = Math.floor((screenW - 48 - 28 - 6 * 6) / 7);

  const [monthOffset, setMonthOffset] = useState(0);

  const { viewYear, viewMonth } = useMemo(() => {
    const d = new Date(NOW_YEAR, NOW_MONTH + monthOffset, 1);
    return { viewYear: d.getFullYear(), viewMonth: d.getMonth() };
  }, [monthOffset]);

  const trainedDays = useMemo(
    () => new Set(sessions.map((s) => dayKey(new Date(s.date)))),
    [sessions]
  );

  const grid = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const weeks = useMemo(() => {
    const rows: CalendarDay[][] = [];
    for (let i = 0; i < grid.length; i += 7) rows.push(grid.slice(i, i + 7));
    return rows;
  }, [grid]);

  const streak = useMemo(() => {
    let count = 0;
    const check = new Date();
    check.setHours(0, 0, 0, 0);
    while (trainedDays.has(dayKey(check))) {
      count++;
      check.setDate(check.getDate() - 1);
    }
    return count;
  }, [trainedDays]);

  const canGoBack    = monthOffset > -24;
  const canGoForward = monthOffset < 0;

  return (
    <View style={styles.calendarContainer}>

      {/* Month / year navigation */}
      <View style={{
        flexDirection:  "row",
        alignItems:     "center",
        justifyContent: "space-between",
        marginBottom:   4,
      }}>
        <TouchableOpacity
          onPress={() => setMonthOffset((o) => o - 1)}
          activeOpacity={0.5}
          style={{ padding: 8, opacity: canGoBack ? 1 : 0.2 }}
        >
          <Feather name="chevron-left" size={18} color={colors.highlight} />
        </TouchableOpacity>

        <Text style={{ color: colors.titleText, fontWeight: "700", fontSize: 14 }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>

        <TouchableOpacity
          onPress={() => canGoForward && setMonthOffset((o) => o + 1)}
          activeOpacity={0.5}
          style={{ padding: 8, opacity: canGoForward ? 1 : 0.2 }}
        >
          <Feather name="chevron-right" size={18} color={colors.highlight} />
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={styles.calendarRow}>
        {DAY_LABELS.map((l, i) => (
          <View key={`day-header-${i}`} style={[styles.calendarCell, { width: cellSize, height: 16 }]}>
            <Text style={styles.calendarDayLabel}>{l}</Text>
          </View>
        ))}
      </View>

      {/* Week rows */}
      {weeks.map((week, weekIdx) => (
        <View key={weekIdx} style={styles.calendarRow}>
          {week.map((day) => {
            const trained = trainedDays.has(day.key);

            // Outside padding cells (before first / after last of month) stay invisible
            if (day.isOutside) {
              return (
                <View
                  key={day.key}
                  style={[styles.calendarCell, { width: cellSize, height: cellSize }]}
                />
              );
            }

            // Streak day = trained AND adjacent to another trained day (yesterday or tomorrow)
            const prevKey  = dayKey(new Date(day.date.getTime() - 86400000));
            const nextKey  = dayKey(new Date(day.date.getTime() + 86400000));
            const inStreak = trained && (trainedDays.has(prevKey) || trainedDays.has(nextKey));

            return (
              <View
                key={day.key}
                style={[
                  styles.calendarCell,
                  {
                    width:           cellSize,
                    height:          cellSize,
                    borderRadius:    cellSize / 4,
                    // Trained days: bright if part of a streak, dim otherwise
                    backgroundColor: trained
                      ? (inStreak ? accent : accent + '50')
                      : colors.button3,
                    // Today gets a subtle border instead of a filled color change
                    borderWidth:     day.isToday && !trained ? 1 : 0,
                    borderColor:     colors.titleText,
                    // Future days are dimmed but still visible
                    opacity:         day.isFuture ? 0.3 : 1,
                  },
                ]}
              />
            );
          })}
        </View>
      ))}

      {/* Streak footer */}
      <View style={styles.streakRow}>
        <Feather name="zap" size={13} color={colors.highlight} />
        <Text style={styles.streakText}>
          {streak > 0 ? `${streak}-day streak` : "No active streak"}
        </Text>
        <Text style={styles.streakSub}>· {sessions.length} total sessions</Text>
      </View>

    </View>
  );
};

export default StreakCalendar;