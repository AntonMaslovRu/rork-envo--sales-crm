import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Platform, Share } from "react-native";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  mockEvents,
  mockActivities,
  mockSales,
  getSalesForMonth,
  getActivitiesForMonth,
  computeMetricsWithChange,
} from "@/mocks/sales";
import {
  CrmConfig,
  TicketEvent,
  TicketSale,
  ActivityItem,
  ClientProfile,
  ClientFilters,
  ClientSegment,
  EventDateOverrides,
  EventStatusOverrides,
  EventTitleOverrides,
  EventPurchaseCosts,
  ClientNotes,
  EventGroupAssignments,
  EventGroupNames,
  ClientCsvExport,
  ClientCsvRow,
  ClientRfmScore,
} from "@/types/crm";
import {
  fetchYandexEvents,
  fetchYandexOrders,
  enrichSalesWithEventNames,
} from "@/utils/yandexTicketsApi";

const STORAGE_KEY = "crm_config";
const EVENT_OVERRIDES_KEY = "event_date_overrides";
const EVENT_STATUS_OVERRIDES_KEY = "event_status_overrides";
const EVENT_TITLE_OVERRIDES_KEY = "event_title_overrides";
const EVENT_PURCHASE_COSTS_KEY = "event_purchase_costs";
const CLIENT_NOTES_KEY = "client_notes";
const EVENT_GROUP_ASSIGNMENTS_KEY = "event_group_assignments";
const EVENT_GROUP_NAMES_KEY = "event_group_names";
const EVENTS_CACHE_KEY = "cached_events_v2";
const SALES_CACHE_KEY = "cached_sales_v2";
const POLL_INTERVAL = 60000;
const DEFAULT_CLIENT_FILTERS: ClientFilters = {
  segment: "all",
  minSpent: 0,
  periodDays: null,
  minPurchases: 0,
};

const defaultConfig: CrmConfig = {
  provider: "yandex_tickets",
  apiKey: "",
  baseUrl: process.env.EXPO_PUBLIC_CRM_URL || "",
  isConnected: false,
};

function deriveEventStatus(dateString: string): TicketEvent["status"] {
  const now = new Date();
  const date = new Date(dateString);
  const hoursDiff = (date.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursDiff > 0) return "upcoming";
  if (hoursDiff > -4) return "ongoing";
  return "completed";
}

function extractClientCity(address?: string): string {
  if (!address || address === "Не указан") return "Не указан";
  const normalized = address.trim();
  const commaParts = normalized.split(",").map((part) => part.trim()).filter(Boolean);
  if (commaParts.length > 1) {
    return commaParts[0];
  }
  const dashParts = normalized.split("-").map((part) => part.trim()).filter(Boolean);
  if (dashParts.length > 1) {
    return dashParts[0];
  }
  return normalized;
}

function deriveClientSegment(client: Pick<ClientProfile, "totalSpent" | "totalPurchases" | "lastPurchaseAt">): ClientSegment {
  const daysSinceLastPurchase = (Date.now() - new Date(client.lastPurchaseAt).getTime()) / (1000 * 60 * 60 * 24);
  if (client.totalSpent >= 50000 || client.totalPurchases >= 5) {
    return "vip";
  }
  if (client.totalPurchases === 1 && daysSinceLastPurchase <= 30) {
    return "new";
  }
  if (daysSinceLastPurchase >= 60) {
    return "sleeping";
  }
  return "regular";
}

function clampScore(value: number): number {
  if (value < 1) return 1;
  if (value > 5) return 5;
  return value;
}

function buildClientRfm(client: Pick<ClientProfile, "lastPurchaseAt" | "totalPurchases" | "totalSpent">): ClientRfmScore {
  const daysSinceLastPurchase = (Date.now() - new Date(client.lastPurchaseAt).getTime()) / (1000 * 60 * 60 * 24);

  const recency = clampScore(
    daysSinceLastPurchase <= 7 ? 5 :
    daysSinceLastPurchase <= 30 ? 4 :
    daysSinceLastPurchase <= 60 ? 3 :
    daysSinceLastPurchase <= 120 ? 2 : 1
  );

  const frequency = clampScore(
    client.totalPurchases >= 10 ? 5 :
    client.totalPurchases >= 6 ? 4 :
    client.totalPurchases >= 3 ? 3 :
    client.totalPurchases >= 2 ? 2 : 1
  );

  const monetary = clampScore(
    client.totalSpent >= 300000 ? 5 :
    client.totalSpent >= 150000 ? 4 :
    client.totalSpent >= 50000 ? 3 :
    client.totalSpent >= 10000 ? 2 : 1
  );

  const total = recency + frequency + monetary;
  const label = total >= 13 ? "Champions" : total >= 10 ? "Лояльные" : total >= 7 ? "Потенциал" : "Риск оттока";

  return {
    recency,
    frequency,
    monetary,
    total,
    label,
  };
}

function escapeCsvValue(value: string | number): string {
  const stringValue = String(value ?? "");
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function buildClientsCsv(clients: ClientProfile[]): ClientCsvExport {
  const header = [
    "ID",
    "Имя",
    "Email",
    "Телефон",
    "Адрес",
    "Сегмент",
    "Заметка",
    "Покупок",
    "Билетов",
    "Сумма",
    "Первая покупка",
    "Последняя покупка",
    "R",
    "F",
    "M",
    "RFM",
    "RFM label",
  ];

  const rows: ClientCsvRow[] = clients.map((client) => ({
    id: client.id,
    fullName: client.fullName,
    email: client.mailbox,
    phone: client.phone,
    postalAddress: client.postalAddress,
    segment: client.segment,
    note: client.note,
    totalPurchases: client.totalPurchases,
    totalTickets: client.totalTickets,
    totalSpent: client.totalSpent,
    firstPurchaseAt: client.firstPurchaseAt,
    lastPurchaseAt: client.lastPurchaseAt,
    recencyScore: client.rfm.recency,
    frequencyScore: client.rfm.frequency,
    monetaryScore: client.rfm.monetary,
    rfmScore: client.rfm.total,
    rfmLabel: client.rfm.label,
  }));

  const csv = [
    header.map(escapeCsvValue).join(","),
    ...rows.map((row) => [
      row.id,
      row.fullName,
      row.email,
      row.phone,
      row.postalAddress,
      row.segment,
      row.note,
      row.totalPurchases,
      row.totalTickets,
      row.totalSpent,
      row.firstPurchaseAt,
      row.lastPurchaseAt,
      row.recencyScore,
      row.frequencyScore,
      row.monetaryScore,
      row.rfmScore,
      row.rfmLabel,
    ].map(escapeCsvValue).join(",")),
  ].join("\n");

  const stamp = new Date().toISOString().slice(0, 10);
  return {
    fileName: `clients-export-${stamp}.csv`,
    csv,
  };
}

export const [CrmContextProvider, useCrm] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<CrmConfig>(defaultConfig);
  const [eventDateOverrides, setEventDateOverrides] = useState<EventDateOverrides>({});
  const [eventStatusOverrides, setEventStatusOverrides] = useState<EventStatusOverrides>({});
  const [eventTitleOverrides, setEventTitleOverrides] = useState<EventTitleOverrides>({});
  const [eventPurchaseCosts, setEventPurchaseCosts] = useState<EventPurchaseCosts>({});
  const [clientNotes, setClientNotes] = useState<ClientNotes>({});
  const [clientFilters, setClientFilters] = useState<ClientFilters>(DEFAULT_CLIENT_FILTERS);
  const [eventGroupAssignments, setEventGroupAssignments] = useState<EventGroupAssignments>({});
  const [eventGroupNames, setEventGroupNames] = useState<EventGroupNames>({});

  const configQuery = useQuery({
    queryKey: ["crm-config"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as CrmConfig;
      }
      return defaultConfig;
    },
  });

  const eventOverridesQuery = useQuery({
    queryKey: ["event-date-overrides"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(EVENT_OVERRIDES_KEY);
      if (!stored) return {} as EventDateOverrides;
      return JSON.parse(stored) as EventDateOverrides;
    },
  });

  const eventStatusOverridesQuery = useQuery({
    queryKey: ["event-status-overrides"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(EVENT_STATUS_OVERRIDES_KEY);
      if (!stored) return {} as EventStatusOverrides;
      return JSON.parse(stored) as EventStatusOverrides;
    },
  });

  const eventTitleOverridesQuery = useQuery({
    queryKey: ["event-title-overrides"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(EVENT_TITLE_OVERRIDES_KEY);
      if (!stored) return {} as EventTitleOverrides;
      return JSON.parse(stored) as EventTitleOverrides;
    },
  });

  const eventPurchaseCostsQuery = useQuery({
    queryKey: ["event-purchase-costs"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(EVENT_PURCHASE_COSTS_KEY);
      if (!stored) return {} as EventPurchaseCosts;
      return JSON.parse(stored) as EventPurchaseCosts;
    },
  });

  const clientNotesQuery = useQuery({
    queryKey: ["client-notes"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(CLIENT_NOTES_KEY);
      if (!stored) return {} as ClientNotes;
      return JSON.parse(stored) as ClientNotes;
    },
  });

  const groupAssignmentsQuery = useQuery({
    queryKey: ["event-group-assignments"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(EVENT_GROUP_ASSIGNMENTS_KEY);
      if (!stored) return {} as EventGroupAssignments;
      return JSON.parse(stored) as EventGroupAssignments;
    },
  });

  const groupNamesQuery = useQuery({
    queryKey: ["event-group-names"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(EVENT_GROUP_NAMES_KEY);
      if (!stored) return {} as EventGroupNames;
      return JSON.parse(stored) as EventGroupNames;
    },
  });

  useEffect(() => {
    if (configQuery.data) {
      setConfig(configQuery.data);
    }
  }, [configQuery.data]);

  useEffect(() => {
    if (eventOverridesQuery.data) {
      setEventDateOverrides(eventOverridesQuery.data);
    }
  }, [eventOverridesQuery.data]);

  useEffect(() => {
    if (eventStatusOverridesQuery.data) {
      setEventStatusOverrides(eventStatusOverridesQuery.data);
    }
  }, [eventStatusOverridesQuery.data]);

  useEffect(() => {
    if (eventTitleOverridesQuery.data) {
      setEventTitleOverrides(eventTitleOverridesQuery.data);
    }
  }, [eventTitleOverridesQuery.data]);

  useEffect(() => {
    if (eventPurchaseCostsQuery.data) {
      setEventPurchaseCosts(eventPurchaseCostsQuery.data);
    }
  }, [eventPurchaseCostsQuery.data]);

  useEffect(() => {
    if (clientNotesQuery.data) {
      setClientNotes(clientNotesQuery.data);
    }
  }, [clientNotesQuery.data]);

  useEffect(() => {
    if (groupAssignmentsQuery.data) {
      setEventGroupAssignments(groupAssignmentsQuery.data);
    }
  }, [groupAssignmentsQuery.data]);

  useEffect(() => {
    if (groupNamesQuery.data) {
      setEventGroupNames(groupNamesQuery.data);
    }
  }, [groupNamesQuery.data]);

  const saveConfigMutation = useMutation({
    mutationFn: async (newConfig: CrmConfig) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      return newConfig;
    },
    onSuccess: (newConfig) => {
      setConfig(newConfig);
      void queryClient.invalidateQueries({ queryKey: ["crm-config"] });
      if (newConfig.isConnected) {
        void queryClient.invalidateQueries({ queryKey: ["ticket-events"] });
        void queryClient.invalidateQueries({ queryKey: ["activities"] });
        void queryClient.invalidateQueries({ queryKey: ["sales"] });
      }
    },
  });

  const saveEventStatusOverridesMutation = useMutation({
    mutationFn: async (overrides: EventStatusOverrides) => {
      await AsyncStorage.setItem(EVENT_STATUS_OVERRIDES_KEY, JSON.stringify(overrides));
      return overrides;
    },
    onSuccess: (overrides) => {
      setEventStatusOverrides(overrides);
      void queryClient.invalidateQueries({ queryKey: ["event-status-overrides"] });
    },
  });

  const saveEventOverridesMutation = useMutation({
    mutationFn: async (overrides: EventDateOverrides) => {
      await AsyncStorage.setItem(EVENT_OVERRIDES_KEY, JSON.stringify(overrides));
      return overrides;
    },
    onSuccess: (overrides) => {
      setEventDateOverrides(overrides);
      void queryClient.invalidateQueries({ queryKey: ["event-date-overrides"] });
    },
  });

  const saveEventTitleOverridesMutation = useMutation({
    mutationFn: async (overrides: EventTitleOverrides) => {
      await AsyncStorage.setItem(EVENT_TITLE_OVERRIDES_KEY, JSON.stringify(overrides));
      return overrides;
    },
    onSuccess: (overrides) => {
      setEventTitleOverrides(overrides);
      void queryClient.invalidateQueries({ queryKey: ["event-title-overrides"] });
    },
  });

  const saveEventPurchaseCostsMutation = useMutation({
    mutationFn: async (costs: EventPurchaseCosts) => {
      await AsyncStorage.setItem(EVENT_PURCHASE_COSTS_KEY, JSON.stringify(costs));
      return costs;
    },
    onSuccess: (costs) => {
      setEventPurchaseCosts(costs);
      void queryClient.invalidateQueries({ queryKey: ["event-purchase-costs"] });
    },
  });

  const saveClientNotesMutation = useMutation({
    mutationFn: async (notes: ClientNotes) => {
      await AsyncStorage.setItem(CLIENT_NOTES_KEY, JSON.stringify(notes));
      return notes;
    },
    onSuccess: (notes) => {
      setClientNotes(notes);
      void queryClient.invalidateQueries({ queryKey: ["client-notes"] });
    },
  });

  const saveGroupAssignmentsMutation = useMutation({
    mutationFn: async (assignments: EventGroupAssignments) => {
      await AsyncStorage.setItem(EVENT_GROUP_ASSIGNMENTS_KEY, JSON.stringify(assignments));
      return assignments;
    },
    onSuccess: (assignments) => {
      setEventGroupAssignments(assignments);
      void queryClient.invalidateQueries({ queryKey: ["event-group-assignments"] });
    },
  });

  const saveGroupNamesMutation = useMutation({
    mutationFn: async (names: EventGroupNames) => {
      await AsyncStorage.setItem(EVENT_GROUP_NAMES_KEY, JSON.stringify(names));
      return names;
    },
    onSuccess: (names) => {
      setEventGroupNames(names);
      void queryClient.invalidateQueries({ queryKey: ["event-group-names"] });
    },
  });

  const isYandexConnected = config.isConnected
    && config.provider === "yandex_tickets"
    && !!config.login
    && !!config.password
    && !!config.cityId;

  const eventsQuery = useQuery<TicketEvent[]>({
    queryKey: ["ticket-events", config.isConnected, config.login, config.cityId, isYandexConnected],
    queryFn: async () => {
      console.log("[CRM] Fetching ticket events...", new Date().toISOString());
      if (isYandexConnected) {
        try {
          const data = await fetchYandexEvents(config);
          console.log(`[CRM] Fetched ${data.length} events from Yandex Tickets`);
          void AsyncStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(data));
          return data;
        } catch (error) {
          console.log("[CRM] Yandex API fetch failed, trying cache:", error);
          try {
            const cached = await AsyncStorage.getItem(EVENTS_CACHE_KEY);
            if (cached) {
              const parsed = JSON.parse(cached) as TicketEvent[];
              console.log(`[CRM] Using ${parsed.length} cached events`);
              return parsed;
            }
          } catch (cacheError) {
            console.log("[CRM] Cache read failed:", cacheError);
          }
          return mockEvents;
        }
      }
      return mockEvents;
    },
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
  });

  const salesQuery = useQuery<TicketSale[]>({
    queryKey: ["sales", config.isConnected, config.login, config.cityId, isYandexConnected],
    queryFn: async () => {
      console.log("[CRM] Fetching sales...", new Date().toISOString());
      if (isYandexConnected) {
        try {
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          const startDate = threeMonthsAgo.toISOString().split("T")[0];
          const endDate = new Date().toISOString().split("T")[0];

          const data = await fetchYandexOrders(config, startDate, endDate);
          console.log(`[CRM] Fetched ${data.length} orders from Yandex Tickets`);
          void AsyncStorage.setItem(SALES_CACHE_KEY, JSON.stringify(data));
          return data;
        } catch (error) {
          console.log("[CRM] Sales fetch failed, trying cache:", error);
          try {
            const cached = await AsyncStorage.getItem(SALES_CACHE_KEY);
            if (cached) {
              const parsed = JSON.parse(cached) as TicketSale[];
              console.log(`[CRM] Using ${parsed.length} cached sales`);
              return parsed;
            }
          } catch (cacheError) {
            console.log("[CRM] Cache read failed:", cacheError);
          }
          return mockSales;
        }
      }
      return mockSales;
    },
    refetchInterval: POLL_INTERVAL,
    refetchIntervalInBackground: false,
  });

  const rawEvents = useMemo(() => eventsQuery.data ?? mockEvents, [eventsQuery.data]);

  const ticketEvents = useMemo(() => {
    return rawEvents.map((event) => {
      let updated = event;
      const overriddenDate = eventDateOverrides[event.id];
      if (overriddenDate) {
        updated = {
          ...updated,
          date: overriddenDate,
          status: deriveEventStatus(overriddenDate),
          updatedAt: new Date().toISOString(),
        };
      }
      const statusOverride = eventStatusOverrides[event.id];
      if (statusOverride) {
        updated = { ...updated, status: statusOverride };
      }
      const titleOverride = eventTitleOverrides[event.id];
      if (titleOverride && titleOverride.trim().length > 0) {
        updated = { ...updated, title: titleOverride };
      }
      const purchaseCost = eventPurchaseCosts[event.id];
      updated = { ...updated, purchaseCostPerTicket: purchaseCost ?? 0 };
      return updated;
    });
  }, [rawEvents, eventDateOverrides, eventStatusOverrides, eventTitleOverrides, eventPurchaseCosts]);

  const enrichedSales = useMemo(() => {
    const raw = salesQuery.data ?? mockSales;
    if (ticketEvents.length > 0) {
      return enrichSalesWithEventNames(raw, ticketEvents);
    }
    return raw;
  }, [salesQuery.data, ticketEvents]);

  const activitiesFromSales = useMemo((): ActivityItem[] => {
    if (!isYandexConnected) return mockActivities;

    const eventMap = new Map<string, TicketEvent>();
    for (const ev of ticketEvents) {
      eventMap.set(ev.id, ev);
    }

    const defaultEvent: TicketEvent = {
      id: "unknown",
      title: "Неизвестное событие",
      category: "other",
      status: "upcoming",
      venue: "",
      city: "",
      date: new Date().toISOString(),
      ticketsSold: 0,
      ticketsTotal: 0,
      ticketPrice: 0,
      revenue: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return enrichedSales.map((sale): ActivityItem => {
      const event = eventMap.get(sale.eventId) ?? { ...defaultEvent, id: sale.eventId, title: sale.eventTitle };
      return {
        id: `a-${sale.id}`,
        type: "ticket_sold",
        sale,
        event,
        timestamp: sale.timestamp,
        description: `${sale.buyerName} — ${sale.quantity} шт. на "${sale.eventTitle}"`,
      };
    });
  }, [enrichedSales, ticketEvents, isYandexConnected]);

  const clients = useMemo((): ClientProfile[] => {
    const eventDateMap = new Map<string, string>();
    for (const event of ticketEvents) {
      eventDateMap.set(event.id, event.date);
    }

    const grouped = new Map<string, ClientProfile>();

    for (const sale of enrichedSales) {
      const key = sale.customerId ?? sale.customerEmail ?? sale.buyerName;
      const existing = grouped.get(key);
      const postalAddress = sale.customerAddress ?? "Не указан";

      const nextPurchase = {
        saleId: sale.id,
        eventId: sale.eventId,
        eventTitle: sale.eventTitle,
        eventDate: eventDateMap.get(sale.eventId) ?? sale.timestamp,
        quantity: sale.quantity,
        totalAmount: sale.totalAmount,
        timestamp: sale.timestamp,
      };

      if (!existing) {
        grouped.set(key, {
          id: key,
          fullName: sale.buyerName,
          postalAddress,
          mailbox: sale.customerEmail ?? "Не указан",
          phone: sale.customerPhone ?? "Не указан",
          city: extractClientCity(postalAddress),
          totalPurchases: 1,
          totalTickets: sale.quantity,
          totalSpent: sale.totalAmount,
          firstPurchaseAt: sale.timestamp,
          lastPurchaseAt: sale.timestamp,
          segment: "regular",
          note: clientNotes[key] ?? "",
          rfm: buildClientRfm({
            lastPurchaseAt: sale.timestamp,
            totalPurchases: 1,
            totalSpent: sale.totalAmount,
          }),
          purchases: [nextPurchase],
        });
      } else {
        existing.totalPurchases += 1;
        existing.totalTickets += sale.quantity;
        existing.totalSpent += sale.totalAmount;
        existing.firstPurchaseAt = new Date(existing.firstPurchaseAt).getTime() < new Date(sale.timestamp).getTime()
          ? existing.firstPurchaseAt
          : sale.timestamp;
        existing.lastPurchaseAt = new Date(existing.lastPurchaseAt).getTime() > new Date(sale.timestamp).getTime()
          ? existing.lastPurchaseAt
          : sale.timestamp;
        existing.purchases.push(nextPurchase);
      }
    }

    return Array.from(grouped.values())
      .map((client) => {
        const purchases = client.purchases.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const lastPurchaseAt = purchases[0]?.timestamp ?? client.lastPurchaseAt;
        const firstPurchaseAt = purchases[purchases.length - 1]?.timestamp ?? client.firstPurchaseAt;
        const segment = deriveClientSegment({
          totalSpent: client.totalSpent,
          totalPurchases: client.totalPurchases,
          lastPurchaseAt,
        });

        return {
          ...client,
          city: extractClientCity(client.postalAddress),
          purchases,
          firstPurchaseAt,
          lastPurchaseAt,
          segment,
          note: clientNotes[client.id] ?? client.note,
          rfm: buildClientRfm({
            lastPurchaseAt,
            totalPurchases: client.totalPurchases,
            totalSpent: client.totalSpent,
          }),
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [clientNotes, enrichedSales, ticketEvents]);

  const filteredClients = useMemo(() => {
    const now = Date.now();
    return clients.filter((client) => {
      const matchesSegment = clientFilters.segment === "all" || client.segment === clientFilters.segment;
      const matchesSpent = client.totalSpent >= clientFilters.minSpent;
      const matchesPurchases = client.totalPurchases >= clientFilters.minPurchases;
      const matchesPeriod = clientFilters.periodDays === null
        ? true
        : now - new Date(client.lastPurchaseAt).getTime() <= clientFilters.periodDays * 24 * 60 * 60 * 1000;

      return matchesSegment && matchesSpent && matchesPurchases && matchesPeriod;
    });
  }, [clientFilters, clients]);

  const { mutate: saveConfig } = saveConfigMutation;
  const { mutate: saveEventOverrides } = saveEventOverridesMutation;
  const { mutate: saveEventStatusOverrides } = saveEventStatusOverridesMutation;
  const { mutate: saveEventTitleOverrides } = saveEventTitleOverridesMutation;
  const { mutate: saveEventPurchaseCosts } = saveEventPurchaseCostsMutation;
  const { mutate: saveClientNotes } = saveClientNotesMutation;
  const { mutate: saveGroupAssignments } = saveGroupAssignmentsMutation;
  const { mutate: saveGroupNames } = saveGroupNamesMutation;

  const updateConfig = useCallback((newConfig: CrmConfig) => {
    saveConfig(newConfig);
  }, [saveConfig]);

  const updateEventDateOverride = useCallback((eventId: string, isoDate: string) => {
    const updated = { ...eventDateOverrides, [eventId]: isoDate };
    console.log("[CRM] Saving manual event date override", { eventId, isoDate });
    saveEventOverrides(updated);
  }, [eventDateOverrides, saveEventOverrides]);

  const updateEventStatusOverride = useCallback((eventId: string, status: TicketEvent["status"]) => {
    const updated = { ...eventStatusOverrides, [eventId]: status };
    console.log("[CRM] Saving manual event status override", { eventId, status });
    saveEventStatusOverrides(updated);
  }, [eventStatusOverrides, saveEventStatusOverrides]);

  const updateEventTitleOverride = useCallback((eventId: string, title: string) => {
    const updated = { ...eventTitleOverrides };
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      delete updated[eventId];
    } else {
      updated[eventId] = trimmed;
    }
    console.log("[CRM] Saving manual event title override", { eventId, title: trimmed });
    saveEventTitleOverrides(updated);
  }, [eventTitleOverrides, saveEventTitleOverrides]);

  const updateEventPurchaseCost = useCallback((eventId: string, cost: number) => {
    const updated = { ...eventPurchaseCosts };
    if (!Number.isFinite(cost) || cost <= 0) {
      delete updated[eventId];
    } else {
      updated[eventId] = Math.round(cost);
    }
    console.log("[CRM] Saving event purchase cost per ticket", { eventId, cost });
    saveEventPurchaseCosts(updated);
  }, [eventPurchaseCosts, saveEventPurchaseCosts]);

  const refreshAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["ticket-events"] });
    void queryClient.invalidateQueries({ queryKey: ["activities"] });
    void queryClient.invalidateQueries({ queryKey: ["sales"] });
  }, [queryClient]);

  const updateClientFilters = useCallback((nextFilters: Partial<ClientFilters>) => {
    setClientFilters((current) => ({ ...current, ...nextFilters }));
  }, []);

  const resetClientFilters = useCallback(() => {
    setClientFilters(DEFAULT_CLIENT_FILTERS);
  }, []);

  const updateClientNote = useCallback((clientId: string, note: string) => {
    const updated = {
      ...clientNotes,
      [clientId]: note,
    };
    console.log("[CRM] Saving client note", { clientId, noteLength: note.length });
    saveClientNotes(updated);
  }, [clientNotes, saveClientNotes]);

  const updateEventGroupAssignment = useCallback((eventId: string, groupId: string | null) => {
    const updated = { ...eventGroupAssignments };
    if (groupId === null) {
      delete updated[eventId];
    } else {
      updated[eventId] = groupId;
    }
    console.log("[CRM] Updating group assignment", { eventId, groupId });
    saveGroupAssignments(updated);
  }, [eventGroupAssignments, saveGroupAssignments]);

  const updateEventGroupAssignmentsBatch = useCallback((assignments: EventGroupAssignments) => {
    const updated = { ...eventGroupAssignments, ...assignments };
    Object.keys(assignments).forEach((key) => {
      if (assignments[key] === "") delete updated[key];
    });
    console.log("[CRM] Batch updating group assignments", Object.keys(assignments).length);
    saveGroupAssignments(updated);
  }, [eventGroupAssignments, saveGroupAssignments]);

  const updateEventGroupName = useCallback((groupId: string, name: string) => {
    const updated = { ...eventGroupNames, [groupId]: name };
    console.log("[CRM] Updating group name", { groupId, name });
    saveGroupNames(updated);
  }, [eventGroupNames, saveGroupNames]);

  const removeEventGroupName = useCallback((groupId: string) => {
    const updated = { ...eventGroupNames };
    delete updated[groupId];
    saveGroupNames(updated);
  }, [eventGroupNames, saveGroupNames]);

  const exportClientsToCsv = useCallback(async (inputClients?: ClientProfile[]) => {
    const targetClients = inputClients ?? filteredClients;
    const exportPayload = buildClientsCsv(targetClients);
    console.log("[CRM] Exporting clients to CSV", { count: targetClients.length, fileName: exportPayload.fileName });

    if (Platform.OS === "web" && typeof document !== "undefined") {
      const blob = new Blob([exportPayload.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = exportPayload.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      return exportPayload;
    }

    try {
      await Share.share({
        title: exportPayload.fileName,
        message: exportPayload.csv,
      });
    } catch (error) {
      console.log("[CRM] Native CSV share failed", error);
      Alert.alert("Экспорт CSV", "Не удалось открыть системный экспорт. Попробуйте позже.");
    }

    return exportPayload;
  }, [filteredClients]);

  const activities = activitiesFromSales;
  const allSales = enrichedSales;

  const nowMonth = new Date().getMonth();
  const nowYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState<number>(nowMonth);
  const [selectedYear, setSelectedYear] = useState<number>(nowYear);

  const selectedMonthSales = useMemo(
    () => getSalesForMonth(allSales, selectedYear, selectedMonth),
    [allSales, selectedYear, selectedMonth]
  );

  const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
  const prevMonthSales = useMemo(
    () => getSalesForMonth(allSales, prevYear, prevMonth),
    [allSales, prevYear, prevMonth]
  );

  const selectedMonthActivities = useMemo(
    () => getActivitiesForMonth(activities, selectedYear, selectedMonth),
    [activities, selectedYear, selectedMonth]
  );

  const metrics = useMemo(
    () => computeMetricsWithChange(selectedMonthSales, prevMonthSales, eventPurchaseCosts),
    [selectedMonthSales, prevMonthSales, eventPurchaseCosts]
  );

  const goToPrevMonth = useCallback(() => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  }, [selectedMonth]);

  const goToNextMonth = useCallback(() => {
    const curMonth = new Date().getMonth();
    const curYear = new Date().getFullYear();
    if (selectedMonth === curMonth && selectedYear === curYear) return;
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  }, [selectedMonth, selectedYear]);

  const isCurrentMonth = selectedMonth === nowMonth && selectedYear === nowYear;

  const isLoading = configQuery.isLoading || eventsQuery.isLoading || salesQuery.isLoading || clientNotesQuery.isLoading || eventStatusOverridesQuery.isLoading || eventTitleOverridesQuery.isLoading || eventPurchaseCostsQuery.isLoading || groupAssignmentsQuery.isLoading || groupNamesQuery.isLoading;
  const isRefreshing = eventsQuery.isRefetching || salesQuery.isRefetching;

  return useMemo(() => ({
    config,
    updateConfig,
    ticketEvents,
    activities,
    allSales,
    clients,
    filteredClients,
    clientFilters,
    updateClientFilters,
    resetClientFilters,
    updateClientNote,
    exportClientsToCsv,
    currentMonthSales: selectedMonthSales,
    currentMonthActivities: selectedMonthActivities,
    metrics,
    selectedMonth,
    selectedYear,
    isCurrentMonth,
    goToPrevMonth,
    goToNextMonth,
    updateEventDateOverride,
    updateEventStatusOverride,
    updateEventTitleOverride,
    updateEventPurchaseCost,
    eventDateOverrides,
    eventStatusOverrides,
    eventTitleOverrides,
    eventPurchaseCosts,
    eventGroupAssignments,
    eventGroupNames,
    updateEventGroupAssignment,
    updateEventGroupAssignmentsBatch,
    updateEventGroupName,
    removeEventGroupName,
    isLoading,
    isRefreshing,
    refreshAll,
    lastSync: new Date().toISOString(),
  }), [
    activities,
    allSales,
    clientFilters,
    clients,
    config,
    eventDateOverrides,
    eventGroupAssignments,
    eventGroupNames,
    eventStatusOverrides,
    eventTitleOverrides,
    eventPurchaseCosts,
    exportClientsToCsv,
    filteredClients,
    goToNextMonth,
    goToPrevMonth,
    isCurrentMonth,
    isLoading,
    isRefreshing,
    metrics,
    refreshAll,
    resetClientFilters,
    selectedMonth,
    selectedMonthActivities,
    selectedMonthSales,
    selectedYear,
    ticketEvents,
    updateClientFilters,
    updateClientNote,
    updateConfig,
    updateEventDateOverride,
    updateEventGroupAssignment,
    updateEventGroupAssignmentsBatch,
    updateEventGroupName,
    updateEventStatusOverride,
    updateEventTitleOverride,
    updateEventPurchaseCost,
    removeEventGroupName,
  ]);
});
