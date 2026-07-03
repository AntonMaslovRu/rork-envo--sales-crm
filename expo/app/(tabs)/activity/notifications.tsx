import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Stack } from "expo-router";
import { Bell, BellOff, CheckCheck, Trash2, Ticket, CircleDot } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useNotifications } from "@/providers/NotificationsProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { NotificationHistoryItem } from "@/types/crm";
import { timeAgo } from "@/utils/format";

export default function NotificationCenterScreen() {
  const { notificationHistory, markNotificationRead, markAllRead, clearHistory, unreadCount } = useNotifications();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleMarkAllRead = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markAllRead();
  }, [markAllRead]);

  const handleClearHistory = useCallback(() => {
    Alert.alert(
      "Очистить историю",
      "Все уведомления будут удалены. Продолжить?",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Очистить",
          style: "destructive",
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            clearHistory();
          },
        },
      ]
    );
  }, [clearHistory]);

  const handleItemPress = useCallback((item: NotificationHistoryItem) => {
    if (!item.read) {
      void Haptics.selectionAsync();
      markNotificationRead(item.id);
    }
  }, [markNotificationRead]);

  const renderItem = useCallback(
    ({ item }: { item: NotificationHistoryItem }) => {
      const isUnread = !item.read;
      return (
        <TouchableOpacity
          style={[styles.notifCard, isUnread && styles.notifCardUnread]}
          onPress={() => handleItemPress(item)}
          activeOpacity={0.7}
          testID={`notification-${item.id}`}
        >
          <View style={styles.notifLeft}>
            <View style={[styles.notifIconWrap, { backgroundColor: isUnread ? colors.accentBg : colors.surfaceAccent }]}>
              {item.type === "new_sale" ? (
                <Ticket size={16} color={isUnread ? colors.accent : colors.textMuted} />
              ) : (
                <Bell size={16} color={isUnread ? colors.accent : colors.textMuted} />
              )}
            </View>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
          <View style={styles.notifContent}>
            <Text style={[styles.notifTitle, isUnread && styles.notifTitleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.notifBody} numberOfLines={2}>
              {item.body}
            </Text>
            <Text style={styles.notifTime}>{timeAgo(item.timestamp)}</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [styles, colors, handleItemPress]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Уведомления",
          headerRight: () => (
            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={handleMarkAllRead}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  testID="mark-all-read"
                >
                  <CheckCheck size={20} color={colors.accent} />
                </TouchableOpacity>
              )}
              {notificationHistory.length > 0 && (
                <TouchableOpacity
                  onPress={handleClearHistory}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  testID="clear-history"
                >
                  <Trash2 size={20} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          ),
        }}
      />

      {unreadCount > 0 && (
        <View style={styles.unreadBanner}>
          <CircleDot size={14} color={colors.accent} />
          <Text style={styles.unreadBannerText}>
            {unreadCount} непрочитанн{unreadCount === 1 ? "ое" : "ых"}
          </Text>
        </View>
      )}

      <FlatList
        data={notificationHistory}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <BellOff size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Нет уведомлений</Text>
            <Text style={styles.emptySubtitle}>
              Здесь будет отображаться история{"\n"}пуш-уведомлений о продажах
            </Text>
          </View>
        }
      />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      paddingRight: 4,
    },
    unreadBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: colors.accentBg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    unreadBannerText: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.accent,
    },
    listContent: {
      padding: 16,
      paddingBottom: 100,
    },
    notifCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      gap: 12,
    },
    notifCardUnread: {
      borderColor: colors.accent + "30",
      backgroundColor: colors.accentBg + "40",
    },
    notifLeft: {
      position: "relative",
    },
    notifIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    unreadDot: {
      position: "absolute",
      top: -2,
      right: -2,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.accent,
      borderWidth: 2,
      borderColor: colors.background,
    },
    notifContent: { flex: 1 },
    notifTitle: {
      fontSize: 14,
      fontWeight: "500" as const,
      color: colors.text,
      marginBottom: 3,
    },
    notifTitleUnread: {
      fontWeight: "700" as const,
    },
    notifBody: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
      marginBottom: 6,
    },
    notifTime: {
      fontSize: 11,
      color: colors.textMuted,
    },
    emptyState: {
      alignItems: "center",
      paddingTop: 80,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: "700" as const,
      color: colors.text,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center" as const,
      lineHeight: 20,
    },
  });
}
