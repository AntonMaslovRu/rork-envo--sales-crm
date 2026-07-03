import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { Bell } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useNotifications } from "@/providers/NotificationsProvider";
import { useTheme } from "@/providers/ThemeProvider";

export default React.memo(function NotificationBell() {
  const { unreadCount } = useNotifications();
  const { colors } = useTheme();
  const router = useRouter();

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(tabs)/activity/notifications");
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={styles.container}
      testID="notification-bell"
    >
      <Bell size={22} color={colors.text} />
      {unreadCount > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.danger }]}>
          <Text style={styles.badgeText}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: "#FFFFFF",
  },
});
