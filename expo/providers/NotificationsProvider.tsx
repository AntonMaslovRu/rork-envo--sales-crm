import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Platform, AppState } from "react-native";
import { useRouter } from "expo-router";
import { useCrm } from "@/providers/CrmProvider";
import { TicketSale, NotificationHistoryItem } from "@/types/crm";

const KNOWN_SALES_STORAGE_KEY = "known_sale_ids_v1";
const PUSH_TOKEN_STORAGE_KEY = "expo_push_token_v1";
const NOTIFICATION_HISTORY_KEY = "notification_history_v1";
const MAX_STORED_SALE_IDS = 250;
const MAX_NOTIFICATION_HISTORY = 200;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function pluralizeTickets(count: number): string {
  const lastTwo = count % 100;
  const lastOne = count % 10;
  if (lastTwo >= 11 && lastTwo <= 19) return "билетов";
  if (lastOne === 1) return "билет";
  if (lastOne >= 2 && lastOne <= 4) return "билета";
  return "билетов";
}

function buildSaleNotificationPayload(sale: TicketSale) {
  return {
    title: "Новая продажа",
    body: `Новая продажа: ${sale.eventTitle}, ${sale.quantity} ${pluralizeTickets(sale.quantity)}`,
  };
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") {
    console.log("[Notifications] Push not supported on web");
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[Notifications] Permission not granted");
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId
      ?? process.env.EXPO_PUBLIC_PROJECT_ID
      ?? undefined;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    console.log("[Notifications] Expo Push Token:", tokenData.data);
    return tokenData.data;
  } catch (error) {
    console.log("[Notifications] Failed to get push token:", error);
    return null;
  }
}

async function sendPushTokenToServer(token: string): Promise<void> {
  const apiBaseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (!apiBaseUrl) {
    console.log("[Notifications] No API base URL configured, skipping token registration");
    return;
  }

  try {
    const response = await fetch(`${apiBaseUrl}/push/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      }),
    });

    if (response.ok) {
      console.log("[Notifications] Push token registered with server");
    } else {
      console.log("[Notifications] Server token registration returned:", response.status);
    }
  } catch (error) {
    console.log("[Notifications] Failed to send token to server (non-blocking):", error);
  }
}

export const [NotificationsContextProvider, useNotifications] = createContextHook(() => {
  const { allSales } = useCrm();
  const router = useRouter();
  const [permissionGranted, setPermissionGranted] = useState<boolean>(Platform.OS === "web");
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [knownSaleIds, setKnownSaleIds] = useState<string[] | null>(null);
  const [badgeCount, setBadgeCount] = useState<number>(0);
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistoryItem[]>([]);
  const initializedRef = useRef<boolean>(false);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const appStateRef = useRef<string>(AppState.currentState);

  const persistKnownSalesMutation = useMutation({
    mutationFn: async (saleIds: string[]) => {
      await AsyncStorage.setItem(KNOWN_SALES_STORAGE_KEY, JSON.stringify(saleIds.slice(0, MAX_STORED_SALE_IDS)));
      return saleIds;
    },
  });

  const persistPushTokenMutation = useMutation({
    mutationFn: async (token: string) => {
      await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
      await sendPushTokenToServer(token);
      return token;
    },
  });

  const persistHistoryMutation = useMutation({
    mutationFn: async (history: NotificationHistoryItem[]) => {
      await AsyncStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_NOTIFICATION_HISTORY)));
      return history;
    },
  });

  const historyQuery = useQuery({
    queryKey: ["notification-history"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(NOTIFICATION_HISTORY_KEY);
      if (!stored) return [] as NotificationHistoryItem[];
      return JSON.parse(stored) as NotificationHistoryItem[];
    },
  });

  useEffect(() => {
    if (historyQuery.data) {
      setNotificationHistory(historyQuery.data);
    }
  }, [historyQuery.data]);


  useEffect(() => {
    if (Platform.OS === "web") {
      setPermissionGranted(false);
      return;
    }

    if (Platform.OS === "android") {
      void Notifications.setNotificationChannelAsync("sales-alerts", {
        name: "Sales alerts",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: "default",
        enableLights: true,
        lightColor: "#007AFF",
      });
    }

    const initPushNotifications = async () => {
      try {
        const token = await registerForPushNotificationsAsync();

        if (token) {
          setPushToken(token);
          setPermissionGranted(true);
          persistPushTokenMutation.mutate(token);
          console.log("[Notifications] Push notifications initialized with token:", token);
        } else {
          const currentPermissions = await Notifications.getPermissionsAsync();
          const granted = currentPermissions.granted ||
            currentPermissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
          setPermissionGranted(granted);
          console.log("[Notifications] Permissions granted (local only):", granted);
        }
      } catch (error) {
        console.log("[Notifications] Push init failed:", error);
        setPermissionGranted(false);
      }
    };

    void initPushNotifications();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data;
      console.log("[Notifications] Received notification:", {
        title: notification.request.content.title,
        body: notification.request.content.body,
        data,
      });

      if (data?.type === "new_sale") {
        setBadgeCount((prev) => prev + 1);
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log("[Notifications] User tapped notification:", data);

      setBadgeCount(0);
      void Notifications.setBadgeCountAsync(0);

      if (data?.screen === "activity") {
        try {
          router.push("/(tabs)/activity");
        } catch (error) {
          console.log("[Notifications] Navigation failed:", error);
        }
      } else if (data?.screen === "deal" && data?.eventId != null) {
        try {
          router.push({
            pathname: "/(tabs)/(dashboard)/deal/[id]",
            params: { id: String(data.eventId as string) },
          });
        } catch (error) {
          console.log("[Notifications] Navigation failed:", error);
        }
      } else if (data?.screen === "clients" && data?.clientId != null) {
        try {
          router.push({
            pathname: "/(tabs)/clients/[id]",
            params: { id: String(data.clientId as string) },
          });
        } catch (error) {
          console.log("[Notifications] Navigation failed:", error);
        }
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === "active") {
        console.log("[Notifications] App returned to foreground, clearing badge");
        setBadgeCount(0);
        void Notifications.setBadgeCountAsync(0);
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const loadKnownSales = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(KNOWN_SALES_STORAGE_KEY);
        if (!storedValue) {
          setKnownSaleIds([]);
          return;
        }
        const parsed = JSON.parse(storedValue) as string[];
        setKnownSaleIds(Array.isArray(parsed) ? parsed : []);
      } catch (error) {
        console.log("[Notifications] Failed to load known sale ids:", error);
        setKnownSaleIds([]);
      }
    };

    void loadKnownSales();
  }, []);

  const processingRef = useRef<boolean>(false);

  useEffect(() => {
    if (knownSaleIds === null || processingRef.current) return;

    const latestIds = allSales
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map((sale) => sale.id)
      .slice(0, MAX_STORED_SALE_IDS);

    if (!initializedRef.current) {
      initializedRef.current = true;
      setKnownSaleIds(latestIds);
      persistKnownSalesMutation.mutate(latestIds);
      console.log("[Notifications] Baseline sales snapshot saved:", { count: latestIds.length });
      return;
    }

    const knownIdsSet = new Set(knownSaleIds);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const newSales = allSales
      .filter((sale) => {
        if (knownIdsSet.has(sale.id)) return false;
        const saleTime = new Date(sale.timestamp).getTime();
        return saleTime >= todayStart;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (newSales.length === 0) {
      if (latestIds.join("|") !== knownSaleIds.join("|")) {
        setKnownSaleIds(latestIds);
        persistKnownSalesMutation.mutate(latestIds);
      }
      return;
    }

    console.log("[Notifications] Detected new sales:", { count: newSales.length, permissionGranted });
    processingRef.current = true;

    const updateKnownSales = () => {
      setKnownSaleIds(latestIds);
      persistKnownSalesMutation.mutate(latestIds);
      processingRef.current = false;
    };

    let currentHistory = [...notificationHistory];
    for (const sale of newSales) {
      const payload = buildSaleNotificationPayload(sale);
      const item: NotificationHistoryItem = {
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: payload.title,
        body: payload.body,
        timestamp: new Date().toISOString(),
        type: "new_sale",
        read: false,
        data: { saleId: sale.id, eventTitle: sale.eventTitle, quantity: sale.quantity },
      };
      currentHistory = [item, ...currentHistory].slice(0, MAX_NOTIFICATION_HISTORY);
    }
    setNotificationHistory(currentHistory);
    persistHistoryMutation.mutate(currentHistory);

    if (!permissionGranted || Platform.OS === "web") {
      updateKnownSales();
      return;
    }

    const scheduleAll = async () => {
      for (const sale of newSales) {
        const payload = buildSaleNotificationPayload(sale);
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: payload.title,
              body: payload.body,
              sound: "default",
              data: {
                type: "new_sale",
                screen: "activity",
                saleId: sale.id,
                timestamp: new Date().toISOString(),
              },
            },
            trigger: null,
          });
          console.log("[Notifications] Scheduled notification for sale:", sale.id);
        } catch (error) {
          console.log("[Notifications] Failed to schedule notification:", error);
        }
      }
      setBadgeCount((prev) => prev + newSales.length);
      updateKnownSales();
    };

    void scheduleAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSales, knownSaleIds, permissionGranted]);

  const clearBadge = useCallback(() => {
    setBadgeCount(0);
    if (Platform.OS !== "web") {
      void Notifications.setBadgeCountAsync(0);
    }
  }, []);

  const markNotificationRead = useCallback((notifId: string) => {
    const updated = notificationHistory.map((item) =>
      item.id === notifId ? { ...item, read: true } : item
    );
    setNotificationHistory(updated);
    persistHistoryMutation.mutate(updated);
  }, [notificationHistory, persistHistoryMutation]);

  const markAllRead = useCallback(() => {
    const updated = notificationHistory.map((item) => ({ ...item, read: true }));
    setNotificationHistory(updated);
    persistHistoryMutation.mutate(updated);
  }, [notificationHistory, persistHistoryMutation]);

  const clearHistory = useCallback(() => {
    setNotificationHistory([]);
    persistHistoryMutation.mutate([]);
  }, [persistHistoryMutation]);

  const unreadCount = useMemo(
    () => notificationHistory.filter((item) => !item.read).length,
    [notificationHistory]
  );

  const requestPermission = useCallback(async () => {
    if (Platform.OS === "web") return false;

    try {
      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === "granted";
      setPermissionGranted(granted);

      if (granted && !pushToken) {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          setPushToken(token);
          persistPushTokenMutation.mutate(token);
        }
      }

      return granted;
    } catch (error) {
      console.log("[Notifications] Permission request failed:", error);
      return false;
    }
  }, [pushToken, persistPushTokenMutation]);

  return useMemo(
    () => ({
      permissionGranted,
      isSupported: Platform.OS !== "web",
      pushToken,
      badgeCount,
      clearBadge,
      requestPermission,
      notificationHistory,
      unreadCount,
      markNotificationRead,
      markAllRead,
      clearHistory,
    }),
    [permissionGranted, pushToken, badgeCount, clearBadge, requestPermission, notificationHistory, unreadCount, markNotificationRead, markAllRead, clearHistory]
  );
});
