// src/navigation/TabNavigator.web.tsx
//
// Web tab shell (Metro selects this over TabNavigator.tsx for web builds).
// Responsive:
//   - desktop (wide):  vertical SideRail on the left, scene fills the rest
//     (`tabBarPosition: 'left'`).
//   - narrow web:      falls back to the mobile BottomTabBar at the bottom,
//     so a phone-width browser still gets the mobile layout.
//
// Route list + icons are shared with the native shell via ./tabRoutes.

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import BottomTabBar from "./BottomTabBar";
import SideRail from "./SideRail";
import { useResponsive } from "../hooks/useResponsive";
import { TAB_ROUTES, getTabBarStyle } from "./tabRoutes";
import type { RootTabParamList } from "./types";

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function TabNavigator() {
  // Show the side rail on any reasonably wide web viewport (tablet+, >=768px),
  // not just full desktop — a half-screen browser window or laptop should
  // still get the side nav. Only true phone-width web falls back to the
  // bottom tab bar.
  const { isWide } = useResponsive();

  return (
    <Tab.Navigator
      tabBar={(props) =>
        isWide ? <SideRail {...props} /> : <BottomTabBar {...props} />
      }
      screenOptions={{
        headerShown: false,
        tabBarPosition: isWide ? "left" : "bottom",
      }}
    >
      {TAB_ROUTES.map((r) =>
        r.name === "Home" ? (
          <Tab.Screen
            key={r.name}
            name="Home"
            component={r.component}
            options={({ route }) => ({ tabBarStyle: getTabBarStyle(route) })}
          />
        ) : (
          <Tab.Screen key={r.name} name={r.name} component={r.component} />
        ),
      )}
    </Tab.Navigator>
  );
}
