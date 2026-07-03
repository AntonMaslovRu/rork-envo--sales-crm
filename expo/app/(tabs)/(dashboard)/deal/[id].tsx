import React, { useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Platform, Modal, Pressable } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  MapPin,
  Calendar,
  Ticket,
  Banknote,
  Users,
  Clock,
  TrendingUp,
  ChevronDown,
  Check,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { useCrm } from "@/providers/CrmProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { EventStatus } from "@/types/crm";
import { formatFullCurrency, formatNumber, formatDate, timeAgo, calculateProfit } from "@/utils/format";

function statusConfig(status: EventStatus, colors: ReturnType<typeof useTheme>["colors"]) {
  switch (status) {
    case "upcoming":
      return { label: "Скоро", color: colors.blue, bg: colors.blueBg };
    case "ongoing":
      return { label: "Идёт сейчас", color: colors.accent, bg: colors.accentBg };
    case "completed":
      return { label: "Прошло", color: colors.textSecondary, bg: colors.surfaceAccent };
    case "cancelled":
      return { label: "Отменено", color: colors.danger, bg: colors.dangerBg };
  }
}

const MANUAL_STATUSES: { key: EventStatus; label: string }[] = [
  { key: "completed", label: "Прошло" },
  { key: "cancelled", label: "Отменено" },
];

function GlassSection({ children, colors, isDark, style }: { children: React.ReactNode; colors: ReturnType<typeof useTheme>["colors"]; isDark: boolean; style?: object }) {
  if (Platform.OS === "web") {
    return <View style={[{ backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.borderGlass }, style]}>{children}</View>;
  }
  return (
    <View style={[{ borderRadius: 20, overflow: "hidden", shadowColor: colors.glassShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 2 }, style]}>
      <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
      <View style={{ backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.25)", borderRadius: 20, borderWidth: 1, borderColor: colors.borderGlass }}>
        {children}
      </View>
    </View>
  );
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ticketEvents, updateEventDateOverride, updateEventStatusOverride, eventDateOverrides } = useCrm();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const event = useMemo(() => ticketEvents.find((e) => e.id === id), [ticketEvents, id]);
  const [manualDateText, setManualDateText] = useState<string>("");
  const [showStatusPicker, setShowStatusPicker] = useState<boolean>(false);

  const normalizeDateTimeInput = useCallback((raw: string): string | null => {
    const trimmed = raw.trim();
    const withT = trimmed.replace(" ", "T");
    const date = new Date(withT);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date.toISOString();
  }, []);

  const handleSaveManualDate = useCallback(() => {
    if (!event) {
      return;
    }
    const parsed = normalizeDateTimeInput(manualDateText);
    if (!parsed) {
      Alert.alert("Ошибка", "Введите дату в формате YYYY-MM-DD HH:mm");
      return;
    }
    updateEventDateOverride(event.id, parsed);
    setManualDateText("");
    Alert.alert("Сохранено", "Дата события обновлена вручную и больше не перезаписывается API");
  }, [manualDateText, normalizeDateTimeInput, updateEventDateOverride, event]);

  if (!event) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Мероприятие" }} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Мероприятие не найдено</Text>
        </View>
      </View>
    );
  }

  const status = statusConfig(event.status, colors);
  const fillPercent = Math.round((event.ticketsSold / event.ticketsTotal) * 100);
  const profit = calculateProfit(event.revenue);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Карточка события" }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.statusBadge, { backgroundColor: status.bg }]}
            onPress={() => {
              void Haptics.selectionAsync();
              setShowStatusPicker(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
            <ChevronDown size={12} color={status.color} />
          </TouchableOpacity>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.venue}>{event.venue}, {event.city}</Text>
        </View>

        <View style={styles.bigNumbers}>
          <GlassSection colors={colors} isDark={isDark} style={styles.bigNumberCard}>
            <View style={styles.bigNumberInner}>
              <Text style={styles.bigNumberLabel}>Выручка</Text>
              <Text style={styles.bigNumberValue}>{formatFullCurrency(event.revenue)}</Text>
            </View>
          </GlassSection>
          <GlassSection colors={colors} isDark={isDark} style={styles.bigNumberCard}>
            <View style={styles.bigNumberInner}>
              <Text style={styles.bigNumberLabel}>Прибыль</Text>
              <Text style={[styles.bigNumberValue, { color: colors.accent }]}>{formatFullCurrency(profit)}</Text>
            </View>
          </GlassSection>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Продажа билетов</Text>
          <GlassSection colors={colors} isDark={isDark}>
            <View style={styles.progressInner}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressSold}>
                  {formatNumber(event.ticketsSold)} из {formatNumber(event.ticketsTotal)}
                </Text>
                <Text style={[styles.progressPercent, { color: status.color }]}>
                  {fillPercent}%
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${fillPercent}%`,
                      backgroundColor: fillPercent > 80 ? colors.accent : colors.blue,
                    },
                  ]}
                />
              </View>
            </View>
          </GlassSection>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Детали</Text>
          <GlassSection colors={colors} isDark={isDark}>
            <View style={styles.infoInner}>
              <InfoRow icon={<Calendar size={16} color={colors.textSecondary} />} label="Дата" value={formatDate(event.date)} styles={styles} />
              <InfoRow icon={<MapPin size={16} color={colors.textSecondary} />} label="Площадка" value={event.venue} styles={styles} />
              <InfoRow icon={<MapPin size={16} color={colors.textSecondary} />} label="Город" value={event.city} styles={styles} />
              <InfoRow icon={<Ticket size={16} color={colors.textSecondary} />} label="Цена билета" value={formatFullCurrency(event.ticketPrice)} styles={styles} />
              <InfoRow icon={<Users size={16} color={colors.textSecondary} />} label="Вместимость" value={formatNumber(event.ticketsTotal)} styles={styles} />
              <InfoRow icon={<Clock size={16} color={colors.textSecondary} />} label="Обновлено" value={timeAgo(event.updatedAt)} styles={styles} />
            </View>
          </GlassSection>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Коррекция даты события</Text>
          <GlassSection colors={colors} isDark={isDark}>
            <View style={styles.infoInner}>
              <InfoRow icon={<Calendar size={16} color={colors.textSecondary} />} label="Текущая дата" value={formatDate(event.date)} styles={styles} />
              <InfoRow icon={<Clock size={16} color={eventDateOverrides[event.id] ? colors.accent : colors.textSecondary} />} label="Ручная фиксация" value={eventDateOverrides[event.id] ? "Активна" : "Нет"} styles={styles} />
              <View style={styles.editRow}>
                <TextInput
                  value={manualDateText}
                  onChangeText={setManualDateText}
                  style={styles.dateInput}
                  placeholder="YYYY-MM-DD HH:mm"
                  placeholderTextColor={colors.textMuted}
                  testID="manual-date-input"
                />
                <TouchableOpacity style={styles.saveDateBtn} onPress={handleSaveManualDate} testID="manual-date-save-btn">
                  <Text style={styles.saveDateBtnText}>Сохранить</Text>
                </TouchableOpacity>
              </View>
            </View>
          </GlassSection>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Финансы</Text>
          <GlassSection colors={colors} isDark={isDark}>
            <View style={styles.infoInner}>
              <InfoRow icon={<Banknote size={16} color={colors.textSecondary} />} label="Выручка" value={formatFullCurrency(event.revenue)} styles={styles} />
              <InfoRow icon={<TrendingUp size={16} color={colors.textSecondary} />} label="Сбор (6%)" value={`−${formatFullCurrency(Math.round(event.revenue * 0.06))}`} styles={styles} />
              <InfoRow icon={<TrendingUp size={16} color={colors.textSecondary} />} label="Налог (13%)" value={`−${formatFullCurrency(Math.round(event.revenue * 0.94 * 0.13))}`} styles={styles} />
              <InfoRow icon={<Banknote size={16} color={colors.accent} />} label="Прибыль" value={formatFullCurrency(profit)} styles={styles} />
            </View>
          </GlassSection>
        </View>
      </ScrollView>

      <Modal
        visible={showStatusPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowStatusPicker(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Статус события</Text>
            {MANUAL_STATUSES.map((s) => {
              const isActive = event.status === s.key;
              return (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.modalOption, isActive && styles.modalOptionActive]}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    updateEventStatusOverride(event.id, s.key);
                    setShowStatusPicker(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, isActive && styles.modalOptionTextActive]}>{s.label}</Text>
                  {isActive && <Check size={18} color={colors.accent} />}
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowStatusPicker(false)}
            >
              <Text style={styles.modalCancelText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  styles,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        {icon}
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
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
      paddingVertical: 24,
      marginBottom: 20,
    },
    statusBadge: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, marginBottom: 14 },
    statusText: { fontSize: 13, fontWeight: "700" as const },
    title: { color: colors.text, fontSize: 26, fontWeight: "800" as const, textAlign: "center" as const, marginBottom: 8 },
    venue: { color: colors.textSecondary, fontSize: 14, textAlign: "center" as const },
    bigNumbers: { flexDirection: "row", gap: 10, marginBottom: 20 },
    bigNumberCard: { flex: 1 },
    bigNumberInner: { padding: 18 },
    bigNumberLabel: { color: colors.textMuted, fontSize: 12, marginBottom: 8, fontWeight: "600" as const, textTransform: "uppercase" as const, letterSpacing: 0.5 },
    bigNumberValue: { color: colors.text, fontSize: 22, fontWeight: "800" as const },
    section: { marginBottom: 18 },
    sectionTitle: { color: colors.text, fontSize: 17, fontWeight: "700" as const, marginBottom: 12 },
    progressInner: { padding: 16 },
    progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
    progressSold: { color: colors.text, fontSize: 14, fontWeight: "600" as const },
    progressPercent: { fontSize: 14, fontWeight: "800" as const },
    progressBarBg: { height: 10, backgroundColor: colors.surfaceAccent, borderRadius: 999, overflow: "hidden" },
    progressBarFill: { height: 10, borderRadius: 999 },
    infoInner: { padding: 16, gap: 14 },
    infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
    infoLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
    infoLabel: { color: colors.textSecondary, fontSize: 13 },
    infoValue: { color: colors.text, fontSize: 13, fontWeight: "600" as const, flexShrink: 1, textAlign: "right" as const },
    editRow: { flexDirection: "row", gap: 10, marginTop: 4 },
    dateInput: { flex: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, backgroundColor: colors.surfaceAccent },
    saveDateBtn: { backgroundColor: colors.accent, borderRadius: 14, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
    saveDateBtnText: { color: "#FFFFFF", fontWeight: "700" as const },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      alignItems: "center",
      padding: 40,
    },
    modalContent: {
      backgroundColor: colors.background,
      borderRadius: 20,
      padding: 20,
      width: "100%",
      maxWidth: 320,
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: "700" as const,
      color: colors.text,
      textAlign: "center" as const,
      marginBottom: 16,
    },
    modalOption: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 6,
      backgroundColor: colors.surfaceAccent,
    },
    modalOptionActive: {
      backgroundColor: colors.accentBg,
    },
    modalOptionText: {
      fontSize: 15,
      fontWeight: "500" as const,
      color: colors.text,
    },
    modalOptionTextActive: {
      color: colors.accent,
      fontWeight: "600" as const,
    },
    modalCancel: {
      marginTop: 10,
      paddingVertical: 12,
      alignItems: "center" as const,
    },
    modalCancelText: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.textMuted,
    },
  });
}
