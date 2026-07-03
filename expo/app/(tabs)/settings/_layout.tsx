import { Stack } from "expo-router";
import React from "react";
import { useTheme } from "@/providers/ThemeProvider";
import NotificationBell from "@/components/NotificationBell";

export default function SettingsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.headerTint,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700" as const },
        contentStyle: { backgroundColor: colors.background },
        headerRight: () => <NotificationBell />,
      }}
    />
  );
}
