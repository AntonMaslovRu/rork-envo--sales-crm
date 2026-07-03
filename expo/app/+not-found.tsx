import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/providers/ThemeProvider";

export default function NotFoundScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.code}>404</Text>
      <Text style={styles.message}>Page not found</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace("/")}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Go to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    code: {
      fontSize: 48,
      fontWeight: "800",
      color: colors.textMuted,
      marginBottom: 8,
    },
    message: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 24,
    },
    button: {
      backgroundColor: colors.accent,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    buttonText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.background,
    },
  });
}
