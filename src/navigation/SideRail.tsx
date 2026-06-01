// src/navigation/SideRail.tsx
//
// The desktop side rail — a vertical left nav used by the web shell on
// wide viewports (`tabBarPosition: 'left'` lays the navigator out as a
// row: rail | scene). Imported only by TabNavigator.web.tsx, so it never
// ships in the native bundle.

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import { colors } from "../theme/colors";
import { useAccent } from "../services/SettingsContext";
import { SIDE_RAIL_WIDTH } from "../hooks/useResponsive";
import { TAB_CONFIG, type FeatherIconName } from "./tabRoutes";

function SideRailItem({
  routeName,
  isFocused,
  onPress,
}: {
  routeName: string;
  isFocused: boolean;
  onPress: () => void;
}) {
  const { icon, label } = TAB_CONFIG[routeName] ?? {
    icon: "circle" as FeatherIconName,
    label: routeName,
  };
  const { accent, accentSubtle } = useAccent();
  const color = isFocused ? accent : colors.button1;

  return (
    <Pressable
      onPress={onPress}
      style={[railStyles.item, isFocused && { backgroundColor: accentSubtle }]}
    >
      <Feather name={icon} size={22} color={color} />
      <Text style={[railStyles.itemLabel, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function SideRail({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const focusedDescriptor = descriptors[state.routes[state.index].key];
  const tabBarStyle = focusedDescriptor?.options?.tabBarStyle;
  const flatStyle = StyleSheet.flatten(tabBarStyle) as { display?: string } | undefined;
  if (flatStyle?.display === "none") return null;

  return (
    <View style={railStyles.rail}>
      <View style={railStyles.brand}>
        <Text style={railStyles.brandText}>Repmi</Text>
      </View>
      <View style={railStyles.items}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };
          return (
            <SideRailItem
              key={route.key}
              routeName={route.name}
              isFocused={isFocused}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
}

const railStyles = StyleSheet.create({
  rail: {
    width: SIDE_RAIL_WIDTH,
    height: "100%",
    backgroundColor: colors.container,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 12,
    paddingTop: 28,
    gap: 24,
  },
  brand: {
    paddingHorizontal: 12,
  },
  brandText: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: colors.highlight,
  },
  items: {
    gap: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 12,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
