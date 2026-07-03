import React, { useMemo } from "react";
import { View, StyleSheet, ViewStyle, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/providers/ThemeProvider";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: "low" | "medium" | "high";
  interactive?: boolean;
}

export default React.memo(function GlassCard({
  children,
  style,
  intensity = "medium",
}: GlassCardProps) {
  const { isDark, colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const blurIntensity = intensity === "low" ? 25 : intensity === "medium" ? 40 : 60;
  const tint = isDark ? "dark" as const : "light" as const;

  if (Platform.OS === "web") {
    return (
      <View style={[styles.cardFallback, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.outerShadow, style]}>
      <BlurView
        intensity={blurIntensity}
        tint={tint}
        style={styles.blur}
      >
        <View style={styles.innerOverlay}>
          {children}
        </View>
      </BlurView>
    </View>
  );
});

function createStyles(colors: ReturnType<typeof useTheme>["colors"], isDark: boolean) {
  return StyleSheet.create({
    outerShadow: {
      borderRadius: 20,
      overflow: "hidden",
      shadowColor: colors.glassShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 4,
    },
    blur: {
      borderRadius: 20,
      overflow: "hidden",
    },
    innerOverlay: {
      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.35)",
      borderWidth: 1,
      borderColor: colors.borderGlass,
      borderRadius: 20,
    },
    cardFallback: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.glassShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 3,
    },
  });
}
