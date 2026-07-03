import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { CrmContextProvider } from "@/providers/CrmProvider";
import { AuthContextProvider, useAuth } from "@/providers/AuthProvider";
import { NotificationsContextProvider } from "@/providers/NotificationsProvider";
import { ThemeContextProvider, useTheme } from "@/providers/ThemeProvider";
import LockScreen from "@/components/LockScreen";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24,
      staleTime: 1000 * 60 * 5,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

function AuthGate() {
  const { isAuthenticated, isLoading, hasPin } = useAuth();
  const { colors } = useTheme();
  const styles = getStyles(colors.background, colors.accent);

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading || hasPin === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LockScreen />;
  }

  return (
    <CrmContextProvider>
      <NotificationsContextProvider>
        <RootLayoutNav />
      </NotificationsContextProvider>
    </CrmContextProvider>
  );
}

function AppShell() {
  const { isDark } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <AuthContextProvider>
        <AuthGate />
      </AuthContextProvider>
    </GestureHandlerRootView>
  );
}

function getStyles(background: string, accent: string) {
  return StyleSheet.create({
    loading: {
      flex: 1,
      backgroundColor: background,
      alignItems: "center",
      justifyContent: "center",
    },
    accent: {
      color: accent,
    },
  });
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContextProvider>
        <AppShell />
      </ThemeContextProvider>
    </QueryClientProvider>
  );
}
