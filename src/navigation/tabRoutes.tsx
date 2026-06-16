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

export const SUB_TABS: Partial<Record<keyof RootTabParamList, readonly string[]>> = {
  Analytics: ["Workout", "Weekly", "Overall"],
  Achievements: ["Achievements", "Leaderboard", "Store"],
};


export function getTabBarStyle(route: RouteProp<RootTabParamList, "Home">) {
  const routeName = getFocusedRouteNameFromRoute(route) ?? "HomeMain";
  if (routeName === "CreateWorkout") return { display: "none" as const };
  return { display: "flex" as const };
}
