import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from "react-native";
import { ScanFace, Delete, Lock, ShieldCheck } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import EnvoLogo from "@/components/EnvoLogo";

const PIN_LENGTH = 4;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"] as const;

function GlassKeyBackground({ isDark }: { isDark: boolean }) {
  if (Platform.OS === "web") return null;
  return (
    <BlurView
      intensity={40}
      tint={isDark ? "dark" : "light"}
      style={StyleSheet.absoluteFill}
    />
  );
}

export default function LockScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const {
    hasPin,
    biometricsEnabled,
    biometricsAvailable,
    setupPin,
    verifyPin,
    authenticateWithBiometrics,
  } = useAuth();

  const isSetup = !hasPin;
  const [pin, setPin] = useState<string>("");
  const [confirmPin, setConfirmPin] = useState<string>("");
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [error, setError] = useState<string>("");
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotScales = useRef(
    Array.from({ length: PIN_LENGTH }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (!isSetup && biometricsEnabled && biometricsAvailable) {
      const timer = setTimeout(() => {
        void authenticateWithBiometrics();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isSetup, biometricsEnabled, biometricsAvailable, authenticateWithBiometrics]);

  const animateDot = useCallback(
    (index: number, filled: boolean) => {
      Animated.spring(dotScales[index], {
        toValue: filled ? 1 : 0,
        friction: 4,
        tension: 200,
        useNativeDriver: true,
      }).start();
    },
    [dotScales]
  );

  const shakeError = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -15, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const resetDots = useCallback(() => {
    dotScales.forEach((d) => d.setValue(0));
  }, [dotScales]);

  const handleComplete = useCallback(
    async (fullPin: string) => {
      if (isSetup) {
        if (step === "enter") {
          setConfirmPin(fullPin);
          setStep("confirm");
          setPin("");
          resetDots();
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (fullPin === confirmPin) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await setupPin(fullPin);
        } else {
          setError("PIN-коды не совпадают");
          shakeError();
          setPin("");
          resetDots();
          setStep("enter");
          setConfirmPin("");
        }
      } else {
        const ok = await verifyPin(fullPin);
        if (!ok) {
          setError("Неверный PIN");
          shakeError();
          setPin("");
          resetDots();
        } else {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    },
    [isSetup, step, confirmPin, setupPin, verifyPin, shakeError, resetDots]
  );

  const handlePress = useCallback(
    (key: string) => {
      setError("");
      if (key === "delete") {
        setPin((prev) => {
          const next = prev.slice(0, -1);
          if (prev.length > 0) {
            animateDot(prev.length - 1, false);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          return next;
        });
        return;
      }
      if (key === "") return;

      setPin((prev) => {
        if (prev.length >= PIN_LENGTH) return prev;
        const next = prev + key;
        animateDot(prev.length, true);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);

        if (next.length === PIN_LENGTH) {
          setTimeout(() => {
            void handleComplete(next);
          }, 200);
        }
        return next;
      });
    },
    [animateDot, handleComplete]
  );

  const handleBiometric = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void authenticateWithBiometrics();
  }, [authenticateWithBiometrics]);

  const title = isSetup
    ? step === "enter"
      ? "Задайте PIN-код"
      : "Повторите PIN-код"
    : "Введите PIN-код";

  const subtitle = isSetup
    ? step === "enter"
      ? "Придумайте 4-значный код для входа"
      : "Подтвердите ваш PIN-код"
    : "Для доступа к Envo";

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <EnvoLogo size="xl" />
        <View style={styles.iconWrap}>
          <GlassKeyBackground isDark={isDark} />
          <View style={styles.iconInner}>
            {isSetup ? (
              <ShieldCheck size={28} color={colors.accent} />
            ) : (
              <Lock size={28} color={colors.accent} />
            )}
          </View>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View key={i} style={styles.dotOuter}>
            <Animated.View
              style={[
                styles.dotInner,
                {
                  transform: [{ scale: dotScales[i] }],
                },
              ]}
            />
          </View>
        ))}
      </Animated.View>

      {error ? <Text style={styles.errorText}>{error}</Text> : <Text style={styles.pinHint}>{pin.length}/4</Text>}

      <View style={styles.keypad}>
        {KEYS.map((key, i) => {
          if (key === "") {
            if (!isSetup && biometricsEnabled && biometricsAvailable && Platform.OS !== "web") {
              return (
                <TouchableOpacity
                  key={i}
                  style={styles.key}
                  onPress={handleBiometric}
                  activeOpacity={0.6}
                  testID="biometric-btn"
                >
                  <GlassKeyBackground isDark={isDark} />
                  <ScanFace size={28} color={colors.accent} />
                </TouchableOpacity>
              );
            }
            return <View key={i} style={styles.key} />;
          }

          if (key === "delete") {
            return (
              <TouchableOpacity
                key={i}
                style={styles.keyTransparent}
                onPress={() => handlePress("delete")}
                activeOpacity={0.6}
                testID="delete-btn"
              >
                <Delete size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={i}
              style={styles.key}
              onPress={() => handlePress(key)}
              activeOpacity={0.5}
              testID={`key-${key}`}
            >
              <GlassKeyBackground isDark={isDark} />
              <Text style={styles.keyText}>{key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </Animated.View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"], isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "space-between",
    },
    header: {
      alignItems: "center",
      gap: 14,
    },
    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: 20,
      overflow: "hidden",
      backgroundColor: Platform.OS === "web" ? colors.surfaceAccent : "transparent",
      borderWidth: 1,
      borderColor: colors.borderGlass,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    iconInner: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.3)",
      width: "100%",
      height: "100%",
    },
    title: {
      fontSize: 24,
      fontWeight: "800" as const,
      color: colors.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    dotsRow: {
      flexDirection: "row",
      gap: 22,
    },
    dotOuter: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    dotInner: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.accent,
      position: "absolute",
    },
    errorText: {
      fontSize: 13,
      color: colors.danger,
      fontWeight: "600" as const,
      height: 20,
    },
    pinHint: {
      height: 20,
      fontSize: 12,
      color: colors.textMuted,
    },
    keypad: {
      flexDirection: "row",
      flexWrap: "wrap",
      width: 280,
      justifyContent: "center",
      gap: 14,
      paddingBottom: 12,
    },
    key: {
      width: 80,
      height: 60,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      backgroundColor: Platform.OS === "web" ? colors.surface : "transparent",
      borderWidth: 1,
      borderColor: colors.borderGlass,
    },
    keyTransparent: {
      width: 80,
      height: 60,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    keyText: {
      fontSize: 28,
      fontWeight: "600" as const,
      color: colors.text,
    },
  });
}
