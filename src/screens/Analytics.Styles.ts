// src/screens/Analytics.Styles.ts

import { StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 24,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.titleText,
    letterSpacing: 0.5,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },

  // ── tabs ──────────────────────────────────────────────────────────────────────
  tabRow: {
    flexDirection: "row",
    marginTop: 12,
    backgroundColor: colors.container,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: colors.button2,
  },
  tabButtonText: {
    color: colors.titleText,
    fontSize: 13,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: colors.titleText,
  },

  // ── selector ──────────────────────────────────────────────────────────────
  selectorLabel: {
    color: colors.titleText,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  selectorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.container,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
  },
  selectorText: {
    color: colors.titleText,
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
    textTransform: "uppercase",
  },

  // ── stat cards ────────────────────────────────────────────────────────────
  cardRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.container,
    borderRadius: 14,
    padding: 14,
    minHeight: 130,
    gap: 4,
  },
  statSpacer: {
    flex: 1,
  },
  statValue: {
    color: colors.titleText,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statLabel: {
    color: colors.titleText,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  // Compact override — used for the original smaller stat-card look (Consistency row)
  statCardCompact: {
    borderRadius: 10,
    padding: 12,
    minHeight: 0,
    alignItems: "center",
    gap: 0,
  },
  statValueCompact: {
    fontSize: 15,
    marginTop: 0,
    letterSpacing: 0.4,
  },
  statLabelCompact: {
    fontSize: 10,
    letterSpacing: 0.5,
  },

  // ── section wrapper ───────────────────────────────────────────────────────
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.titleText,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 12,
    opacity: 0.7,
  },

  // ── weekly-style card ─────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.container,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    color: colors.titleText,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  // ── streak calendar ───────────────────────────────────────────────────────
  calendarContainer: {
    backgroundColor: colors.container,
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  calendarRow: {
    flexDirection: "row",
    gap: 6,
  },
  calendarCell: {
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDayLabel: {
    color: colors.titleText,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  streakText: {
    color: colors.titleText,
    fontSize: 12,
    fontWeight: "600",
  },
  streakSub: {
    color: colors.titleText,
    fontSize: 12,
  },

  // ── stat strip (Weekly "Top Muscle" style) ───────────────────────────────
  statStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.button3,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  statStripItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statStripValue: {
    color: colors.titleText,
    fontSize: 16,
    fontWeight: "700",
  },
  statStripLabel: {
    color: colors.titleText,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 2,
  },
  statStripDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.button2,
  },

  // ── weight progression ────────────────────────────────────────────────────
  exerciseSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.container,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.button2,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  exerciseSelectorLabel: {
    color: colors.titleText,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  exerciseSelectorText: {
    color: colors.titleText,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
    textTransform: "uppercase",
  },
  weightSummaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  weightSummaryCard: {
    flex: 1,
    backgroundColor: colors.container,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  weightSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.titleText,
    marginVertical: 8,
    marginHorizontal: 0,
  },
  weightDivider: {
    height: 2,
    backgroundColor: colors.container,
    marginVertical: 10,
  },
  weightLog: {
    backgroundColor: colors.container,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  weightLogRow: {
    flexDirection: "column",
    gap: 6,
    marginBottom: 2,
  },
  weightLogNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  weightLogDate: {
    color: colors.titleText,
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
    textTransform: "uppercase",
    marginRight: 8,
  },
  weightLogBarTrack: {
    height: 6,
    backgroundColor: colors.button2,
    borderRadius: 3,
    overflow: "hidden",
  },
  weightLogBarFill: {
    height: 6,
    // NOTE: non-component module — can't react to the equipped cosmetic theme.
    backgroundColor: '#00FA9A',
    borderRadius: 3,
  },
  weightLogKg: {
    color: colors.titleText,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "right",
  },
  weightLogSets: {
    color: colors.titleText,
    fontSize: 11,
    width: 24,
    textAlign: "right",
  },
  weightEmpty: {
    backgroundColor: colors.container,
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },

  // ── structure ─────────────────────────────────────────────────────────────
  structureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  structureItem: {
    flex: 1,
    alignItems: "center",
  },
  structureValue: {
    color: colors.titleText,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 2,
  },
  structureLabel: {
    color: colors.titleText,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  structureDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.button2,
  },

  // ── exercise breakdown ────────────────────────────────────────────────────
  exerciseRow: {
    flexDirection: "column",
    marginBottom: 12,
    gap: 6,
  },
  exerciseNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  exerciseName: {
    color: colors.titleText,
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
    textTransform: "uppercase",
    marginRight: 8,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.button2,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: 6,
    // NOTE: non-component module — can't react to the equipped cosmetic theme.
    backgroundColor: '#00FA9A',
    borderRadius: 3,
  },
  exerciseCount: {
    color: colors.titleText,
    fontSize: 11,
    width: 44,
    textAlign: "right",
  },

  // ── empty state ───────────────────────────────────────────────────────────
  emptyText: {
    color: colors.titleText,
    fontSize: 13,
    textAlign: "center",
  },
  emptyPane: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 14,
  },
  emptyTitle: {
    color: colors.titleText,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.8,
  },
  emptySub: {
    color: colors.titleText,
    fontSize: 12,
    textAlign: "center",
    letterSpacing: 0.4,
    opacity: 0.55,
    paddingHorizontal: 16,
    marginTop: -4,
  },

  // ── picker modal ──────────────────────────────────────────────────────────
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  blur: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },

  pickerSheet: {
    backgroundColor: colors.container,
    width: "85%",
    maxHeight: "70%",
    borderRadius: 24,
    paddingTop: 18,
    paddingBottom: 10,
    paddingHorizontal: 15,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: {
      width: 0,
      height: 15,
    },

    // subtle edge definition
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },

  pickerHandle: {
    width: 45,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    alignSelf: "center",
    marginBottom: 14,
  },

  pickerTitle: {
    color: colors.titleText,
    fontSize: 15,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.6,
    marginBottom: 14,
    opacity: 0.65,
  },

  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 12,
    marginBottom: 6,
    borderRadius: 30,
  },

  pickerRowActive: {
    backgroundColor: colors.background + "55",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.08)",
    transform: [{ scale: 1.0 }],
  },

  pickerRowText: {
    color: colors.titleText,
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    flex: 1,
    flexShrink: 1,
    flexWrap: "wrap",
    marginRight: 8,
  },

  pickerRowTextActive: {
    color: colors.titleText,
    fontWeight: "700",
    textTransform: "uppercase",
  },


  // ── radar / spider chart ─────────────────────────────────────────────────────
  radarRow: {
    flexDirection: "row",
    gap: 10,
  },
  radarContainer: {
    backgroundColor: colors.container,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  radarTitle: {
    color: colors.titleText,
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  radarEmpty: {
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  radarCountdown: {
    // NOTE: non-component module — can't react to the equipped cosmetic theme.
    color: '#00FA9A',
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },

  // ── heatmap ───────────────────────────────────────────────────────────────────
  heatmapContainer: {
    backgroundColor: colors.container,
    borderRadius: 10,
    padding: 12,
    gap: 3,
  },
  heatmapHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 2,
  },
  heatmapHeaderCell: {
    alignItems: "center",
    justifyContent: "center",
  },
  heatmapHeaderText: {
    color: colors.titleText,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  heatmapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  heatmapDate: {
    color: colors.titleText,
    fontSize: 10,
    fontWeight: "600",
  },
  heatmapCell: {
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  heatmapCellText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  heatmapTooltip: {
    marginTop: 8,
    backgroundColor: colors.button2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  heatmapTooltipLabel: {
    color: colors.titleText,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  heatmapTooltipValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  heatmapLegend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
    justifyContent: "flex-end",
  },
  heatmapLegendCell: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  heatmapLegendLabel: {
    color: colors.titleText,
    fontSize: 10,
  },

  // ── compact pill table ───────────────────────────────────────────────────────
  pillTable: {
    backgroundColor: colors.container,
    borderRadius: 10,
    overflow: "hidden",
  },
  pillTableRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  pillTableRowAlt: {
    backgroundColor: colors.button2 + "33", // subtle alternating row tint
  },
  pillTableDate: {
    color: colors.titleText,
    fontSize: 11,
    fontWeight: "600",
    width: 52,
    paddingTop: 4,
  },
  pillTableSets: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  setPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.button2,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  setPillWarm: {
    backgroundColor: colors.highlight + "22",
    borderWidth: 1,
    borderColor: colors.highlight + "55",
  },
  setPillLabel: {
    color: colors.titleText,
    fontSize: 11,
    fontWeight: "700",
  },
  setPillLabelWarm: {
    color: colors.titleText,
  },
  setPillValue: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "500",
  },
  setPillValueWarm: {
    color: colors.titleText,
  },

  // ── warm-up badge (inside weight log row) ─────────────────────────────────
  warmUpBadge: {
    backgroundColor: colors.button2,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  warmUpBadgeText: {
    color: colors.titleText,
    fontSize: 10,
    fontWeight: "600",
  },
});