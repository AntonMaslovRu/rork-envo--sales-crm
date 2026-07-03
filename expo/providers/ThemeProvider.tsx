import createContextHook from "@nkzw/create-context-hook";
import React, { useMemo } from "react";
import { ColorSchemeName, useColorScheme } from "react-native";

export interface AppColors {
  background: string;
  surface: string;
  surfaceGlass: string;
  surfaceLight: string;
  surfaceAccent: string;
  border: string;
  borderGlass: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentDim: string;
  accentBg: string;
  danger: string;
  dangerBg: string;
  warning: string;
  warningBg: string;
  blue: string;
  blueBg: string;
  purple: string;
  purpleBg: string;
  tabBar: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
  headerTint: string;
  glassTint: string;
  glassShadow: string;
  cardHighlight: string;
}

const lightColors: AppColors = {
  background: "#F2F2F7",
  surface: "rgba(255, 255, 255, 0.72)",
  surfaceGlass: "rgba(255, 255, 255, 0.55)",
  surfaceLight: "rgba(255, 255, 255, 0.85)",
  surfaceAccent: "rgba(120, 120, 128, 0.08)",
  border: "rgba(60, 60, 67, 0.12)",
  borderGlass: "rgba(255, 255, 255, 0.45)",
  text: "#1C1C1E",
  textSecondary: "#636366",
  textMuted: "#AEAEB2",
  accent: "#007AFF",
  accentDim: "#5AC8FA",
  accentBg: "rgba(0, 122, 255, 0.1)",
  danger: "#FF3B30",
  dangerBg: "rgba(255, 59, 48, 0.1)",
  warning: "#FF9500",
  warningBg: "rgba(255, 149, 0, 0.1)",
  blue: "#007AFF",
  blueBg: "rgba(0, 122, 255, 0.1)",
  purple: "#AF52DE",
  purpleBg: "rgba(175, 82, 222, 0.1)",
  tabBar: "rgba(249, 249, 249, 0.78)",
  tabBarBorder: "rgba(60, 60, 67, 0.1)",
  tabBarActive: "#007AFF",
  tabBarInactive: "#8E8E93",
  headerTint: "#1C1C1E",
  glassTint: "rgba(255, 255, 255, 0.6)",
  glassShadow: "rgba(0, 0, 0, 0.08)",
  cardHighlight: "rgba(255, 255, 255, 0.9)",
};

const darkColors: AppColors = {
  background: "#000000",
  surface: "rgba(44, 44, 46, 0.65)",
  surfaceGlass: "rgba(44, 44, 46, 0.45)",
  surfaceLight: "rgba(58, 58, 60, 0.6)",
  surfaceAccent: "rgba(120, 120, 128, 0.16)",
  border: "rgba(84, 84, 88, 0.4)",
  borderGlass: "rgba(255, 255, 255, 0.08)",
  text: "#F5F5F7",
  textSecondary: "#98989D",
  textMuted: "#636366",
  accent: "#0A84FF",
  accentDim: "#64D2FF",
  accentBg: "rgba(10, 132, 255, 0.15)",
  danger: "#FF453A",
  dangerBg: "rgba(255, 69, 58, 0.15)",
  warning: "#FFD60A",
  warningBg: "rgba(255, 214, 10, 0.12)",
  blue: "#0A84FF",
  blueBg: "rgba(10, 132, 255, 0.15)",
  purple: "#BF5AF2",
  purpleBg: "rgba(191, 90, 242, 0.15)",
  tabBar: "rgba(30, 30, 30, 0.78)",
  tabBarBorder: "rgba(84, 84, 88, 0.3)",
  tabBarActive: "#0A84FF",
  tabBarInactive: "#636366",
  headerTint: "#F5F5F7",
  glassTint: "rgba(44, 44, 46, 0.5)",
  glassShadow: "rgba(0, 0, 0, 0.3)",
  cardHighlight: "rgba(58, 58, 60, 0.8)",
};

function resolveTheme(scheme: ColorSchemeName): "light" | "dark" {
  return scheme === "light" ? "light" : "dark";
}

export const [ThemeContextProvider, useTheme] = createContextHook(() => {
  const colorScheme = useColorScheme();
  const theme = resolveTheme(colorScheme);
  const colors = theme === "light" ? lightColors : darkColors;

  return useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      colors,
    }),
    [theme, colors]
  );
});

export function useThemedStyles<T>(factory: (colors: AppColors) => T): T {
  const { colors } = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
