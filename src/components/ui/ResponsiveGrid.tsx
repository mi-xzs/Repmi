// src/components/ui/ResponsiveGrid.tsx
//
// Lays its children out as a wrapping grid on wide web (dashboard layout),
// and as a plain vertical stack on mobile/native (the phone UI is untouched).
//
// Column count is derived from the measured container width and `minColWidth`,
// so it adapts to the viewport (2 columns on a laptop, 3 on a big monitor).
// A child can opt out of the grid and span the full row by wrapping it in
// <GridItem span="full"> — used for charts that need the width to stay legible.
// Plain children (no GridItem, or <GridItem>) take a single column.
//
//   <ResponsiveGrid minColWidth={380}>
//     <View>{/* compact card → 1 column */}</View>
//     <GridItem span="full"><MyChart /></GridItem>
//   </ResponsiveGrid>

import React, { useState } from "react";
import { View, StyleProp, ViewStyle, LayoutChangeEvent } from "react-native";
import { useResponsive } from "../../hooks/useResponsive";

interface GridItemProps {
  children: React.ReactNode;
  /** take the full row instead of a single column */
  span?: "full";
}

// Marker wrapper read by ResponsiveGrid. Renders its children directly.
export function GridItem({ children }: GridItemProps) {
  return <>{children}</>;
}

interface Props {
  children: React.ReactNode;
  /** target minimum width per column (px) before adding another column */
  minColWidth?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

export default function ResponsiveGrid({
  children,
  minColWidth = 380,
  gap = 12,
  style,
}: Props) {
  const { isWide } = useResponsive();
  const [width, setWidth] = useState(0);

  // Mobile/native: natural vertical stack, no grid.
  if (!isWide) return <>{children}</>;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const cols = width > 0 ? Math.max(1, Math.floor((width + gap) / (minColWidth + gap))) : 1;
  const colWidth = cols > 0 ? (width - gap * (cols - 1)) / cols : 0;

  return (
    <View style={[{ flexDirection: "row", flexWrap: "wrap", gap }, style]} onLayout={onLayout}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return null;
        // Before the container is measured, render full width to avoid a
        // zero-width flash; the next layout pass lays out the real columns.
        if (width === 0) return <View style={{ width: "100%" }}>{child}</View>;
        const full = (child.props as GridItemProps).span === "full";
        return <View style={{ width: full ? width : colWidth }}>{child}</View>;
      })}
    </View>
  );
}
