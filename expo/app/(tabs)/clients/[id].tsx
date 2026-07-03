import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Platform, Alert, Linking, Share } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Mail, Phone, MapPin, Ticket, Clock3, NotebookPen, Star, Download, Copy, Share2 } from "lucide-react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { useCrm } from "@/providers/CrmProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { ClientSegment } from "@/types/crm";
import { formatCurrency, formatNumber, formatShortDate } from "@/utils/format";

const SEGMENT_LABELS: Record<ClientSegment, string> = {
  vip: "VIP",
  new: "Новый",
  sleeping: "Спящий",
  regular: "Регулярный",
};

function GlassWrapper({ children, colors, isDark, style }: { children: React.ReactNode; colors: ReturnType<typeof useTheme>["colors"]; isDark: boolean; style?: object }) {
  if (Platform.OS === "web") {
    return <View style={[{ backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.borderGlass }, style]}>{children}</View>;
  }
  return (
    <View style={[{ borderRadius: 18, overflow: "hidden", shadowColor: colors.glassShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 2 }, style]}>
      <BlurView intensity={30} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
      <View style={{ backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.25)", borderRadius: 18, borderWidth: 1, borderColor: colors.borderGlass }}>
        {children}
      </View>
    </View>
  );
}

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { clients, updateClientNote, exportClientsToCsv } = useCrm();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [noteDraft, setNoteDraft] = useState<string>("");

  const decodedId = useMemo(() => (id ? decodeURIComponent(id) : ""), [id]);
  const client = useMemo(() => clients.find((item) => item.id === decodedId), [clients, decodedId]);

  useEffect(() => {
    setNoteDraft(client?.note ?? "");
  }, [client?.note]);

  const handleCall = useCallback(() => {
    if (!client || client.phone === "Не указан") {
      Alert.alert("Ошибка", "Номер телефона не указан");
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const phoneUrl = `tel:${client.phone.replace(/[^\d+]/g, "")}`;
    console.log("[Client] Opening phone:", phoneUrl);
    Linking.openURL(phoneUrl).catch(() => {
      Alert.alert("Ошибка", "Не удалось открыть набор номера");
    });
  }, [client]);

  const handleEmail = useCallback(() => {
    if (!client || client.mailbox === "Не указан") {
      Alert.alert("Ошибка", "Email не указан");
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const mailUrl = `mailto:${client.mailbox}`;
    console.log("[Client] Opening email:", mailUrl);
    Linking.openURL(mailUrl).catch(() => {
      Alert.alert("Ошибка", "Не удалось открыть почтовый клиент");
    });
  }, [client]);

  const handleCopy = useCallback(async () => {
    if (!client) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const contactText = [
      client.fullName,
      client.phone !== "Не указан" ? `Тел: ${client.phone}` : null,
      client.mailbox !== "Не указан" ? `Email: ${client.mailbox}` : null,
      client.postalAddress !== "Не указан" ? `Адрес: ${client.postalAddress}` : null,
    ].filter(Boolean).join("\n");

    try {
      await Clipboard.setStringAsync(contactText);
      Alert.alert("Скопировано", "Контактные данные скопированы в буфер обмена");
    } catch (error) {
      console.log("[Client] Copy failed:", error);
      Alert.alert("Ошибка", "Не удалось скопировать");
    }
  }, [client]);

  const handleShare = useCallback(async () => {
    if (!client) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const contactText = [
      client.fullName,
      client.phone !== "Не указан" ? `Тел: ${client.phone}` : null,
      client.mailbox !== "Не указан" ? `Email: ${client.mailbox}` : null,
      `Покупок: ${client.totalPurchases}`,
      `Сумма: ${formatCurrency(client.totalSpent)}`,
    ].filter(Boolean).join("\n");

    try {
      await Share.share({ message: contactText, title: client.fullName });
    } catch (error) {
      console.log("[Client] Share failed:", error);
    }
  }, [client]);

  if (!client) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Клиент" }} />
        <Text style={styles.emptyText}>Клиент не найден</Text>
      </View>
    );
  }

  const isDirty = noteDraft !== client.note;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: client.fullName }} />

      <FlatList
        data={client.purchases}
        keyExtractor={(item) => item.saleId}
        contentContainerStyle={styles.historyContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <GlassWrapper colors={colors} isDark={isDark} style={styles.contactCard}>
              <View style={styles.contactCardInner}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{client.fullName}</Text>
                  <View style={styles.segmentBadge}>
                    <Text style={styles.segmentText}>{SEGMENT_LABELS[client.segment]}</Text>
                  </View>
                </View>
                <View style={styles.metaRow}><Phone size={14} color={colors.textMuted} /><Text style={styles.metaText}>{client.phone}</Text></View>
                <View style={styles.metaRow}><Mail size={14} color={colors.textMuted} /><Text style={styles.metaText}>{client.mailbox}</Text></View>
                <View style={styles.metaRow}><MapPin size={14} color={colors.textMuted} /><Text style={styles.metaText}>{client.postalAddress}</Text></View>
                <View style={styles.metaRow}><Clock3 size={14} color={colors.textMuted} /><Text style={styles.metaText}>Последняя покупка {formatShortDate(client.lastPurchaseAt)}</Text></View>
              </View>
            </GlassWrapper>

            <View style={styles.quickActions}>
              <TouchableOpacity
                style={[styles.actionBtn, client.phone === "Не указан" && styles.actionBtnDisabled]}
                onPress={handleCall}
                activeOpacity={0.7}
                testID="client-action-call"
              >
                <View style={[styles.actionIconWrap, { backgroundColor: colors.accentBg }]}>
                  <Phone size={18} color={colors.accent} />
                </View>
                <Text style={styles.actionLabel}>Позвонить</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, client.mailbox === "Не указан" && styles.actionBtnDisabled]}
                onPress={handleEmail}
                activeOpacity={0.7}
                testID="client-action-email"
              >
                <View style={[styles.actionIconWrap, { backgroundColor: colors.blueBg }]}>
                  <Mail size={18} color={colors.blue} />
                </View>
                <Text style={styles.actionLabel}>Написать</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleCopy}
                activeOpacity={0.7}
                testID="client-action-copy"
              >
                <View style={[styles.actionIconWrap, { backgroundColor: colors.purpleBg }]}>
                  <Copy size={18} color={colors.purple} />
                </View>
                <Text style={styles.actionLabel}>Копировать</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleShare}
                activeOpacity={0.7}
                testID="client-action-share"
              >
                <View style={[styles.actionIconWrap, { backgroundColor: colors.warningBg }]}>
                  <Share2 size={18} color={colors.warning} />
                </View>
                <Text style={styles.actionLabel}>Поделиться</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Покупок</Text><Text style={styles.summaryValue}>{formatNumber(client.totalPurchases)}</Text></View>
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Билетов</Text><Text style={styles.summaryValue}>{formatNumber(client.totalTickets)}</Text></View>
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Сумма</Text><Text style={styles.summaryValue}>{formatCurrency(client.totalSpent)}</Text></View>
            </View>

            <View style={styles.summaryRowSecondary}>
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Город</Text><Text style={styles.summaryValue}>{client.city}</Text></View>
              <View style={styles.summaryItem}><Text style={styles.summaryLabel}>Первый заказ</Text><Text style={styles.summaryValue}>{formatShortDate(client.firstPurchaseAt)}</Text></View>
            </View>

            <GlassWrapper colors={colors} isDark={isDark} style={styles.rfmCard}>
              <View style={styles.rfmCardInner}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderLeft}>
                    <Star size={15} color={colors.accent} />
                    <Text style={styles.cardTitle}>RFM-скоринг</Text>
                  </View>
                  <Text style={styles.rfmTotal}>RFM {client.rfm.total}</Text>
                </View>
                <Text style={styles.rfmLabel}>{client.rfm.label}</Text>
                <View style={styles.rfmGrid}>
                  <View style={styles.rfmCell}><Text style={styles.rfmKey}>R</Text><Text style={styles.rfmValue}>{client.rfm.recency}</Text><Text style={styles.rfmHint}>Давность</Text></View>
                  <View style={styles.rfmCell}><Text style={styles.rfmKey}>F</Text><Text style={styles.rfmValue}>{client.rfm.frequency}</Text><Text style={styles.rfmHint}>Частота</Text></View>
                  <View style={styles.rfmCell}><Text style={styles.rfmKey}>M</Text><Text style={styles.rfmValue}>{client.rfm.monetary}</Text><Text style={styles.rfmHint}>Сумма</Text></View>
                </View>
              </View>
            </GlassWrapper>

            <GlassWrapper colors={colors} isDark={isDark} style={styles.notesCard}>
              <View style={styles.notesCardInner}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderLeft}>
                    <NotebookPen size={15} color={colors.accent} />
                    <Text style={styles.cardTitle}>Заметки менеджера</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.exportButton}
                    onPress={() => { void exportClientsToCsv([client]); }}
                    testID="client-export-csv"
                  >
                    <Download size={14} color="#FFFFFF" />
                    <Text style={styles.exportButtonText}>CSV</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  value={noteDraft}
                  onChangeText={setNoteDraft}
                  placeholder="Например: предпочитает VIP-ложу, звонить после 18:00"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={styles.notesInput}
                  testID="client-note-input"
                />
                <TouchableOpacity
                  style={[styles.saveButton, !isDirty && styles.saveButtonDisabled]}
                  onPress={() => updateClientNote(client.id, noteDraft.trim())}
                  disabled={!isDirty}
                  testID="client-note-save"
                >
                  <Text style={[styles.saveButtonText, !isDirty && styles.saveButtonTextDisabled]}>Сохранить заметку</Text>
                </TouchableOpacity>
              </View>
            </GlassWrapper>

            <Text style={styles.historyTitle}>История покупок</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.historyCard} testID={`purchase-history-${item.saleId}`}>
            <Text style={styles.eventTitle} numberOfLines={1}>{item.eventTitle}</Text>
            <View style={styles.historyMeta}><Ticket size={12} color={colors.textMuted} /><Text style={styles.historyMetaText}>{formatShortDate(item.eventDate)} · {item.quantity} шт.</Text></View>
            <View style={styles.historyFooter}><Text style={styles.historyDate}>{formatShortDate(item.timestamp)}</Text><Text style={styles.historyAmount}>{formatCurrency(item.totalAmount)}</Text></View>
          </View>
        )}
      />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"], _isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    emptyText: { marginTop: 100, textAlign: "center" as const, color: colors.textMuted },
    contactCard: { marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
    contactCardInner: { padding: 16, gap: 7 },
    nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4 },
    name: { color: colors.text, fontSize: 18, fontWeight: "800" as const, flex: 1 },
    segmentBadge: {
      backgroundColor: colors.accentBg,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    segmentText: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: "700" as const,
      textTransform: "uppercase" as const,
    },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 7 },
    metaText: { color: colors.textSecondary, fontSize: 13, flex: 1 },
    quickActions: {
      flexDirection: "row",
      marginHorizontal: 16,
      marginBottom: 10,
      gap: 8,
    },
    actionBtn: {
      flex: 1,
      alignItems: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      borderRadius: 16,
      paddingVertical: 14,
      gap: 8,
    },
    actionBtnDisabled: {
      opacity: 0.4,
    },
    actionIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    actionLabel: {
      fontSize: 11,
      fontWeight: "600" as const,
      color: colors.textSecondary,
    },
    summaryRow: { flexDirection: "row", marginHorizontal: 16, gap: 8 },
    summaryRowSecondary: { flexDirection: "row", marginHorizontal: 16, gap: 8, marginTop: 8 },
    summaryItem: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      borderRadius: 16,
      padding: 12,
    },
    summaryLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 4 },
    summaryValue: { color: colors.text, fontSize: 14, fontWeight: "800" as const },
    rfmCard: { marginHorizontal: 16, marginTop: 10 },
    rfmCardInner: { padding: 16 },
    cardHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    cardHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
    },
    cardTitle: { color: colors.text, fontSize: 15, fontWeight: "700" as const },
    rfmTotal: { color: colors.accent, fontSize: 14, fontWeight: "800" as const },
    rfmLabel: { color: colors.textSecondary, fontSize: 13, marginTop: 10, marginBottom: 12 },
    rfmGrid: { flexDirection: "row", gap: 8 },
    rfmCell: {
      flex: 1,
      backgroundColor: colors.surfaceAccent,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: "center",
    },
    rfmKey: { color: colors.textMuted, fontSize: 11, marginBottom: 4 },
    rfmValue: { color: colors.text, fontSize: 18, fontWeight: "800" as const },
    rfmHint: { color: colors.textSecondary, fontSize: 11, marginTop: 4 },
    notesCard: { marginHorizontal: 16, marginTop: 10 },
    notesCardInner: { padding: 16 },
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
    notesInput: {
      minHeight: 100,
      marginTop: 12,
      borderRadius: 14,
      backgroundColor: colors.surfaceAccent,
      color: colors.text,
      padding: 12,
      textAlignVertical: "top" as const,
      fontSize: 14,
    },
    saveButton: {
      marginTop: 12,
      borderRadius: 14,
      backgroundColor: colors.accent,
      alignItems: "center",
      paddingVertical: 13,
    },
    saveButtonDisabled: {
      backgroundColor: colors.surfaceAccent,
    },
    saveButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "700" as const,
    },
    saveButtonTextDisabled: {
      color: colors.textMuted,
    },
    historyTitle: {
      marginTop: 18,
      marginHorizontal: 16,
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: "700" as const,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
    },
    historyContent: { paddingBottom: 100 },
    historyCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      borderRadius: 16,
      padding: 14,
      marginHorizontal: 16,
      marginTop: 10,
    },
    eventTitle: { color: colors.text, fontSize: 14, fontWeight: "600" as const, marginBottom: 7 },
    historyMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 7 },
    historyMetaText: { color: colors.textSecondary, fontSize: 12 },
    historyFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    historyDate: { color: colors.textMuted, fontSize: 12 },
    historyAmount: { color: colors.accent, fontSize: 13, fontWeight: "700" as const },
  });
}
