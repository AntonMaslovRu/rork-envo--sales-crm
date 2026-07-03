import { Tabs } from "expo-router";
import { LayoutDashboard, Ticket, CalendarDays, Settings, Users } from "lucide-react-native";
import React from "react";
import { Platform, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/providers/ThemeProvider";

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: Platform.OS === "web"
          ? {
              backgroundColor: colors.tabBar,
              borderTopColor: colors.tabBarBorder,
              borderTopWidth: StyleSheet.hairlineWidth,
            }
          : {
              position: "absolute",
              borderTopColor: colors.tabBarBorder,
              borderTopWidth: StyleSheet.hairlineWidth,
              backgroundColor: "transparent",
              elevation: 0,
            },
        tabBarBackground: () =>
          Platform.OS !== "web" ? (
            <BlurView
              intensity={80}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600" as const,
          letterSpacing: 0.1,
        },
      }}
    >
      <Tabs.Screen
        name="(dashboard)"
        options={{
          title: "Дашборд",
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Продажи",
          tabBarIcon: ({ color, size }) => <Ticket size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pipeline"
        options={{
          title: "События",
          tabBarIcon: ({ color, size }) => <CalendarDays size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: "Клиенты",
          tabBarIcon: ({ color, size }) => <Users size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Настройки",
          tabBarIcon: ({ color, size }) => <Settings size={size - 2} color={color} />,
        }}
      />
    </Tabs>
  );
}
