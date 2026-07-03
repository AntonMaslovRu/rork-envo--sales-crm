import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Ticket } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/providers/ThemeProvider";
import { ActivityItem } from "@/types/crm";
import { formatFullCurrency, timeAgo } from "@/utils/format";

interface SaleCardProps {
  activity: ActivityItem;
  onPress?: () => void;
}

export default React.memo(function SaleCard({ activity, onPress }: SaleCardProps) {
  const { sale } = activity;
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      testID={`sale-card-${activity.id}`}
    >
      {Platform.OS !== "web" && (
        <BlurView
          intensity={30}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.cardInner}>
        <View style={styles.iconWrap}>
          <Ticket size={16} color={colors.accent} />
        </View>
        <View style={styles.content}>
          <Text style={styles.buyer} numberOfLines={1}>{sale.buyerName}</Text>
          <Text style={styles.eventTitle} numberOfLines={1}>{sale.eventTitle}</Text>
          <View style={styles.meta}>
            <Text style={styles.amount}>{formatFullCurrency(sale.totalAmount)}</Text>
            <View style={styles.dot} />
            <Text style={styles.qty}>{sale.quantity} шт.</Text>
            <View style={styles.dot} />
            <Text style={styles.time}>{timeAgo(sale.timestamp)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

function createStyles(colors: ReturnType<typeof useTheme>["colors"], isDark: boolean) {
  return StyleSheet.create({
    card: {
      borderRadius: 16,
      marginBottom: 8,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.borderGlass,
      backgroundColor: Platform.OS === "web" ? colors.surface : "transparent",
      shadowColor: colors.glassShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 2,
    },
    cardInner: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      backgroundColor: Platform.OS === "web" ? "transparent" : (isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.25)"),
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      backgroundColor: colors.accentBg,
    },
    content: {
      flex: 1,
    },
    buyer: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.text,
      marginBottom: 2,
    },
    eventTitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 5,
    },
    meta: {
      flexDirection: "row",
      alignItems: "center",
    },
    amount: {
      fontSize: 13,
      fontWeight: "700" as const,
      color: colors.accent,
    },
    qty: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    dot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: colors.textMuted,
      marginHorizontal: 6,
    },
    time: {
      fontSize: 12,
      color: colors.textMuted,
    },
  });
}
