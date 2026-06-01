// src/components/ui/ResponsiveGrid.tsx
//
// Lays its children out as a wrapping grid of UNIFORM, fixed-width cells on
// wide web — every component keeps the same (roughly phone-sized) width and
// just flows into as many columns as fit, filling the screen. On mobile/native
// it's a transparent passthrough (the normal vertical stack), so the phone UI
// is untouched.
//
//   <ResponsiveGrid itemWidth={400}>
//     <View>{/* card */}</View>
//     <View>{/* chart card */}</View>
//   </ResponsiveGrid>
//
// Children that need to size themselves (e.g. charts) should measure their own
// container width rather than the window, so they fit the cell.

import React from "react";
import { View, StyleProp, ViewStyle } from "react-native";
import { useResponsive } from "../../hooks/useResponsive";

// Marker wrapper kept for call-site compatibility; renders children directly.
export function GridItem({ children }: { children: React.ReactNode; span?: "full" }) {
  return <>{children}</>;
}

interface Props {
  children: React.ReactNode;
  /** fixed width of every cell (px) — components keep this size and flow */
  itemWidth?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

export default function ResponsiveGrid({
  children,
  itemWidth = 400,
  gap = 14,
  style,
}: Props) {
  const { isWide } = useResponsive();

  // Mobile/native: natural vertical stack, no grid.
  if (!isWide) return <>{children}</>;

  return (
    <View style={[{ flexDirection: "row", flexWrap: "wrap", gap }, style]}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return null;
        return <View style={{ width: itemWidth }}>{child}</View>;
      })}
    </View>
  );
}
