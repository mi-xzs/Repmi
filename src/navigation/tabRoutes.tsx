// src/navigation/tabRoutes.tsx
//
// Single source of truth for the main tab navigation — shared by the
// native shell (TabNavigator.tsx, bottom tabs) and the web shell
// (TabNavigator.web.tsx, desktop side rail / responsive). Add or reorder
// tabs HERE and both platforms pick it up. Only the *presentation* of the
// nav (bottom bar vs. side rail) differs per platform; the route list,
// icons, and labels live here.

import React from "react";
import {
  getFocusedRouteNameFromRoute,
  type RouteProp,
} from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import HomeStackNavigator from "./HomeStackNavigator";
import AnalyticsScreen from "../screens/AnalyticsScreen";
import AchievementsScreen from "../screens/AchievementsScreen";
import ProfileStackNavigator from "./ProfileStackNavigator";
import type { RootTabParamList } from "./types";

export type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

export const TAB_CONFIG: Record<string, { icon: FeatherIconName; label: string }> = {
  Home: { icon: "home", label: "Home" },
  Analytics: { icon: "bar-chart-2", label: "Analytics" },
  Achievements: { icon: "award", label: "Awards" },
  Profile: { icon: "user", label: "Profile" },
};

export interface TabRoute {
  name: keyof RootTabParamList;
  component: React.ComponentType<object>;
}

export const TAB_ROUTES: TabRoute[] = [
  { name: "Home", component: HomeStackNavigator },
  { name: "Analytics", component: AnalyticsScreen },
  { name: "Achievements", component: AchievementsScreen },
  { name: "Profile", component: ProfileStackNavigator },
];

// Hide the tab bar / rail on the full-screen CreateWorkout flow so the
// workout builder gets the whole viewport on every platform.
export function getTabBarStyle(route: RouteProp<RootTabParamList, "Home">) {
  const routeName = getFocusedRouteNameFromRoute(route) ?? "Home";
  if (routeName === "CreateWorkout") return { display: "none" as const };
  return { display: "flex" as const };
}
