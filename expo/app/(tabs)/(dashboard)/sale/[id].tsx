import React, { useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Ticket,
  Banknote,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  ShoppingBag,
  ChevronRight,
  Hash,
  TrendingUp,
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import { useCrm } from "@/providers/CrmProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { formatFullCurrency, formatDate, timeAgo, calculateProfit } from "@/utils/format";

function GlassSection({
  children,
  colors,
  isDark,
  style,
}: {
  children: React.ReactNode;
  colors: ReturnType<typeof useTheme>["colors"];
  isDark: boolean;
  style?: object;
}) {
  if (Platform.OS === "web") {
    return (
      <View
        style={[
          {
            backgroundColor: colors.surface,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: colors.borderGlass,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }
  return (
    <View
      style={[
        {
          borderRadius: 20,
          overflow: "hidden" as const,
          shadowColor: colors.glassShadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 2,
        },
        style,
      ]}
    >
      <BlurView
        intensity={30}
        tint={isDark ? "dark" : "light"}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={{
          backgroundColor: isDark
            ? "rgba(255,255,255,0.03)"
            : "rgba(255,255,255,0.25)",
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.borderGlass,
        }}
      >
        {children}
      </View>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  valueColor,
  styles,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        {icon}
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text
        style={[styles.infoValue, valueColor ? { color: valueColor } : undefined]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function pluralTickets(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} билет`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
    return `${count} билета`;
  return `${count} билетов`;
}

export default function SaleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activities, allSales, clients } = useCrm();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();

  const activity = useMemo(
    () => activities.find((a) => a.sale.id === id),
    [activities, id]
  );

  const sale = activity?.sale ?? allSales.find((s) => s.id === id);

  const client = useMemo(() => {
    if (!sale) return null;
    const key = sale.customerId ?? sale.customerEmail ?? sale.buyerName;
    return clients.find((c) => c.id === key) ?? null;
  }, [sale, clients]);

  const otherPurchases = useMemo(() => {
    if (!client) return [];
    return client.purchases.filter((p) => p.saleId !== id);
  }, [client, id]);

  const handleClientPress = useCallback(() => {
    if (!client) return;
    router.push({
      pathname: "/(tabs)/clients/[id]",
      params: { id: client.id },
    });
  }, [client, router]);

  if (!sale) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Продажа" }} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Продажа не найдена</Text>
        </View>
      </View>
    );
  }

  const profit = calculateProfit(sale.totalAmount);
  const fee = Math.round(sale.totalAmount * 0.06);
  const tax = Math.round(sale.totalAmount * 0.94 * 0.13);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Карточка продажи" }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: colors.accentBg }]}>
            <Ticket size={28} color={colors.accent} />
          </View>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {sale.eventTitle}
          </Text>
          <Text style={styles.buyerName}>{sale.buyerName}</Text>
          <Text style={styles.timestamp}>{timeAgo(sale.timestamp)}</Text>
        </View>

        <View style={styles.bigNumbers}>
          <GlassSection colors={colors} isDark={isDark} style={styles.bigNumberCard}>
            <View style={styles.bigNumberInner}>
              <Text style={styles.bigNumberLabel}>Сумма</Text>
              <Text style={styles.bigNumberValue}>
                {formatFullCurrency(sale.totalAmount)}
              </Text>
            </View>
          </GlassSection>
          <GlassSection colors={colors} isDark={isDark} style={styles.bigNumberCard}>
            <View style={styles.bigNumberInner}>
              <Text style={styles.bigNumberLabel}>Билетов</Text>
              <Text style={[styles.bigNumberValue, { color: colors.blue }]}>
                {pluralTickets(sale.quantity)}
              </Text>
            </View>
          </GlassSection>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Финансы</Text>
          <GlassSection colors={colors} isDark={isDark}>
            <View style={styles.infoInner}>
              <InfoRow
                icon={<Banknote size={16} color={colors.textSecondary} />}
                label="Цена за билет"
                value={formatFullCurrency(sale.unitPrice)}
                styles={styles}
              />
              <InfoRow
                icon={<Banknote size={16} color={colors.textSecondary} />}
                label="Сумма заказа"
                value={formatFullCurrency(sale.totalAmount)}
                styles={styles}
              />
              <InfoRow
                icon={<TrendingUp size={16} color={colors.textSecondary} />}
                label="Сбор (6%)"
                value={`−${formatFullCurrency(fee)}`}
                styles={styles}
              />
              <InfoRow
                icon={<TrendingUp size={16} color={colors.textSecondary} />}
                label="Налог (13%)"
                value={`−${formatFullCurrency(tax)}`}
                styles={styles}
              />
              <InfoRow
                icon={<Banknote size={16} color={colors.accent} />}
                label="Прибыль"
                value={formatFullCurrency(profit)}
                valueColor={colors.accent}
                styles={styles}
              />
            </View>
          </GlassSection>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Детали заказа</Text>
          <GlassSection colors={colors} isDark={isDark}>
            <View style={styles.infoInner}>
              {sale.orderId != null && (
                <InfoRow
                  icon={<Hash size={16} color={colors.textSecondary} />}
                  label="Номер заказа"
                  value={`#${sale.orderId}`}
                  styles={styles}
                />
              )}
              <InfoRow
                icon={<Ticket size={16} color={colors.textSecondary} />}
                label="Количество"
                value={pluralTickets(sale.quantity)}
                styles={styles}
              />
              <InfoRow
                icon={<Calendar size={16} color={colors.textSecondary} />}
                label="Дата покупки"
                value={formatDate(sale.timestamp)}
                styles={styles}
              />
              <InfoRow
                icon={<Clock size={16} color={colors.textSecondary} />}
                label="Время"
                value={new Date(sale.timestamp).toLocaleTimeString("ru-RU", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                styles={styles}
              />
            </View>
          </GlassSection>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Клиент</Text>
            {client && (
              <TouchableOpacity
                onPress={handleClientPress}
                style={styles.clientLink}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.clientLinkText}>Профиль</Text>
                <ChevronRight size={14} color={colors.accent} />
              </TouchableOpacity>
            )}
          </View>
          <GlassSection colors={colors} isDark={isDark}>
            <View style={styles.infoInner}>
              <InfoRow
                icon={<User size={16} color={colors.textSecondary} />}
                label="Имя"
                value={sale.buyerName}
                styles={styles}
              />
              {(sale.customerEmail || client?.mailbox) && (
                <InfoRow
                  icon={<Mail size={16} color={colors.textSecondary} />}
                  label="Email"
                  value={sale.customerEmail ?? client?.mailbox ?? "Не указан"}
                  styles={styles}
                />
              )}
              {(sale.customerPhone || client?.phone) && (
                <InfoRow
                  icon={<Phone size={16} color={colors.textSecondary} />}
                  label="Телефон"
                  value={sale.customerPhone ?? client?.phone ?? "Не указан"}
                  styles={styles}
                />
              )}
              {(sale.customerAddress || client?.postalAddress) && (
                <InfoRow
                  icon={<MapPin size={16} color={colors.textSecondary} />}
                  label="Адрес"
                  value={sale.customerAddress ?? client?.postalAddress ?? "Не указан"}
                  styles={styles}
                />
              )}
              {client && (
                <>
                  <InfoRow
                    icon={<ShoppingBag size={16} color={colors.textSecondary} />}
                    label="Всего покупок"
                    value={String(client.totalPurchases)}
                    styles={styles}
                  />
                  <InfoRow
                    icon={<Banknote size={16} color={colors.textSecondary} />}
                    label="Общая сумма"
                    value={formatFullCurrency(client.totalSpent)}
                    styles={styles}
                  />
                  <View style={styles.segmentRow}>
                    <View
                      style={[
                        styles.segmentBadge,
                        {
                          backgroundColor:
                            client.segment === "vip"
                              ? colors.warningBg
                              : client.segment === "new"
                              ? colors.accentBg
                              : client.segment === "sleeping"
                              ? colors.dangerBg
                              : colors.surfaceAccent,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          {
                            color:
                              client.segment === "vip"
                                ? colors.warning
                                : client.segment === "new"
                                ? colors.accent
                                : client.segment === "sleeping"
                                ? colors.danger
                                : colors.textSecondary,
                          },
                        ]}
                      >
                        {client.segment === "vip"
                          ? "VIP"
                          : client.segment === "new"
                          ? "Новый"
                          : client.segment === "sleeping"
                          ? "Спящий"
                          : "Постоянный"}
                      </Text>
                    </View>
                    <Text style={styles.rfmLabel}>RFM: {client.rfm.total}/15</Text>
                  </View>
                </>
              )}
            </View>
          </GlassSection>
        </View>

        {otherPurchases.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              История покупок клиента ({otherPurchases.length})
            </Text>
            <GlassSection colors={colors} isDark={isDark}>
              <View style={styles.historyInner}>
                {otherPurchases.map((purchase, index) => (
                  <View
                    key={purchase.saleId}
                    style={[
                      styles.historyItem,
                      index < otherPurchases.length - 1 && styles.historyItemBorder,
                    ]}
                  >
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyEventTitle} numberOfLines={1}>
                        {purchase.eventTitle}
                      </Text>
                      <Text style={styles.historyDate}>
                        {formatDate(purchase.timestamp)} · {pluralTickets(purchase.quantity)}
                      </Text>
                    </View>
                    <Text style={styles.historyAmount}>
                      {formatFullCurrency(purchase.totalAmount)}
                    </Text>
                  </View>
                ))}
              </View>
            </GlassSection>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 100 },
    emptyState: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyText: { color: colors.textMuted, fontSize: 16 },
    header: {
      alignItems: "center",
      paddingVertical: 20,
      marginBottom: 16,
    },
    iconCircle: {
      width: 56,
      height: 56,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    eventTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "800" as const,
      textAlign: "center" as const,
      marginBottom: 6,
      paddingHorizontal: 16,
    },
    buyerName: {
      color: colors.textSecondary,
      fontSize: 15,
      fontWeight: "600" as const,
      marginBottom: 4,
    },
    timestamp: {
      color: colors.textMuted,
      fontSize: 13,
    },
    bigNumbers: { flexDirection: "row", gap: 10, marginBottom: 20 },
    bigNumberCard: { flex: 1 },
    bigNumberInner: { padding: 18 },
    bigNumberLabel: {
      color: colors.textMuted,
      fontSize: 12,
      marginBottom: 8,
      fontWeight: "600" as const,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
    },
    bigNumberValue: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "800" as const,
    },
    section: { marginBottom: 18 },
    sectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "700" as const,
      marginBottom: 12,
    },
    clientLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      marginBottom: 12,
    },
    clientLinkText: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.accent,
    },
    infoInner: { padding: 16, gap: 14 },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    infoLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
    infoLabel: { color: colors.textSecondary, fontSize: 13 },
    infoValue: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600" as const,
      flexShrink: 1,
      textAlign: "right" as const,
    },
    segmentRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 4,
    },
    segmentBadge: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 10,
    },
    segmentText: {
      fontSize: 12,
      fontWeight: "700" as const,
    },
    rfmLabel: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: "600" as const,
    },
    historyInner: { padding: 16 },
    historyItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
    },
    historyItemBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    historyLeft: { flex: 1, marginRight: 12 },
    historyEventTitle: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.text,
      marginBottom: 3,
    },
    historyDate: {
      fontSize: 12,
      color: colors.textMuted,
    },
    historyAmount: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: colors.accent,
    },
  });
}
