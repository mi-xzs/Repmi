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
  const { isDesktop } = useResponsive();

  return (
    <Tab.Navigator
      tabBar={(props) =>
        isDesktop ? <SideRail {...props} /> : <BottomTabBar {...props} />
      }
      screenOptions={{
        headerShown: false,
        tabBarPosition: isDesktop ? "left" : "bottom",
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
