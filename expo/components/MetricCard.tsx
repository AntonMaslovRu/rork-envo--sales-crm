import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet, Animated, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/providers/ThemeProvider";

interface MetricCardProps {
  label: string;
  value: string;
  change?: string;
  changePositive?: boolean;
  icon: React.ReactNode;
  accentColor?: string;
  accentBg?: string;
}

function GlassBackground({ isDark }: { isDark: boolean }) {
  if (Platform.OS === "web") return null;
  return (
    <BlurView
      intensity={35}
      tint={isDark ? "dark" : "light"}
      style={StyleSheet.absoluteFill}
    />
  );
}

export default React.memo(function MetricCard({
  label,
  value,
  change,
  changePositive,
  icon,
  accentColor,
  accentBg,
}: MetricCardProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const resolvedAccentColor = accentColor ?? colors.accent;
  const resolvedAccentBg = accentBg ?? colors.accentBg;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.card,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <GlassBackground isDark={isDark} />
      <View style={styles.cardContent}>
        <View style={[styles.iconWrap, { backgroundColor: resolvedAccentBg }]}>
          {icon}
        </View>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
        {change ? (
          <View
            style={[
              styles.changeBadge,
              {
                backgroundColor: changePositive ? colors.accentBg : colors.dangerBg,
              },
            ]}
          >
            <Text
              style={[
                styles.changeText,
                { color: changePositive ? resolvedAccentColor : colors.danger },
              ]}
            >
              {change}
            </Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
});

function createStyles(colors: ReturnType<typeof useTheme>["colors"], isDark: boolean) {
  return StyleSheet.create({
    card: {
      flex: 1,
      minWidth: 140,
      borderRadius: 20,
      overflow: "hidden",
      backgroundColor: Platform.OS === "web" ? colors.surface : "transparent",
      borderWidth: 1,
      borderColor: colors.borderGlass,
      shadowColor: colors.glassShadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 4,
    },
    cardContent: {
      padding: 16,
      backgroundColor: Platform.OS === "web" ? "transparent" : (isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.3)"),
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    label: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: "600" as const,
      marginBottom: 4,
      textTransform: "uppercase" as const,
      letterSpacing: 0.8,
    },
    value: {
      fontSize: 22,
      fontWeight: "800" as const,
      color: colors.text,
      marginBottom: 8,
    },
    changeBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    changeText: {
      fontSize: 11,
      fontWeight: "700" as const,
    },
  });
}
