// src/components/ui/ResponsiveGrid.tsx
//
// Even, aligned grid for wide web: measures the available width, picks the
// column count nearest `itemWidth`, sizes every cell to evenly divide the full
// width (so it fills edge-to-edge), and stretches the cells in each row to a
// common height — so it reads as a neat tiled grid rather than a ragged stack.
// Each child is stretched (flex:1) to fill its cell.
//
// On mobile/native it's a transparent passthrough (the normal vertical stack),
// so the phone UI is untouched.
//
//   <ResponsiveGrid itemWidth={400}>
//     <View>{/* card */}</View>
//     <View>{/* chart card — measures its own cell to fit */}</View>
//   </ResponsiveGrid>

import React, { useState } from "react";
import { View, StyleSheet, StyleProp, ViewStyle, LayoutChangeEvent } from "react-native";
import { useResponsive } from "../../hooks/useResponsive";

// Marker wrapper kept for call-site compatibility; renders children directly.
export function GridItem({ children }: { children: React.ReactNode; span?: "full" }) {
  return <>{children}</>;
}

interface Props {
  children: React.ReactNode;
  /** target cell width (px); column count is chosen to keep cells near this */
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
  const colWidth = width > 0 ? (width - gap * (cols - 1)) / cols : itemWidth;

  return (
    <View
      style={[
        { flexDirection: "row", flexWrap: "wrap", alignItems: "stretch", gap },
        style,
      ]}
      onLayout={onLayout}
    >
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return null;
        const el = child as React.ReactElement<{
          style?: StyleProp<ViewStyle>;
          span?: "full";
        }>;
        // <GridItem span="full"> takes the whole row (full screen width);
        // everything else is a fixed-width tile so the cards stay uniform.
        const full = el.props.span === "full";
        return (
          <View style={{ width: full ? "100%" : colWidth }}>
            {React.cloneElement(el, { style: [el.props.style, styles.fill] })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
