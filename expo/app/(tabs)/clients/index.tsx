import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, PanResponder, Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Mail, Phone, MapPin, ChevronRight, ShoppingBag, SlidersHorizontal, RotateCcw, ChevronDown, Download, NotebookPen, Star } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { useCrm } from "@/providers/CrmProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { ClientProfile, ClientSegment } from "@/types/crm";
import { formatCurrency, formatFullCurrency, formatNumber } from "@/utils/format";

const SEGMENT_LABELS: Record<ClientSegment, string> = {
  vip: "VIP",
  new: "Новые",
  sleeping: "Спящие",
  regular: "Регулярные",
};

const MAX_SPENT_FILTER = 1000000;

const PERIOD_FILTERS = [
  { label: "За всё время", value: null },
  { label: "30 дней", value: 30 },
  { label: "90 дней", value: 90 },
  { label: "180 дней", value: 180 },
] as const;

const PURCHASE_FILTERS = [
  { label: "Любое число", value: 0 },
  { label: "от 2", value: 2 },
  { label: "от 5", value: 5 },
  { label: "от 10", value: 10 },
] as const;

export default function ClientsScreen() {
  const { filteredClients, clientFilters, updateClientFilters, resetClientFilters, clients, exportClientsToCsv } = useCrm();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const router = useRouter();
  const [filtersExpanded, setFiltersExpanded] = useState<boolean>(false);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (clientFilters.segment !== "all") count += 1;
    if (clientFilters.minSpent > 0) count += 1;
    if (clientFilters.periodDays !== null) count += 1;
    if (clientFilters.minPurchases > 0) count += 1;
    return count;
  }, [clientFilters]);

  const segmentStyle = useCallback((segment: ClientSegment) => {
    switch (segment) {
      case "vip":
        return { backgroundColor: colors.warningBg, textColor: colors.warning };
      case "new":
        return { backgroundColor: colors.accentBg, textColor: colors.accent };
      case "sleeping":
        return { backgroundColor: colors.dangerBg, textColor: colors.danger };
      case "regular":
        return { backgroundColor: colors.surfaceAccent, textColor: colors.textSecondary };
    }
  }, [colors]);

  const renderClient = useCallback(
    ({ item }: { item: ClientProfile }) => {
      const seg = segmentStyle(item.segment);
      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/clients/[id]",
              params: { id: encodeURIComponent(item.id) },
            })
          }
          activeOpacity={0.75}
          testID={`client-card-${item.id}`}
        >
          {Platform.OS !== "web" && (
            <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          )}
          <View style={styles.cardInner}>
            <View style={styles.headerRow}>
              <View style={styles.headerTextWrap}>
                <Text style={styles.name} numberOfLines={1}>{item.fullName}</Text>
                <View style={styles.badgesRow}>
                  <View style={[styles.segmentBadge, { backgroundColor: seg.backgroundColor }]}>
                    <Text style={[styles.segmentText, { color: seg.textColor }]}>{SEGMENT_LABELS[item.segment]}</Text>
                  </View>
                  <View style={styles.rfmBadge}>
                    <Star size={10} color={colors.textSecondary} />
                    <Text style={styles.rfmBadgeText}>RFM {item.rfm.total}</Text>
                  </View>
                </View>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </View>

            <View style={styles.contactRow}>
              <Phone size={12} color={colors.textMuted} />
              <Text style={styles.contactText} numberOfLines={1}>{item.phone}</Text>
            </View>
            <View style={styles.contactRow}>
              <Mail size={12} color={colors.textMuted} />
              <Text style={styles.contactText} numberOfLines={1}>{item.mailbox}</Text>
            </View>
            <View style={styles.contactRow}>
              <MapPin size={12} color={colors.textMuted} />
              <Text style={styles.contactText} numberOfLines={1}>{item.city}</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statsLeft}>
                <View style={styles.statPill}>
                  <ShoppingBag size={12} color={colors.textSecondary} />
                  <Text style={styles.statText}>{formatNumber(item.totalPurchases)} покупок</Text>
                </View>
                <Text style={styles.lastPurchaseText}>Последняя: {new Date(item.lastPurchaseAt).toLocaleDateString("ru-RU")}</Text>
                {item.note ? (
                  <View style={styles.notePreviewRow}>
                    <NotebookPen size={11} color={colors.textMuted} />
                    <Text style={styles.notePreviewText} numberOfLines={1}>{item.note}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.totalSpent}>{formatCurrency(item.totalSpent)}</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [router, styles, colors, isDark, segmentStyle]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Клиенты" }} />
      <FlatList
        data={filteredClients}
        keyExtractor={(item) => item.id}
        renderItem={renderClient}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        testID="clients-list"
        ListHeaderComponent={
          <View style={styles.filtersCard}>
            <View style={styles.filtersHeader}>
              <TouchableOpacity
                style={styles.filtersTitleButton}
                activeOpacity={0.75}
                onPress={() => setFiltersExpanded((current) => !current)}
                testID="clients-filters-toggle"
              >
                <View style={styles.filtersTitleRow}>
                  <SlidersHorizontal size={16} color={colors.text} />
                  <Text style={styles.filtersTitle}>Фильтры</Text>
                  {activeFiltersCount > 0 && (
                    <View style={styles.filtersCountBadge}>
                      <Text style={styles.filtersCount}>{activeFiltersCount}</Text>
                    </View>
                  )}
                </View>
                <ChevronDown size={16} color={colors.textSecondary} style={filtersExpanded ? styles.chevronExpanded : undefined} />
              </TouchableOpacity>
              <View style={styles.filtersActionsRow}>
                <TouchableOpacity style={styles.exportButton} onPress={() => { void exportClientsToCsv(); }} testID="clients-export-csv">
                  <Download size={14} color="#FFFFFF" />
                  <Text style={styles.exportButtonText}>CSV</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.resetButton} onPress={resetClientFilters} testID="clients-filter-reset">
                  <RotateCcw size={14} color={colors.textSecondary} />
                  <Text style={styles.resetText}>Сбросить</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.resultsText}>Показано {formatNumber(filteredClients.length)} из {formatNumber(clients.length)}</Text>

            {filtersExpanded ? (
              <>
                <Text style={styles.filterLabel}>Сегмент</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                  {[
                    { label: "Все", value: "all" },
                    { label: "VIP", value: "vip" },
                    { label: "Новые", value: "new" },
                    { label: "Спящие", value: "sleeping" },
                  ].map((option) => {
                    const isActive = clientFilters.segment === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.filterChip, isActive && styles.filterChipActive]}
                        onPress={() => updateClientFilters({ segment: option.value as ClientSegment | "all" })}
                        testID={`clients-segment-${option.value}`}
                      >
                        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{option.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={styles.filterLabel}>Сумма покупок от {formatFullCurrency(clientFilters.minSpent)}</Text>
                <AmountSlider value={clientFilters.minSpent} onChange={(nextValue) => updateClientFilters({ minSpent: nextValue })} colors={colors} />

                <Text style={styles.filterLabel}>Период активности</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                  {PERIOD_FILTERS.map((option) => {
                    const isActive = clientFilters.periodDays === option.value;
                    return (
                      <TouchableOpacity
                        key={option.label}
                        style={[styles.filterChip, isActive && styles.filterChipActive]}
                        onPress={() => updateClientFilters({ periodDays: option.value })}
                        testID={`clients-period-${option.value ?? "all"}`}
                      >
                        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{option.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={styles.filterLabel}>Число покупок</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                  {PURCHASE_FILTERS.map((option) => {
                    const isActive = clientFilters.minPurchases === option.value;
                    return (
                      <TouchableOpacity
                        key={option.label}
                        style={[styles.filterChip, isActive && styles.filterChipActive]}
                        onPress={() => updateClientFilters({ minPurchases: option.value })}
                        testID={`clients-purchases-${option.value}`}
                      >
                        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{option.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>По выбранным фильтрам клиентов не найдено</Text>}
      />
    </View>
  );
}

function AmountSlider({ value, onChange, colors }: { value: number; onChange: (value: number) => void; colors: ReturnType<typeof useTheme>["colors"] }) {
  const [trackWidth, setTrackWidth] = useState<number>(0);

  const updateValueFromPosition = useCallback((positionX: number) => {
    if (trackWidth <= 0) return;
    const clampedX = Math.max(0, Math.min(trackWidth, positionX));
    const ratio = clampedX / trackWidth;
    const nextValue = Math.round((ratio * MAX_SPENT_FILTER) / 10000) * 10000;
    onChange(nextValue);
  }, [onChange, trackWidth]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      updateValueFromPosition(event.nativeEvent.locationX);
    },
    onPanResponderMove: (event) => {
      updateValueFromPosition(event.nativeEvent.locationX);
    },
  }), [updateValueFromPosition]);

  const thumbPosition = trackWidth > 0 ? (value / MAX_SPENT_FILTER) * trackWidth : 0;

  const sliderStyles = useMemo(() => StyleSheet.create({
    wrap: { marginBottom: 8 },
    track: {
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surfaceAccent,
      justifyContent: "center",
      overflow: "hidden" as const,
    },
    fill: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: colors.accentBg,
    },
    thumb: {
      position: "absolute",
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.accent,
      top: 4,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    labels: {
      marginTop: 8,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    label: {
      color: colors.textMuted,
      fontSize: 11,
    },
  }), [colors]);

  return (
    <View style={sliderStyles.wrap}>
      <View
        style={sliderStyles.track}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
        testID="clients-spent-slider"
      >
        <View style={[sliderStyles.fill, { width: thumbPosition }]} />
        <View style={[sliderStyles.thumb, { left: Math.max(0, thumbPosition - 13) }]} />
      </View>
      <View style={sliderStyles.labels}>
        <Text style={sliderStyles.label}>0 ₽</Text>
        <Text style={sliderStyles.label}>1 млн ₽</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"], isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      padding: 16,
      paddingBottom: 100,
      gap: 10,
    },
    filtersCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      borderRadius: 20,
      padding: 16,
      marginBottom: 14,
      shadowColor: colors.glassShadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 2,
    },
    filtersHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    filtersTitleButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    filtersTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    filtersTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700" as const,
    },
    filtersCountBadge: {
      minWidth: 20,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    filtersCount: {
      color: "#FFFFFF",
      fontSize: 11,
      fontWeight: "700" as const,
      textAlign: "center" as const,
    },
    filtersActionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    exportButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: colors.accent,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
    },
    exportButtonText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "700" as const,
    },
    resetButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    resetText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "600" as const,
    },
    filterLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "600" as const,
      marginBottom: 8,
      marginTop: 6,
    },
    chipsRow: {
      gap: 8,
      paddingBottom: 10,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 14,
      backgroundColor: colors.surfaceAccent,
    },
    filterChipActive: {
      backgroundColor: colors.accent,
    },
    filterChipText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "600" as const,
    },
    filterChipTextActive: {
      color: "#FFFFFF",
    },
    chevronExpanded: {
      transform: [{ rotate: "180deg" }],
    },
    resultsText: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 10,
    },
    card: {
      borderRadius: 18,
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
      padding: 14,
      backgroundColor: Platform.OS === "web" ? "transparent" : (isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.25)"),
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    headerTextWrap: {
      flex: 1,
      marginRight: 10,
    },
    name: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
      fontWeight: "700" as const,
      marginRight: 10,
    },
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 6,
    },
    contactText: {
      color: colors.textSecondary,
      fontSize: 13,
      flex: 1,
    },
    badgesRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 8,
      flexWrap: "wrap" as const,
    },
    segmentBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    rfmBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      backgroundColor: colors.surfaceAccent,
    },
    rfmBadgeText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: "700" as const,
    },
    segmentText: {
      fontSize: 11,
      fontWeight: "700" as const,
      textTransform: "uppercase" as const,
    },
    statsRow: {
      marginTop: 8,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    statsLeft: {
      flex: 1,
      marginRight: 12,
    },
    statPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    statText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "600" as const,
    },
    totalSpent: {
      color: colors.accent,
      fontSize: 15,
      fontWeight: "800" as const,
    },
    lastPurchaseText: {
      marginTop: 6,
      color: colors.textMuted,
      fontSize: 11,
    },
    notePreviewRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginTop: 6,
    },
    notePreviewText: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: 11,
    },
    emptyText: {
      textAlign: "center" as const,
      color: colors.textMuted,
      marginTop: 80,
    },
  });
}
