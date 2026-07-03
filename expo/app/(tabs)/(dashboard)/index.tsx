import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import {
  Banknote,
  Ticket,
  TrendingUp,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useCrm } from "@/providers/CrmProvider";
import { useTheme } from "@/providers/ThemeProvider";
import MetricCard from "@/components/MetricCard";
import SaleCard from "@/components/SaleCard";
import { formatCurrency, formatNumber, formatPercentage, formatMonthYear } from "@/utils/format";

export default function DashboardScreen() {
  const {
    metrics,
    currentMonthActivities,
    isRefreshing,
    refreshAll,
    selectedMonth,
    selectedYear,
    isCurrentMonth,
    goToPrevMonth,
    goToNextMonth,
  } = useCrm();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const handleRefresh = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refreshAll();
  }, [refreshAll]);

  const recentActivities = currentMonthActivities.slice(0, 5);

  const monthLabel = useMemo(() => {
    const date = new Date(selectedYear, selectedMonth);
    return formatMonthYear(date);
  }, [selectedMonth, selectedYear]);

  const handlePrevMonth = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    goToPrevMonth();
  }, [goToPrevMonth]);

  const handleNextMonth = useCallback(() => {
    if (isCurrentMonth) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    goToNextMonth();
  }, [goToNextMonth, isCurrentMonth]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Обзор",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.headerTint,
        }}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.monthSwitcher}>
          <TouchableOpacity
            onPress={handlePrevMonth}
            style={styles.monthArrow}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={18} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.monthBadge}>
            <Text style={styles.monthBadgeText}>{monthLabel}</Text>
            {isCurrentMonth && <View style={styles.currentDot} />}
          </View>
          <TouchableOpacity
            onPress={handleNextMonth}
            style={[styles.monthArrow, isCurrentMonth && styles.monthArrowDisabled]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            disabled={isCurrentMonth}
          >
            <ChevronRight size={18} color={isCurrentMonth ? colors.textMuted : colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            label="Выручка"
            value={formatCurrency(metrics.totalRevenue)}
            change={formatPercentage(metrics.revenueChange)}
            changePositive={metrics.revenueChange >= 0}
            icon={<Banknote size={18} color={colors.accent} />}
          />
          <MetricCard
            label="Билетов"
            value={formatNumber(metrics.ticketsSoldMonth)}
            change={formatPercentage(metrics.ticketsChange)}
            changePositive={metrics.ticketsChange >= 0}
            icon={<Ticket size={18} color={colors.blue} />}
            accentColor={colors.blue}
            accentBg={colors.blueBg}
          />
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            label="Прибыль"
            value={formatCurrency(metrics.totalProfit)}
            change={formatPercentage(metrics.profitChange)}
            changePositive={metrics.profitChange >= 0}
            icon={<TrendingUp size={18} color={colors.accent} />}
          />
        </View>

        <View style={styles.profitHint}>
          <Text style={styles.profitHintText}>
            Прибыль = выручка − 6% сбор − 13% налог
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Продажи за месяц</Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/activity")}
            style={styles.seeAllBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.seeAllText}>Все</Text>
            <ArrowRight size={14} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {recentActivities.length === 0 && (
          <View style={styles.emptyMonth}>
            <Text style={styles.emptyMonthText}>Нет продаж за этот месяц</Text>
          </View>
        )}

        {recentActivities.map((activity) => (
          <SaleCard
            key={activity.id}
            activity={activity}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/(dashboard)/sale/[id]",
                params: { id: activity.sale.id },
              })
            }
          />
        ))}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 100,
    },
    monthSwitcher: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
      gap: 10,
    },
    monthArrow: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.surfaceAccent,
      alignItems: "center",
      justifyContent: "center",
    },
    monthArrowDisabled: {
      opacity: 0.3,
    },
    monthBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.accentBg,
      borderRadius: 14,
      paddingHorizontal: 18,
      paddingVertical: 9,
      gap: 8,
      minWidth: 160,
      justifyContent: "center",
    },
    monthBadgeText: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: colors.text,
      textTransform: "capitalize" as const,
    },
    currentDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
    },
    metricsRow: {
      flexDirection: "row",
      gap: 10,
      marginBottom: 10,
    },
    profitHint: {
      paddingHorizontal: 4,
      marginBottom: 8,
    },
    profitHintText: {
      fontSize: 11,
      color: colors.textMuted,
      fontStyle: "italic" as const,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 18,
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: "700" as const,
      color: colors.text,
    },
    seeAllBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    seeAllText: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.accent,
    },
    emptyMonth: {
      paddingVertical: 40,
      alignItems: "center",
      backgroundColor: colors.surfaceAccent,
      borderRadius: 20,
    },
    emptyMonthText: {
      fontSize: 14,
      color: colors.textMuted,
    },
  });
}
