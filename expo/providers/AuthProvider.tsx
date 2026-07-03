import createContextHook from "@nkzw/create-context-hook";
import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";

const PIN_KEY = "envo_pin";
const BIOMETRICS_KEY = "envo_biometrics_enabled";

export const [AuthContextProvider, useAuth] = createContextHook(() => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [biometricsEnabled, setBiometricsEnabled] = useState<boolean>(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const init = async () => {
      try {
        const storedPin = await SecureStore.getItemAsync(PIN_KEY);
        setHasPin(!!storedPin);

        const bioEnabled = await SecureStore.getItemAsync(BIOMETRICS_KEY);
        setBiometricsEnabled(bioEnabled === "true");

        if (Platform.OS !== "web") {
          const compatible = await LocalAuthentication.hasHardwareAsync();
          const enrolled = await LocalAuthentication.isEnrolledAsync();
          setBiometricsAvailable(compatible && enrolled);
        }
      } catch (err) {
        console.log("[Auth] Init error:", err);
        setHasPin(false);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const setupPin = useCallback(async (pin: string) => {
    console.log("[Auth] Setting up PIN");
    await SecureStore.setItemAsync(PIN_KEY, pin);
    setHasPin(true);
    setIsAuthenticated(true);
  }, []);

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    const storedPin = await SecureStore.getItemAsync(PIN_KEY);
    const match = storedPin === pin;
    if (match) {
      console.log("[Auth] PIN verified");
      setIsAuthenticated(true);
    }
    return match;
  }, []);

  const authenticateWithBiometrics = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === "web") return false;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Войти в Envo",
        cancelLabel: "Отмена",
        disableDeviceFallback: true,
      });
      if (result.success) {
        console.log("[Auth] Biometric auth success");
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (err) {
      console.log("[Auth] Biometric auth error:", err);
      return false;
    }
  }, []);

  const toggleBiometrics = useCallback(async (enabled: boolean) => {
    await SecureStore.setItemAsync(BIOMETRICS_KEY, enabled ? "true" : "false");
    setBiometricsEnabled(enabled);
    console.log("[Auth] Biometrics", enabled ? "enabled" : "disabled");
  }, []);

  const changePin = useCallback(async (newPin: string) => {
    await SecureStore.setItemAsync(PIN_KEY, newPin);
    console.log("[Auth] PIN changed");
  }, []);

  const resetAuth = useCallback(async () => {
    await SecureStore.deleteItemAsync(PIN_KEY);
    await SecureStore.deleteItemAsync(BIOMETRICS_KEY);
    setHasPin(false);
    setBiometricsEnabled(false);
    setIsAuthenticated(false);
    console.log("[Auth] Auth reset");
  }, []);

  const lock = useCallback(() => {
    setIsAuthenticated(false);
  }, []);

  return {
    isAuthenticated,
    hasPin,
    biometricsEnabled,
    biometricsAvailable,
    isLoading,
    setupPin,
    verifyPin,
    authenticateWithBiometrics,
    toggleBiometrics,
    changePin,
    resetAuth,
    lock,
  };
});
