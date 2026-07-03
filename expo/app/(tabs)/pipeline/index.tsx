import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Animated as RNAnimated,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  List,
  CalendarDays,
  Trophy,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  Ticket,
  Pencil,
  Merge,
  Unlink,
  Trash2,
  ArrowRightLeft,
  X,
  Check,
  FolderOpen,
  MoreHorizontal,
} from "lucide-react-native";
import { useCrm } from "@/providers/CrmProvider";
import { useTheme } from "@/providers/ThemeProvider";
import EventCard from "@/components/EventCard";
import { TicketEvent, EventStatus } from "@/types/crm";
import { formatCurrency, formatFullCurrency, formatNumber } from "@/utils/format";

type ViewMode = "list" | "calendar" | "top";
type StatusFilter = "all" | EventStatus;
type TopMetric = "revenue" | "occupancy" | "avgCheck";

const statusFilters: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "upcoming", label: "Скоро" },
  { key: "ongoing", label: "Идёт" },
  { key: "completed", label: "Прошло" },
  { key: "cancelled", label: "Отменено" },
];

const viewModes: { key: ViewMode; label: string; icon: typeof List }[] = [
  { key: "list", label: "Список", icon: List },
  { key: "calendar", label: "Календарь", icon: CalendarDays },
  { key: "top", label: "Топ", icon: Trophy },
];

const topMetrics: { key: TopMetric; label: string }[] = [
  { key: "revenue", label: "Выручка" },
  { key: "occupancy", label: "Заполняемость" },
  { key: "avgCheck", label: "Ср. чек" },
];

const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

interface CalendarDay {
  day: number;
  isCurrentMonth: boolean;
}

function getCalendarDays(year: number, month: number): CalendarDay[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const prevMonthDays = new Date(year, month, 0).getDate();
  const days: CalendarDay[] = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    days.push({ day: prevMonthDays - i, isCurrentMonth: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, isCurrentMonth: true });
  }
  let nextDay = 1;
  while (days.length % 7 !== 0) {
    days.push({ day: nextDay++, isCurrentMonth: false });
  }
  return days;
}

function getEventsForDate(events: TicketEvent[], year: number, month: number, day: number): TicketEvent[] {
  return events.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  });
}

function getMetricValue(event: TicketEvent, metric: TopMetric): number {
  switch (metric) {
    case "revenue":
      return event.revenue;
    case "occupancy":
      return event.ticketsTotal > 0 ? (event.ticketsSold / event.ticketsTotal) * 100 : 0;
    case "avgCheck":
      return event.ticketsSold > 0 ? event.revenue / event.ticketsSold : 0;
  }
}

function formatMetricValue(value: number, metric: TopMetric): string {
  switch (metric) {
    case "revenue":
      return formatCurrency(value);
    case "occupancy":
      return `${Math.round(value)}%`;
    case "avgCheck":
      return formatFullCurrency(Math.round(value));
  }
}

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

function tokenize(name: string): string[] {
  return name.toLowerCase().replace(/[^a-zа-яё0-9\s]/gi, "").split(/\s+/).filter((t) => t.length > 1);
}

function tokenSimilarity(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let common = 0;
  setA.forEach((t) => { if (setB.has(t)) common++; });
  const union = new Set([...setA, ...setB]).size;
  return union > 0 ? common / union : 0;
}

function deriveGroupName(titles: string[]): string {
  if (titles.length === 0) return "";
  if (titles.length === 1) return titles[0];
  const tokenSets = titles.map(tokenize);
  const first = tokenSets[0];
  const commonTokens = first.filter((token) =>
    tokenSets.every((ts) => ts.includes(token))
  );
  if (commonTokens.length >= 2) {
    return commonTokens.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(" ");
  }
  const shortest = titles.reduce((a, b) => (a.length <= b.length ? a : b));
  const words = shortest.split(/\s+/);
  if (words.length > 2) {
    return words.slice(0, Math.ceil(words.length * 0.6)).join(" ");
  }
  return shortest;
}

interface EventGroup {
  id: string;
  name: string;
  events: TicketEvent[];
  totalRevenue: number;
  totalTicketsSold: number;
  totalTicketsTotal: number;
  avgCheck: number;
  occupancy: number;
  isManual?: boolean;
}

const SOLO_MARKER = "__solo__";

function groupEventsBySimilarity(
  events: TicketEvent[],
  metric: TopMetric,
  manualAssignments: Record<string, string>,
  customNames: Record<string, string>,
): EventGroup[] {
  const groups: EventGroup[] = [];
  const assigned = new Set<string>();
  const soloEventIds = new Set<string>();

  const manualGroups = new Map<string, TicketEvent[]>();
  for (const event of events) {
    const groupId = manualAssignments[event.id];
    if (groupId === SOLO_MARKER) {
      soloEventIds.add(event.id);
      continue;
    }
    if (groupId) {
      assigned.add(event.id);
      if (!manualGroups.has(groupId)) manualGroups.set(groupId, []);
      manualGroups.get(groupId)!.push(event);
    }
  }

  for (const [groupId, groupEvents] of manualGroups.entries()) {
    const totalRevenue = groupEvents.reduce((s, e) => s + e.revenue, 0);
    const totalTicketsSold = groupEvents.reduce((s, e) => s + e.ticketsSold, 0);
    const totalTicketsTotal = groupEvents.reduce((s, e) => s + e.ticketsTotal, 0);

    groups.push({
      id: groupId,
      name: customNames[groupId] ?? deriveGroupName(groupEvents.map((e) => e.title)),
      events: groupEvents.sort((a, b) => getMetricValue(b, metric) - getMetricValue(a, metric)),
      totalRevenue,
      totalTicketsSold,
      totalTicketsTotal,
      avgCheck: totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0,
      occupancy: totalTicketsTotal > 0 ? (totalTicketsSold / totalTicketsTotal) * 100 : 0,
      isManual: true,
    });
  }

  for (const soloId of soloEventIds) {
    const soloEvent = events.find((e) => e.id === soloId);
    if (soloEvent) {
      assigned.add(soloId);
      groups.push({
        id: soloId,
        name: soloEvent.title,
        events: [soloEvent],
        totalRevenue: soloEvent.revenue,
        totalTicketsSold: soloEvent.ticketsSold,
        totalTicketsTotal: soloEvent.ticketsTotal,
        avgCheck: soloEvent.ticketsSold > 0 ? soloEvent.revenue / soloEvent.ticketsSold : 0,
        occupancy: soloEvent.ticketsTotal > 0 ? (soloEvent.ticketsSold / soloEvent.ticketsTotal) * 100 : 0,
      });
    }
  }

  const sorted = [...events].sort((a, b) => getMetricValue(b, metric) - getMetricValue(a, metric));

  for (const event of sorted) {
    if (assigned.has(event.id)) continue;

    const similar = sorted.filter(
      (other) => !assigned.has(other.id) && other.id !== event.id && !soloEventIds.has(other.id) && tokenSimilarity(event.title, other.title) >= 0.5
    );

    const groupEvents = [event, ...similar];
    groupEvents.forEach((e) => assigned.add(e.id));

    const totalRevenue = groupEvents.reduce((s, e) => s + e.revenue, 0);
    const totalTicketsSold = groupEvents.reduce((s, e) => s + e.ticketsSold, 0);
    const totalTicketsTotal = groupEvents.reduce((s, e) => s + e.ticketsTotal, 0);

    const autoId = groupEvents.map((e) => e.id).sort().join("-");
    groups.push({
      id: autoId,
      name: customNames[autoId] ?? (groupEvents.length > 1 ? deriveGroupName(groupEvents.map((e) => e.title)) : event.title),
      events: groupEvents.sort((a, b) => getMetricValue(b, metric) - getMetricValue(a, metric)),
      totalRevenue,
      totalTicketsSold,
      totalTicketsTotal,
      avgCheck: totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0,
      occupancy: totalTicketsTotal > 0 ? (totalTicketsSold / totalTicketsTotal) * 100 : 0,
    });
  }

  return groups.sort((a, b) => {
    switch (metric) {
      case "revenue": return b.totalRevenue - a.totalRevenue;
      case "occupancy": return b.occupancy - a.occupancy;
      case "avgCheck": return b.avgCheck - a.avgCheck;
    }
  });
}

function getGroupMetricValue(group: EventGroup, metric: TopMetric): number {
  switch (metric) {
    case "revenue": return group.totalRevenue;
    case "occupancy": return group.occupancy;
    case "avgCheck": return group.avgCheck;
  }
}

type ModalType = "none" | "rename" | "merge" | "move" | "groupActions";

interface ModalState {
  type: ModalType;
  groupId: string;
  groupName: string;
  eventId?: string;
}

const EMPTY_MODAL: ModalState = { type: "none", groupId: "", groupName: "" };

export default function EventsScreen() {
  const {
    ticketEvents, isRefreshing, refreshAll,
    eventGroupAssignments, eventGroupNames,
    updateEventGroupAssignment, updateEventGroupAssignmentsBatch,
    updateEventGroupName, removeEventGroupName,
  } = useCrm();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("all");
  const [topMetric, setTopMetric] = useState<TopMetric>("revenue");
  const [calMonth, setCalMonth] = useState<number>(new Date().getMonth());
  const [calYear, setCalYear] = useState<number>(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [modalState, setModalState] = useState<ModalState>(EMPTY_MODAL);
  const [renameText, setRenameText] = useState<string>("");
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;

  const filteredEvents = useMemo(() => {
    if (activeStatus === "all") return ticketEvents;
    return ticketEvents.filter((e) => e.status === activeStatus);
  }, [ticketEvents, activeStatus]);

  const totalRevenue = useMemo(
    () => filteredEvents.reduce((acc, e) => acc + e.revenue, 0),
    [filteredEvents]
  );

  const topGroups = useMemo(() => {
    return groupEventsBySimilarity(ticketEvents, topMetric, eventGroupAssignments, eventGroupNames);
  }, [ticketEvents, topMetric, eventGroupAssignments, eventGroupNames]);

  const listGroups = useMemo(() => {
    const eventsToGroup = filteredEvents;
    return groupEventsBySimilarity(eventsToGroup, "revenue", eventGroupAssignments, eventGroupNames);
  }, [filteredEvents, eventGroupAssignments, eventGroupNames]);

  const toggleGroup = useCallback((groupId: string) => {
    void Haptics.selectionAsync();
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const calendarDays = useMemo(() => getCalendarDays(calYear, calMonth), [calYear, calMonth]);

  const eventDatesMap = useMemo(() => {
    const map = new Map<number, TicketEvent[]>();
    ticketEvents.forEach((e) => {
      const d = new Date(e.date);
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(e);
      }
    });
    return map;
  }, [ticketEvents, calYear, calMonth]);

  const selectedDayEvents = useMemo(() => {
    if (selectedDay === null) return [];
    return getEventsForDate(ticketEvents, calYear, calMonth, selectedDay);
  }, [ticketEvents, calYear, calMonth, selectedDay]);

  const handleRefresh = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refreshAll();
  }, [refreshAll]);

  const handleStatusPress = useCallback((key: StatusFilter) => {
    void Haptics.selectionAsync();
    setActiveStatus(key);
  }, []);

  const handleViewModePress = useCallback((key: ViewMode) => {
    void Haptics.selectionAsync();
    setViewMode(key);
    if (key === "calendar") setSelectedDay(null);
  }, []);

  const handlePrevMonth = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDay(null);
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  }, [calMonth]);

  const handleNextMonth = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDay(null);
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  }, [calMonth]);

  const navigateToEvent = useCallback(
    (eventId: string) => {
      router.push({
        pathname: "/(tabs)/pipeline/deal/[id]",
        params: { id: eventId },
      });
    },
    [router]
  );

  const openModal = useCallback((type: ModalType, groupId: string, groupName: string, eventId?: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setModalState({ type, groupId, groupName, eventId });
    if (type === "rename") {
      setRenameText(groupName);
    }
    RNAnimated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const closeModal = useCallback(() => {
    RNAnimated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setModalState(EMPTY_MODAL);
      setRenameText("");
    });
  }, [fadeAnim]);

  const handleRename = useCallback(() => {
    if (!renameText.trim()) return;
    updateEventGroupName(modalState.groupId, renameText.trim());
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeModal();
  }, [renameText, modalState.groupId, updateEventGroupName, closeModal]);

  const handleMergeInto = useCallback((targetGroupId: string, targetGroup: EventGroup) => {
    const sourceGroup = (viewMode === "top" ? topGroups : listGroups).find((g) => g.id === modalState.groupId);
    if (!sourceGroup) return;

    const assignments: Record<string, string> = {};
    const resolvedTargetId = targetGroup.isManual ? targetGroupId : `manual-${Date.now()}`;

    if (!targetGroup.isManual) {
      targetGroup.events.forEach((e) => {
        assignments[e.id] = resolvedTargetId;
      });
    }

    sourceGroup.events.forEach((e) => {
      assignments[e.id] = targetGroup.isManual ? targetGroupId : resolvedTargetId;
    });

    updateEventGroupAssignmentsBatch(assignments);

    if (!eventGroupNames[resolvedTargetId]) {
      updateEventGroupName(resolvedTargetId, targetGroup.name);
    }

    if (sourceGroup.isManual) {
      const cleanAssignments: Record<string, string> = {};
      sourceGroup.events.forEach((e) => {
        cleanAssignments[e.id] = targetGroup.isManual ? targetGroupId : resolvedTargetId;
      });
      updateEventGroupAssignmentsBatch(cleanAssignments);
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeModal();
  }, [modalState.groupId, viewMode, topGroups, listGroups, updateEventGroupAssignmentsBatch, updateEventGroupName, eventGroupNames, closeModal]);

  const handleRemoveFromGroup = useCallback((eventId: string) => {
    updateEventGroupAssignment(eventId, SOLO_MARKER);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeModal();
  }, [updateEventGroupAssignment, closeModal]);

  const handleDissolveGroup = useCallback(() => {
    const groups = viewMode === "top" ? topGroups : listGroups;
    const group = groups.find((g) => g.id === modalState.groupId);
    if (!group) return;

    Alert.alert(
      "Расформировать группу",
      `Все ${group.events.length} событий станут отдельными. Продолжить?`,
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Расформировать",
          style: "destructive",
          onPress: () => {
            const assignments: Record<string, string> = {};
            group.events.forEach((e) => {
              assignments[e.id] = "";
            });
            updateEventGroupAssignmentsBatch(assignments);
            removeEventGroupName(modalState.groupId);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            closeModal();
          },
        },
      ]
    );
  }, [modalState.groupId, viewMode, topGroups, listGroups, updateEventGroupAssignmentsBatch, removeEventGroupName, closeModal]);

  const handleMoveEvent = useCallback((eventId: string, targetGroupId: string, targetGroup: EventGroup) => {
    const resolvedId = targetGroup.isManual ? targetGroupId : `manual-${Date.now()}`;

    if (!targetGroup.isManual) {
      const assignments: Record<string, string> = {};
      targetGroup.events.forEach((e) => {
        assignments[e.id] = resolvedId;
      });
      assignments[eventId] = resolvedId;
      updateEventGroupAssignmentsBatch(assignments);
      if (!eventGroupNames[resolvedId]) {
        updateEventGroupName(resolvedId, targetGroup.name);
      }
    } else {
      updateEventGroupAssignment(eventId, resolvedId);
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeModal();
  }, [updateEventGroupAssignment, updateEventGroupAssignmentsBatch, updateEventGroupName, eventGroupNames, closeModal]);

  const currentGroups = viewMode === "top" ? topGroups : listGroups;

  const today = new Date();
  const isToday = (day: number) =>
    calYear === today.getFullYear() && calMonth === today.getMonth() && day === today.getDate();

  const renderGroupCard = useCallback((group: EventGroup, groupIndex: number, isTopView: boolean) => {
    const isGroup = group.events.length > 1;
    const isExpanded = expandedGroups.has(group.id);

    if (isTopView) {
      const groupMetric = getGroupMetricValue(group, topMetric);
      const maxVal = topGroups.length > 0 ? getGroupMetricValue(topGroups[0], topMetric) : 1;
      const barWidth = maxVal > 0 ? Math.max(6, (groupMetric / maxVal) * 100) : 0;
      const isMedal = groupIndex < 3;

      return (
        <View key={group.id} style={styles.topGroupWrap}>
          <TouchableOpacity
            style={styles.topCard}
            onPress={() => isGroup ? toggleGroup(group.id) : navigateToEvent(group.events[0].id)}
            onLongPress={() => isGroup ? openModal("groupActions", group.id, group.name) : undefined}
            activeOpacity={0.7}
            testID={`top-group-${groupIndex}`}
          >
            <View style={styles.topRankWrap}>
              {isMedal ? (
                <Text style={[styles.topRankMedal, { color: MEDAL_COLORS[groupIndex] }]}>
                  {groupIndex + 1}
                </Text>
              ) : (
                <Text style={styles.topRankText}>{groupIndex + 1}</Text>
              )}
            </View>
            <View style={styles.topCardContent}>
              <View style={styles.topCardTitleRow}>
                <Text style={styles.topCardTitle} numberOfLines={1}>{group.name}</Text>
                {isGroup && (
                  <View style={styles.topGroupControls}>
                    <TouchableOpacity
                      style={styles.groupActionMini}
                      onPress={() => openModal("groupActions", group.id, group.name)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <MoreHorizontal size={14} color={colors.textMuted} />
                    </TouchableOpacity>
                    <View style={styles.topGroupBadge}>
                      <Text style={styles.topGroupBadgeText}>{group.events.length}</Text>
                      {isExpanded ? (
                        <ChevronUp size={10} color={colors.accent} />
                      ) : (
                        <ChevronDown size={10} color={colors.accent} />
                      )}
                    </View>
                  </View>
                )}
              </View>
              <View style={styles.topBarBg}>
                <View
                  style={[
                    styles.topBarFill,
                    {
                      width: `${barWidth}%`,
                      backgroundColor: isMedal ? MEDAL_COLORS[groupIndex] : colors.accent,
                    },
                  ]}
                />
              </View>
            </View>
            <View style={styles.topValueWrap}>
              <Text style={[styles.topValue, isMedal && { color: MEDAL_COLORS[groupIndex] }]}>
                {formatMetricValue(groupMetric, topMetric)}
              </Text>
              <View style={styles.topSubRow}>
                <Ticket size={10} color={colors.textMuted} />
                <Text style={styles.topSubText}>{formatNumber(group.totalTicketsSold)}</Text>
              </View>
            </View>
          </TouchableOpacity>

          {isGroup && isExpanded && (
            <View style={styles.topSubList}>
              {group.events.map((event) => {
                const evMetric = getMetricValue(event, topMetric);
                return (
                  <TouchableOpacity
                    key={event.id}
                    style={styles.topSubCard}
                    onPress={() => navigateToEvent(event.id)}
                    onLongPress={() => openModal("move", group.id, group.name, event.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.topSubCardLeft}>
                      <Text style={styles.topSubCardTitle} numberOfLines={1}>{event.title}</Text>
                      {event.venue ? (
                        <View style={styles.topSubCardMeta}>
                          <MapPin size={9} color={colors.textMuted} />
                          <Text style={styles.topSubCardMetaText}>{event.venue}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.subCardActions}>
                      <Text style={styles.topSubCardValue}>{formatMetricValue(evMetric, topMetric)}</Text>
                      <TouchableOpacity
                        style={styles.subCardActionBtn}
                        onPress={() => openModal("move", group.id, group.name, event.id)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <ArrowRightLeft size={12} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      );
    }

    if (!isGroup) {
      return (
        <View key={group.id}>
          <EventCard event={group.events[0]} onPress={() => navigateToEvent(group.events[0].id)} />
        </View>
      );
    }

    return (
      <View key={group.id} style={styles.listGroupWrap}>
        <TouchableOpacity
          style={styles.listGroupHeader}
          onPress={() => toggleGroup(group.id)}
          onLongPress={() => openModal("groupActions", group.id, group.name)}
          activeOpacity={0.7}
        >
          <View style={styles.listGroupIcon}>
            <FolderOpen size={16} color={colors.accent} />
          </View>
          <View style={styles.listGroupHeaderContent}>
            <Text style={styles.listGroupTitle} numberOfLines={1}>{group.name}</Text>
            <Text style={styles.listGroupMeta}>
              {group.events.length} событ. · {formatCurrency(group.totalRevenue)}
            </Text>
          </View>
          <View style={styles.listGroupRight}>
            <TouchableOpacity
              style={styles.groupActionMini}
              onPress={() => openModal("groupActions", group.id, group.name)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MoreHorizontal size={14} color={colors.textMuted} />
            </TouchableOpacity>
            <View style={styles.listGroupBadge}>
              <Text style={styles.listGroupBadgeText}>{group.events.length}</Text>
              {isExpanded ? (
                <ChevronUp size={12} color={colors.accent} />
              ) : (
                <ChevronDown size={12} color={colors.accent} />
              )}
            </View>
          </View>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.listGroupEvents}>
            {group.events.map((event) => (
              <View key={event.id} style={styles.listGroupEventRow}>
                <View style={styles.listGroupEventMain}>
                  <EventCard event={event} onPress={() => navigateToEvent(event.id)} />
                </View>
                <TouchableOpacity
                  style={styles.listGroupEventAction}
                  onPress={() => openModal("move", group.id, group.name, event.id)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <ArrowRightLeft size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }, [expandedGroups, topMetric, topGroups, styles, colors, toggleGroup, navigateToEvent, openModal]);

  const renderGroupActionsModal = () => {
    if (modalState.type !== "groupActions") return null;
    const group = currentGroups.find((g) => g.id === modalState.groupId);
    if (!group) return null;

    return (
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle} numberOfLines={1}>{group.name}</Text>
        <Text style={styles.modalSubtitle}>{group.events.length} событий</Text>

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={styles.modalActionRow}
            onPress={() => {
              setModalState({ ...modalState, type: "rename" });
              setRenameText(group.name);
            }}
          >
            <View style={[styles.modalActionIcon, { backgroundColor: colors.accentBg }]}>
              <Pencil size={18} color={colors.accent} />
            </View>
            <Text style={styles.modalActionText}>Переименовать</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalActionRow}
            onPress={() => setModalState({ ...modalState, type: "merge" })}
          >
            <View style={[styles.modalActionIcon, { backgroundColor: colors.purpleBg }]}>
              <Merge size={18} color={colors.purple} />
            </View>
            <Text style={styles.modalActionText}>Объединить с другой группой</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalActionRow}
            onPress={handleDissolveGroup}
          >
            <View style={[styles.modalActionIcon, { backgroundColor: colors.dangerBg }]}>
              <Unlink size={18} color={colors.danger} />
            </View>
            <Text style={[styles.modalActionText, { color: colors.danger }]}>Расформировать группу</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renameInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (modalState.type === "rename") {
      const timer = setTimeout(() => {
        renameInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [modalState.type]);

  const renderRenameModal = () => {
    if (modalState.type !== "rename") return null;

    return (
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>Переименовать группу</Text>
        <View style={styles.modalInputWrap}>
          <TextInput
            ref={renameInputRef}
            style={styles.modalInput}
            value={renameText}
            onChangeText={setRenameText}
            placeholder="Название группы"
            placeholderTextColor={colors.textMuted}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            onSubmitEditing={handleRename}
            testID="rename-input"
          />
        </View>
        <View style={styles.modalButtonRow}>
          <TouchableOpacity style={styles.modalBtnCancel} onPress={closeModal}>
            <Text style={styles.modalBtnCancelText}>Отмена</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalBtnConfirm, !renameText.trim() && styles.modalBtnDisabled]}
            onPress={handleRename}
            disabled={!renameText.trim()}
          >
            <Check size={16} color="#FFFFFF" />
            <Text style={styles.modalBtnConfirmText}>Сохранить</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMergeModal = () => {
    if (modalState.type !== "merge") return null;
    const otherGroups = currentGroups.filter((g) => g.id !== modalState.groupId && g.events.length > 0);

    return (
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>Объединить с группой</Text>
        <Text style={styles.modalSubtitle}>Выберите группу для объединения</Text>
        <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
          {otherGroups.map((g) => (
            <TouchableOpacity
              key={g.id}
              style={styles.modalListItem}
              onPress={() => handleMergeInto(g.id, g)}
            >
              <View style={styles.modalListItemContent}>
                <Text style={styles.modalListItemTitle} numberOfLines={1}>{g.name}</Text>
                <Text style={styles.modalListItemMeta}>
                  {g.events.length} событ. · {formatCurrency(g.totalRevenue)}
                </Text>
              </View>
              <Merge size={16} color={colors.accent} />
            </TouchableOpacity>
          ))}
          {otherGroups.length === 0 && (
            <View style={styles.modalEmptyList}>
              <Text style={styles.modalEmptyText}>Нет других групп для объединения</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderMoveModal = () => {
    if (modalState.type !== "move" || !modalState.eventId) return null;
    const event = ticketEvents.find((e) => e.id === modalState.eventId);
    if (!event) return null;

    const otherGroups = currentGroups.filter((g) => g.id !== modalState.groupId);

    return (
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle} numberOfLines={1}>{event.title}</Text>
        <Text style={styles.modalSubtitle}>Переместить или убрать из группы</Text>

        <TouchableOpacity
          style={styles.modalActionRow}
          onPress={() => handleRemoveFromGroup(event.id)}
        >
          <View style={[styles.modalActionIcon, { backgroundColor: colors.warningBg }]}>
            <Trash2 size={18} color={colors.warning} />
          </View>
          <Text style={styles.modalActionText}>Убрать из группы (сделать отдельным)</Text>
        </TouchableOpacity>

        {otherGroups.length > 0 && (
          <>
            <Text style={styles.modalSectionLabel}>Перенести в группу:</Text>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {otherGroups.map((g) => (
                <TouchableOpacity
                  key={g.id}
                  style={styles.modalListItem}
                  onPress={() => handleMoveEvent(event.id, g.id, g)}
                >
                  <View style={styles.modalListItemContent}>
                    <Text style={styles.modalListItemTitle} numberOfLines={1}>{g.name}</Text>
                    <Text style={styles.modalListItemMeta}>
                      {g.events.length} событ.
                    </Text>
                  </View>
                  <ArrowRightLeft size={16} color={colors.accent} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "События" }} />

      <View style={styles.viewSwitcher}>
        {viewModes.map((mode) => {
          const Icon = mode.icon;
          const isActive = viewMode === mode.key;
          return (
            <TouchableOpacity
              key={mode.key}
              style={[styles.viewBtn, isActive && styles.viewBtnActive]}
              onPress={() => handleViewModePress(mode.key)}
              testID={`view-mode-${mode.key}`}
            >
              <Icon size={16} color={isActive ? "#FFFFFF" : colors.textSecondary} />
              <Text style={[styles.viewBtnText, isActive && styles.viewBtnTextActive]}>{mode.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {viewMode === "list" && (
        <>
          <View style={styles.summaryBar}>
            <Text style={styles.summaryLabel}>
              {filteredEvents.length} событи{filteredEvents.length === 1 ? "е" : "й"}
            </Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalRevenue)}</Text>
          </View>

          <View style={styles.filtersWrap}>
            <FlatList
              data={statusFilters}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersContent}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.filterChip, activeStatus === item.key && styles.filterChipActive]}
                  onPress={() => handleStatusPress(item.key)}
                >
                  <Text style={[styles.filterText, activeStatus === item.key && styles.filterTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
            }
          >
            {listGroups.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>Нет мероприятий</Text>
              </View>
            )}
            {listGroups.map((group, idx) => renderGroupCard(group, idx, false))}
          </ScrollView>
        </>
      )}

      {viewMode === "calendar" && (
        <ScrollView
          style={styles.calScroll}
          contentContainerStyle={styles.calScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
          }
        >
          <View style={styles.calHeader}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.calArrow} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <ChevronLeft size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.calTitle}>{MONTH_NAMES[calMonth]} {calYear}</Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.calArrow} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <ChevronRight size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.calWeekRow}>
            {WEEKDAY_LABELS.map((label) => (
              <View key={label} style={styles.calWeekCell}>
                <Text style={styles.calWeekText}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.calGrid}>
            {calendarDays.map((calDay, index) => {
              const { day, isCurrentMonth: isCurrent } = calDay;
              const hasEvents = isCurrent && eventDatesMap.has(day);
              const dayEvents = isCurrent ? eventDatesMap.get(day) ?? [] : [];
              const isSelected = isCurrent && day === selectedDay;
              const todayMark = isCurrent && isToday(day);

              return (
                <TouchableOpacity
                  key={`cal-${index}`}
                  style={[
                    styles.calCell,
                    isSelected && styles.calCellSelected,
                    todayMark && !isSelected && styles.calCellToday,
                  ]}
                  onPress={() => {
                    if (isCurrent) {
                      void Haptics.selectionAsync();
                      setSelectedDay(day === selectedDay ? null : day);
                    }
                  }}
                  disabled={!isCurrent}
                  activeOpacity={0.6}
                >
                  <Text
                    style={[
                      isCurrent ? styles.calDayText : styles.calDayTextOther,
                      isSelected && styles.calDayTextSelected,
                      todayMark && !isSelected && styles.calDayTextToday,
                    ]}
                  >
                    {day}
                  </Text>
                  {hasEvents && (
                    <View style={styles.calDotsRow}>
                      {dayEvents.slice(0, 3).map((e, i) => (
                        <View
                          key={e.id}
                          style={[
                            styles.calDot,
                            {
                              backgroundColor: isSelected
                                ? "#FFFFFF"
                                : i === 0
                                ? colors.accent
                                : i === 1
                                ? colors.warning
                                : colors.purple,
                            },
                          ]}
                        />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedDay !== null && (
            <View style={styles.calEventsSection}>
              <Text style={styles.calEventsSectionTitle}>
                {selectedDay} {MONTH_NAMES[calMonth].toLowerCase()}
              </Text>
              {selectedDayEvents.length === 0 ? (
                <View style={styles.calEmptyDay}>
                  <Text style={styles.calEmptyDayText}>Нет событий в этот день</Text>
                </View>
              ) : (
                selectedDayEvents.map((event) => (
                  <EventCard key={event.id} event={event} onPress={() => navigateToEvent(event.id)} />
                ))
              )}
            </View>
          )}

          {selectedDay === null && (
            <View style={styles.calHint}>
              <Calendar size={16} color={colors.textMuted} />
              <Text style={styles.calHintText}>Выберите дату для просмотра событий</Text>
            </View>
          )}
        </ScrollView>
      )}

      {viewMode === "top" && (
        <ScrollView
          style={styles.topScroll}
          contentContainerStyle={styles.topScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
          }
        >
          <View style={styles.topMetricPills}>
            {topMetrics.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={[styles.topMetricPill, topMetric === m.key && styles.topMetricPillActive]}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setTopMetric(m.key);
                }}
              >
                <Text style={[styles.topMetricPillText, topMetric === m.key && styles.topMetricPillTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {topGroups.map((group, groupIndex) => renderGroupCard(group, groupIndex, true))}

          {topGroups.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Нет мероприятий</Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        visible={modalState.type !== "none"}
        transparent
        animationType="none"
        onRequestClose={closeModal}
        statusBarTranslucent
      >
        <RNAnimated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.modalOverlayTouch} activeOpacity={1} onPress={closeModal} />
          <RNAnimated.View
            style={[
              styles.modalContainer,
              {
                transform: [{
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  }),
                }],
              },
            ]}
          >
            <TouchableOpacity style={styles.modalCloseBtn} onPress={closeModal}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            {renderGroupActionsModal()}
            {renderRenameModal()}
            {renderMergeModal()}
            {renderMoveModal()}
          </RNAnimated.View>
        </RNAnimated.View>
      </Modal>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    viewSwitcher: {
      flexDirection: "row",
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 4,
      backgroundColor: colors.surfaceAccent,
      borderRadius: 14,
      padding: 3,
    },
    viewBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 12,
    },
    viewBtnActive: { backgroundColor: colors.accent },
    viewBtnText: { fontSize: 12, fontWeight: "600" as const, color: colors.textSecondary },
    viewBtnTextActive: { color: "#FFFFFF" },
    summaryBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    summaryLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: "500" as const },
    summaryValue: { fontSize: 17, fontWeight: "800" as const, color: colors.accent },
    filtersWrap: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    filtersContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surfaceAccent,
    },
    filterChipActive: { backgroundColor: colors.accent },
    filterText: { fontSize: 13, fontWeight: "600" as const, color: colors.textSecondary },
    filterTextActive: { color: "#FFFFFF" },
    listContent: { padding: 16, paddingBottom: 100 },
    emptyState: { paddingVertical: 60, alignItems: "center" },
    emptyText: { color: colors.textMuted, fontSize: 15 },

    listGroupWrap: {
      marginBottom: 12,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      overflow: "hidden",
    },
    listGroupHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 14,
      gap: 10,
    },
    listGroupIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.accentBg,
      alignItems: "center",
      justifyContent: "center",
    },
    listGroupHeaderContent: {
      flex: 1,
    },
    listGroupTitle: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.text,
    },
    listGroupMeta: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    listGroupRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    listGroupBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: colors.accentBg,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    listGroupBadgeText: {
      fontSize: 12,
      fontWeight: "700" as const,
      color: colors.accent,
    },
    listGroupEvents: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    listGroupEventRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    listGroupEventMain: {
      flex: 1,
    },
    listGroupEventAction: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.surfaceAccent,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 4,
    },

    calScroll: { flex: 1 },
    calScrollContent: { paddingBottom: 100 },
    calHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    calArrow: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.surfaceAccent,
      alignItems: "center",
      justifyContent: "center",
    },
    calTitle: {
      fontSize: 17,
      fontWeight: "700" as const,
      color: colors.text,
    },
    calWeekRow: {
      flexDirection: "row",
      paddingHorizontal: 8,
      marginBottom: 4,
    },
    calWeekCell: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 6,
    },
    calWeekText: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: colors.textMuted,
    },
    calGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      paddingHorizontal: 8,
    },
    calCell: {
      width: "14.28%",
      aspectRatio: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 2,
    },
    calCellSelected: {
      backgroundColor: colors.accent,
      borderRadius: 100,
    },
    calCellToday: {
      backgroundColor: colors.accentBg,
      borderRadius: 100,
    },
    calDayText: {
      fontSize: 15,
      fontWeight: "500" as const,
      color: colors.text,
    },
    calDayTextOther: {
      fontSize: 15,
      fontWeight: "400" as const,
      color: colors.textMuted,
    },
    calDayTextSelected: { color: "#FFFFFF", fontWeight: "700" as const },
    calDayTextToday: { color: colors.accent, fontWeight: "700" as const },
    calDotsRow: {
      flexDirection: "row",
      gap: 3,
      marginTop: 3,
    },
    calDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
    },
    calEventsSection: {
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    calEventsSectionTitle: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.text,
      marginBottom: 12,
      textTransform: "capitalize" as const,
    },
    calEmptyDay: {
      paddingVertical: 30,
      alignItems: "center",
      backgroundColor: colors.surfaceAccent,
      borderRadius: 16,
    },
    calEmptyDayText: { color: colors.textMuted, fontSize: 14 },
    calHint: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 32,
    },
    calHintText: { color: colors.textMuted, fontSize: 14 },
    topScroll: { flex: 1 },
    topScrollContent: { padding: 16, paddingBottom: 100 },
    topMetricPills: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 16,
    },
    topMetricPill: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: colors.surfaceAccent,
      alignItems: "center",
    },
    topMetricPillActive: { backgroundColor: colors.accent },
    topMetricPillText: { fontSize: 12, fontWeight: "600" as const, color: colors.textSecondary },
    topMetricPillTextActive: { color: "#FFFFFF" },
    topGroupWrap: {
      marginBottom: 8,
    },
    topCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderGlass,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 10,
    },
    topRankWrap: {
      width: 28,
      alignItems: "center",
    },
    topRankMedal: {
      fontSize: 18,
      fontWeight: "800" as const,
    },
    topRankText: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.textMuted,
    },
    topCardContent: { flex: 1 },
    topCardTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 6,
    },
    topCardTitle: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.text,
      flex: 1,
    },
    topGroupControls: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    groupActionMini: {
      width: 26,
      height: 26,
      borderRadius: 7,
      backgroundColor: colors.surfaceAccent,
      alignItems: "center",
      justifyContent: "center",
    },
    topGroupBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      backgroundColor: colors.accentBg,
      borderRadius: 8,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    topGroupBadgeText: {
      fontSize: 11,
      fontWeight: "700" as const,
      color: colors.accent,
    },
    topBarBg: {
      height: 4,
      backgroundColor: colors.surfaceAccent,
      borderRadius: 2,
      overflow: "hidden",
    },
    topBarFill: { height: 4, borderRadius: 2 },
    topValueWrap: { alignItems: "flex-end", minWidth: 65 },
    topValue: {
      fontSize: 13,
      fontWeight: "800" as const,
      color: colors.accent,
    },
    topSubRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      marginTop: 2,
    },
    topSubText: { fontSize: 10, color: colors.textMuted },
    topSubList: {
      marginLeft: 38,
      borderLeftWidth: 1,
      borderLeftColor: colors.border,
      paddingLeft: 12,
      marginTop: 4,
      marginBottom: 4,
    },
    topSubCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    topSubCardLeft: {
      flex: 1,
      marginRight: 8,
    },
    topSubCardTitle: {
      fontSize: 13,
      fontWeight: "500" as const,
      color: colors.text,
    },
    topSubCardMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      marginTop: 2,
    },
    topSubCardMetaText: {
      fontSize: 10,
      color: colors.textMuted,
    },
    subCardActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    topSubCardValue: {
      fontSize: 12,
      fontWeight: "700" as const,
      color: colors.textSecondary,
    },
    subCardActionBtn: {
      width: 26,
      height: 26,
      borderRadius: 7,
      backgroundColor: colors.surfaceAccent,
      alignItems: "center",
      justifyContent: "center",
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    modalOverlayTouch: {
      flex: 1,
    },
    modalContainer: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 40,
      maxHeight: "70%",
    },
    modalCloseBtn: {
      position: "absolute",
      top: 16,
      right: 16,
      zIndex: 10,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceAccent,
      alignItems: "center",
      justifyContent: "center",
    },
    modalSheet: {
      paddingHorizontal: 20,
      paddingTop: 12,
    },
    modalHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.textMuted,
      alignSelf: "center",
      marginBottom: 16,
      opacity: 0.4,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.text,
      marginBottom: 4,
      paddingRight: 40,
    },
    modalSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 20,
    },
    modalActions: {
      gap: 4,
    },
    modalActionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    modalActionIcon: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    modalActionText: {
      fontSize: 15,
      fontWeight: "500" as const,
      color: colors.text,
      flex: 1,
    },
    modalInputWrap: {
      marginBottom: 16,
    },
    modalInput: {
      backgroundColor: colors.surfaceAccent,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalButtonRow: {
      flexDirection: "row",
      gap: 10,
    },
    modalBtnCancel: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.surfaceAccent,
      alignItems: "center",
    },
    modalBtnCancelText: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.textSecondary,
    },
    modalBtnConfirm: {
      flex: 1,
      flexDirection: "row",
      gap: 6,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    modalBtnConfirmText: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: "#FFFFFF",
    },
    modalBtnDisabled: {
      opacity: 0.4,
    },
    modalList: {
      maxHeight: 280,
    },
    modalListItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: 12,
    },
    modalListItemContent: {
      flex: 1,
    },
    modalListItemTitle: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.text,
    },
    modalListItemMeta: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    modalEmptyList: {
      paddingVertical: 30,
      alignItems: "center",
    },
    modalEmptyText: {
      fontSize: 14,
      color: colors.textMuted,
    },
    modalSectionLabel: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.textSecondary,
      marginTop: 16,
      marginBottom: 8,
    },
  });
}
