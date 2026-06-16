import React from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import { colors } from "../theme/colors";
import { useAccent } from "../services/SettingsContext";
import { SIDE_RAIL_WIDTH } from "../hooks/useResponsive";
import { TAB_CONFIG, SUB_TABS, type FeatherIconName } from "./tabRoutes";
import type { RootTabParamList } from "./types";

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

function SideSubItem({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const { accent, accentSubtle } = useAccent();
  return (
    <Pressable
      onPress={onPress}
      style={[railStyles.subItem, isActive && { backgroundColor: accentSubtle }]}
    >
      <Text
        style={[railStyles.subLabel, { color: isActive ? accent : colors.button1 }]}
        numberOfLines={1}
      >
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
        <Image
          source={require("../assets/icon.png")}
          style={railStyles.brandIcon}
          resizeMode="contain"
        />
        <Text style={railStyles.brandText}>Repmi</Text>
      </View>
      <View style={railStyles.items}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const subTabs = SUB_TABS[route.name as keyof RootTabParamList];
          const activeSub =
            (route.params as { tab?: number } | undefined)?.tab ?? 0;
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (event.defaultPrevented) return;
            if (subTabs) {
              navigation.navigate(route.name, { tab: 0 });
            } else if (!isFocused) {
              navigation.navigate(route.name);
            }
          };
          return (
            <View key={route.key}>
              <SideRailItem
                routeName={route.name}
                isFocused={isFocused}
                onPress={onPress}
              />
              {isFocused && subTabs && (
                <View style={railStyles.subItems}>
                  {subTabs.map((label, i) => (
                    <SideSubItem
                      key={label}
                      label={label}
                      isActive={activeSub === i}
                      onPress={() => navigation.navigate(route.name, { tab: i })}
                    />
                  ))}
                </View>
              )}
            </View>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
  },
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  brandText: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: colors.titleText,
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
  subItems: {
    marginTop: 2,
    marginBottom: 4,
    marginLeft: 18,
    paddingLeft: 14,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: "rgba(255, 255, 255, 0.10)",
    gap: 2,
  },
  subItem: {
    paddingHorizontal: 12,
    height: 38,
    justifyContent: "center",
    borderRadius: 10,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
});
