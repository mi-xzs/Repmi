import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { useResponsive } from "../../hooks/useResponsive";

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  fill?: boolean;
}

export default function ResponsiveContent({ children, style, fill }: Props) {
  const { contentMaxWidth } = useResponsive();
  return (
    <View
      style={[
        fill ? styles.fill : styles.base,
        contentMaxWidth ? { maxWidth: contentMaxWidth, alignSelf: "center" } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { width: "100%" },
  fill: { width: "100%", flex: 1 },
});
