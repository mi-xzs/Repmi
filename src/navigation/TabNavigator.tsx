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
