import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";

interface EnvoLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
}

export default React.memo(function EnvoLogo({ size = "md" }: EnvoLogoProps) {
  const { isDark } = useTheme();
  const logoStyle = size === "sm"
    ? styles.logoSm
    : size === "lg"
      ? styles.logoLg
      : size === "xl"
        ? styles.logoXl
        : styles.logoMd;

  return (
    <View style={styles.wrap} testID="envo-logo-wrap">
      <Image
        source={require("@/assets/images/envo-logo.png")}
        style={[logoStyle, { tintColor: isDark ? "#FFFFFF" : "#000000" }]}
        resizeMode="contain"
        testID="envo-logo"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoSm: {
    width: 74,
    height: 24,
  },
  logoMd: {
    width: 94,
    height: 30,
  },
  logoLg: {
    width: 132,
    height: 42,
  },
  logoXl: {
    width: 186,
    height: 58,
  },
});
