import React, { useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useTheme } from "@/providers/ThemeProvider";

interface PulsingDotProps {
  color?: string;
  size?: number;
}

export default React.memo(function PulsingDot({
  color,
  size = 8,
}: PulsingDotProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(), []);
  const resolvedColor = color ?? colors.accent;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.8,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.pulse,
          {
            width: size * 2.5,
            height: size * 2.5,
            borderRadius: size * 1.25,
            backgroundColor: resolvedColor,
            opacity: pulseAnim.interpolate({
              inputRange: [1, 1.8],
              outputRange: [0.3, 0],
            }),
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
      <View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: resolvedColor,
          },
        ]}
      />
    </View>
  );
});

function createStyles() {
  return StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
      width: 24,
      height: 24,
    },
    pulse: {
      position: "absolute",
    },
    dot: {},
  });
}
