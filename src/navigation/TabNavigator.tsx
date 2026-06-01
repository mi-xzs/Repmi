// src/navigation/TabNavigator.tsx
//
// Native (iOS/Android) tab shell: a bottom tab bar. The web shell lives
// in TabNavigator.web.tsx (Metro picks that for web builds) and renders a
// desktop side rail on wide viewports. Route list + icons are shared via
// ./tabRoutes so the two shells never drift.

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import BottomTabBar from "./BottomTabBar";
import { TAB_ROUTES, getTabBarStyle } from "./tabRoutes";
import type { RootTabParamList } from "./types";

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
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
