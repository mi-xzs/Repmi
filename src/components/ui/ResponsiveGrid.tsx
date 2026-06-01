// src/components/ui/ResponsiveGrid.tsx
//
// Lays its children out as a uniform wrapping grid on wide web: it measures
// the available width, picks the number of columns closest to `itemWidth`,
// then sizes every cell to evenly divide the full width — so the grid fills
// the screen edge-to-edge (no dead gutter) while keeping every component the
// same, roughly-`itemWidth` size. On mobile/native it's a transparent
// passthrough (the normal vertical stack), so the phone UI is untouched.
//
//   <ResponsiveGrid itemWidth={400}>
//     <View>{/* card */}</View>
//     <View>{/* chart card — measures its own cell to fit */}</View>
//   </ResponsiveGrid>

import React, { useState } from "react";
import { View, StyleProp, ViewStyle, LayoutChangeEvent } from "react-native";
import { useResponsive } from "../../hooks/useResponsive";

// Marker wrapper kept for call-site compatibility; renders children directly.
export function GridItem({ children }: { children: React.ReactNode; span?: "full" }) {
  return <>{children}</>;
}

interface Props {
  children: React.ReactNode;
  /** target cell width (px); columns are chosen to keep cells near this and fill the row */
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
  const [width, setWidth] = useState(0);

  // Mobile/native: natural vertical stack, no grid.
  if (!isWide) return <>{children}</>;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  // Columns nearest the target width (so cells stay close to `itemWidth`),
  // then divide the full width evenly across them → fills edge-to-edge.
  const cols = width > 0 ? Math.max(1, Math.round(width / itemWidth)) : 1;
  const colWidth = width > 0 ? (width - gap * (cols - 1)) / cols : itemWidth;

  return (
    <View style={[{ flexDirection: "row", flexWrap: "wrap", gap }, style]} onLayout={onLayout}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return null;
        return <View style={{ width: colWidth }}>{child}</View>;
      })}
    </View>
  );
}
