import React, { useState } from "react";
import { View, StyleSheet, StyleProp, ViewStyle, LayoutChangeEvent } from "react-native";
import { useResponsive } from "../../hooks/useResponsive";

export function GridItem({ children }: { children: React.ReactNode; span?: "full" }) {
  return <>{children}</>;
}

interface Props {
  children: React.ReactNode;
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
