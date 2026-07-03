import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { ChevronRight, MapPin, Calendar } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/providers/ThemeProvider";
import { TicketEvent, EventStatus } from "@/types/crm";
import { formatCurrency, formatShortDate } from "@/utils/format";

interface EventCardProps {
  event: TicketEvent;
  onPress?: () => void;
}

function statusConfig(status: EventStatus, colors: ReturnType<typeof useTheme>["colors"]) {
  switch (status) {
    case "upcoming":
      return { label: "Скоро", color: colors.blue, bg: colors.blueBg };
    case "ongoing":
      return { label: "Идёт", color: colors.accent, bg: colors.accentBg };
    case "completed":
      return { label: "Прошло", color: colors.textSecondary, bg: colors.surfaceAccent };
    case "cancelled":
      return { label: "Отменено", color: colors.danger, bg: colors.dangerBg };
  }
}

export default React.memo(function EventCard({ event, onPress }: EventCardProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const status = statusConfig(event.status, colors);
  const fillPercent = Math.round((event.ticketsSold / event.ticketsTotal) * 100);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      testID={`event-card-${event.id}`}
    >
      {Platform.OS !== "web" && (
        <BlurView
          intensity={30}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={styles.cardInner}>
        <View style={styles.topRow}>
          <View style={styles.left}>
            <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
            <View style={styles.metaRow}>
              <MapPin size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>{event.venue}, {event.city}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.progressRow}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${fillPercent}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{fillPercent}%</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Calendar size={12} color={colors.textMuted} />
            <Text style={styles.footerText}>{formatShortDate(event.date)}</Text>
          </View>
          <View style={styles.footerRight}>
            <Text style={styles.revenue}>{formatCurrency(event.revenue)}</Text>
            <ChevronRight size={14} color={colors.textMuted} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

function createStyles(colors: ReturnType<typeof useTheme>["colors"], isDark: boolean) {
  return StyleSheet.create({
    card: {
      borderRadius: 18,
      marginBottom: 10,
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
      padding: 16,
      backgroundColor: Platform.OS === "web" ? "transparent" : (isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.25)"),
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 14,
    },
    left: {
      flex: 1,
      marginRight: 12,
    },
    title: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.text,
      marginBottom: 5,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    metaText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    statusText: {
      fontSize: 11,
      fontWeight: "700" as const,
    },
    progressRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 14,
    },
    progressBarBg: {
      flex: 1,
      height: 6,
      backgroundColor: colors.surfaceAccent,
      borderRadius: 3,
      overflow: "hidden",
    },
    progressBarFill: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
    },
    progressLabel: {
      fontSize: 12,
      fontWeight: "700" as const,
      color: colors.textSecondary,
      minWidth: 32,
      textAlign: "right" as const,
    },
    footer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: 12,
    },
    footerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    footerText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    footerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    revenue: {
      fontSize: 13,
      fontWeight: "700" as const,
      color: colors.accent,
    },
  });
}
