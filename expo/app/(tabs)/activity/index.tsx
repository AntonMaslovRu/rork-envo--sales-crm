import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Bell } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useCrm } from "@/providers/CrmProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { useNotifications } from "@/providers/NotificationsProvider";
import SaleCard from "@/components/SaleCard";
import { ActivityItem } from "@/types/crm";
import { groupSalesByMonth } from "@/mocks/sales";
import { formatFullCurrency } from "@/utils/format";

interface MonthSection {
  title: string;
  totalAmount: number;
  ticketCount: number;
  data: ActivityItem[];
}

export default function SalesScreen() {
  const { activities, allSales, isRefreshing, refreshAll } = useCrm();
  const { colors } = useTheme();
  const { unreadCount } = useNotifications();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const handleRefresh = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refreshAll();
  }, [refreshAll]);

  const sections = useMemo((): MonthSection[] => {
    const grouped = groupSalesByMonth(allSales);

    return grouped.map((group) => {
      const groupActivities = group.sales
        .map((sale) => activities.find((a) => a.sale.id === sale.id))
        .filter((a): a is ActivityItem => a !== undefined);

      const totalAmount = group.sales.reduce((sum, s) => sum + s.totalAmount, 0);
      const ticketCount = group.sales.reduce((sum, s) => sum + s.quantity, 0);

      return {
        title: group.label,
        totalAmount,
        ticketCount,
        data: groupActivities,
      };
    });
  }, [allSales, activities]);

  const renderSale = useCallback(
    ({ item }: { item: ActivityItem }) => (
      <SaleCard
        activity={item}
        onPress={() =>
          router.push({
            pathname: "/(tabs)/activity/sale/[id]",
            params: { id: item.sale.id },
          })
        }
      />
    ),
    [router]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: MonthSection }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <View style={styles.sectionMeta}>
          <Text style={styles.sectionAmount}>
            {formatFullCurrency(section.totalAmount)}
          </Text>
          <View style={styles.sectionDot} />
          <Text style={styles.sectionTickets}>
            {section.ticketCount} шт.
          </Text>
        </View>
      </View>
    ),
    [styles]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Продажи",
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/activity/notifications")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.bellBtn}
              testID="notifications-bell"
            >
              <Bell size={22} color={colors.headerTint} />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          ),
        }}
      />
      <SectionList
        sections={sections}
        renderItem={renderSale}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Нет продаж</Text>
          </View>
        }
      />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    bellBtn: {
      position: "relative",
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 4,
    },
    bellBadge: {
      position: "absolute",
      top: 0,
      right: 0,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.danger,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    bellBadgeText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "700" as const,
    },
    listContent: {
      padding: 16,
      paddingBottom: 100,
    },
    sectionHeader: {
      paddingTop: 18,
      paddingBottom: 12,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: "700" as const,
      color: colors.text,
      marginBottom: 4,
    },
    sectionMeta: {
      flexDirection: "row",
      alignItems: "center",
    },
    sectionAmount: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.textSecondary,
    },
    sectionDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: colors.textMuted,
      marginHorizontal: 6,
    },
    sectionTickets: {
      fontSize: 13,
      color: colors.textMuted,
    },
    emptyState: {
      paddingVertical: 60,
      alignItems: "center",
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 15,
    },
  });
}
