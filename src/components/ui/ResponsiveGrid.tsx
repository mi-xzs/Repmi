// src/components/ui/ResponsiveGrid.tsx
//
// Masonry-style grid for wide web: measures the available width, picks the
// column count nearest `itemWidth`, then distributes children down that many
// equal-width columns. Each column packs its items tightly top-to-bottom, so
// there are no row-height gaps and the columns fill the width edge-to-edge —
// no dead space. Items are dealt out round-robin, which preserves the original
// left-to-right / top-to-bottom reading order.
//
// On mobile/native it's a transparent passthrough (the normal vertical stack),
// so the phone UI is untouched.
//
//   <ResponsiveGrid itemWidth={400}>
//     <View>{/* card */}</View>
//     <View>{/* chart card — measures its own column to fit */}</View>
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
  /** target column width (px); column count is chosen to keep columns near this */
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
  const cols = width > 0 ? Math.max(1, Math.round(width / itemWidth)) : 1;

  // Deal children round-robin into columns (preserves reading order).
  const items = React.Children.toArray(children).filter(React.isValidElement);
  const columns: React.ReactNode[][] = Array.from({ length: cols }, () => []);
  items.forEach((child, i) => columns[i % cols].push(child));

  return (
    <View
      style={[{ flexDirection: "row", alignItems: "flex-start", gap }, style]}
      onLayout={onLayout}
    >
      {columns.map((col, ci) => (
        <View key={ci} style={{ flex: 1, gap }}>
          {col}
        </View>
      ))}
    </View>
  );
}
