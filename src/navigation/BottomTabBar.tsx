import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  LayoutChangeEvent,
  Platform,
  Animated,
} from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../theme/colors";
import { useAccent } from "../services/SettingsContext";
import { TAB_CONFIG, type FeatherIconName } from "./tabRoutes";

const BAR_HEIGHT = 50;
const PILL_HEIGHT = 42;

function TabItem({
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
  const { accent } = useAccent();
  const focus = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(focus, {
      toValue: isFocused ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [isFocused, focus]);

  const iconScale = focus.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const labelTranslate = focus.interpolate({
    inputRange: [0, 1],
    outputRange: [-4, 0],
  });
  const labelHeight = focus.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 12],
  });

  return (
    <Pressable
      onPress={onPress}
      android_ripple={null}
      style={styles.tabBtn}
      hitSlop={8}
    >
      <Animated.View style={{ transform: [{ scale: iconScale }] }}>
        <Feather
          name={icon}
          size={22}
          color={isFocused ? accent : colors.button1}
        />
      </Animated.View>
      <Animated.Text
        numberOfLines={1}
        style={[
          styles.label,
          {
            color: accent,
            opacity: focus,
            height: labelHeight,
            transform: [{ translateY: labelTranslate }],
          },
        ]}
      >
        {label}
      </Animated.Text>
    </Pressable>
  );
}

export default function BottomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { accentSubtle } = useAccent();
  const [barWidth, setBarWidth] = useState(0);
  const focusedDescriptor = descriptors[state.routes[state.index].key];
  const tabBarStyle = focusedDescriptor?.options?.tabBarStyle;
  const flatStyle = StyleSheet.flatten(tabBarStyle) as { display?: string } | undefined;
  const hidden = flatStyle?.display === "none";
  const tabCount = state.routes.length;
  const tabWidth = barWidth > 0 ? barWidth / tabCount : 0;
  const pillWidth = Math.max(tabWidth - 16, 0);

  const indicatorX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (tabWidth === 0) return;
    Animated.spring(indicatorX, {
      toValue: state.index * tabWidth + 8,
      damping: 18,
      stiffness: 220,
      mass: 0.6,
      useNativeDriver: false,
    }).start();
  }, [state.index, tabWidth, indicatorX]);

  if (hidden) return null;

  const onLayout = (e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  };

  return (
    <View
      style={[styles.wrap, { paddingBottom: insets.bottom }]}
      onLayout={onLayout}
    >
      <View style={styles.topBorder} pointerEvents="none" />

      <View style={styles.row}>
        {tabWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicator,
              { width: pillWidth, backgroundColor: accentSubtle, transform: [{ translateX: indicatorX }] },
            ]}
          />
        )}
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              if (Platform.OS !== "web") {
                Haptics.selectionAsync().catch(() => {});
              }
              navigation.navigate(route.name);
            }
          };

          return (
            <TabItem
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

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.container,
    overflow: "hidden",
  },
  topBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  row: {
    flexDirection: "row",
    height: BAR_HEIGHT,
    alignItems: "center",
    paddingTop: 4,
  },
  indicator: {
    position: "absolute",
    top: (BAR_HEIGHT - PILL_HEIGHT) / 2,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    backgroundColor: colors.accentSubtle,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: BAR_HEIGHT,
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
