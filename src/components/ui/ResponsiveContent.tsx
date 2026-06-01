// src/components/ui/ResponsiveContent.tsx
//
// Caps content to a readable column and centers it on wide (web) screens,
// so screens don't stretch edge-to-edge next to the desktop side rail. On
// mobile/native it's a transparent passthrough (full width) — the maxWidth
// is undefined there, so this adds no visual change to the phone UI.
//
// Drop it directly inside a ScrollView (or any column container):
//   <ScrollView ...>
//     <ResponsiveContent>{...}</ResponsiveContent>
//   </ScrollView>

import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { useResponsive } from "../../hooks/useResponsive";

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** stretch to fill height (flex: 1) — for non-scrolling containers */
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
