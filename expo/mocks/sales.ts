import { TicketEvent, TicketSale, ActivityItem, SalesMetrics } from "@/types/crm";

const now = new Date();
const h = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
const m = (mins: number) => new Date(now.getTime() - mins * 60 * 1000).toISOString();
const d = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

export const mockEvents: TicketEvent[] = [
  {
    id: "ev1",
    title: "Кино — Лучшие хиты",
    category: "concert",
    status: "upcoming",
    venue: "СК Олимпийский",
    city: "Москва",
    date: d(12),
    ticketsSold: 4820,
    ticketsTotal: 8000,
    ticketPrice: 3500,
    revenue: 16870000,
    createdAt: h(720),
    updatedAt: m(8),
  },
  {
    id: "ev2",
    title: "Турнир по CS2 — Grand Finals",
    category: "tournament",
    status: "upcoming",
    venue: "ВТБ Арена",
    city: "Москва",
    date: d(5),
    ticketsSold: 2150,
    ticketsTotal: 3500,
    ticketPrice: 2800,
    revenue: 6020000,
    createdAt: h(480),
    updatedAt: m(22),
  },
  {
    id: "ev3",
    title: "Баста — Стадион",
    category: "concert",
    status: "upcoming",
    venue: "Газпром Арена",
    city: "Санкт-Петербург",
    date: d(20),
    ticketsSold: 11200,
    ticketsTotal: 25000,
    ticketPrice: 4000,
    revenue: 44800000,
    createdAt: h(360),
    updatedAt: m(45),
  },
  {
    id: "ev4",
    title: "Stand-Up Фест 2026",
    category: "festival",
    status: "ongoing",
    venue: "Крокус Сити Холл",
    city: "Москва",
    date: h(2),
    ticketsSold: 5600,
    ticketsTotal: 6000,
    ticketPrice: 2200,
    revenue: 12320000,
    createdAt: h(1200),
    updatedAt: m(3),
  },
  {
    id: "ev5",
    title: "Мельница — Весенний тур",
    category: "concert",
    status: "completed",
    venue: "Adrenaline Stadium",
    city: "Москва",
    date: h(48),
    ticketsSold: 3800,
    ticketsTotal: 4000,
    ticketPrice: 2500,
    revenue: 9500000,
    createdAt: h(2000),
    updatedAt: h(48),
  },
  {
    id: "ev6",
    title: "Dota 2 Major — Playoff",
    category: "tournament",
    status: "upcoming",
    venue: "Лужники",
    city: "Москва",
    date: d(30),
    ticketsSold: 890,
    ticketsTotal: 15000,
    ticketPrice: 3200,
    revenue: 2848000,
    createdAt: h(168),
    updatedAt: h(1),
  },
  {
    id: "ev7",
    title: "Щелкунчик — Большой театр",
    category: "theater",
    status: "upcoming",
    venue: "Большой театр",
    city: "Москва",
    date: d(45),
    ticketsSold: 1200,
    ticketsTotal: 1500,
    ticketPrice: 8500,
    revenue: 10200000,
    createdAt: h(500),
    updatedAt: h(3),
  },
];

const mockSales: TicketSale[] = [
  {
    id: "s1",
    eventId: "ev1",
    eventTitle: "Кино — Лучшие хиты",
    buyerName: "Алексей М.",
    quantity: 2,
    unitPrice: 3500,
    totalAmount: 7000,
    timestamp: m(3),
  },
  {
    id: "s2",
    eventId: "ev3",
    eventTitle: "Баста — Стадион",
    buyerName: "Мария К.",
    quantity: 4,
    unitPrice: 4000,
    totalAmount: 16000,
    timestamp: m(8),
  },
  {
    id: "s3",
    eventId: "ev2",
    eventTitle: "Турнир по CS2 — Grand Finals",
    buyerName: "Дмитрий В.",
    quantity: 1,
    unitPrice: 2800,
    totalAmount: 2800,
    timestamp: m(15),
  },
  {
    id: "s4",
    eventId: "ev4",
    eventTitle: "Stand-Up Фест 2026",
    buyerName: "Елена С.",
    quantity: 3,
    unitPrice: 2200,
    totalAmount: 6600,
    timestamp: m(28),
  },
  {
    id: "s5",
    eventId: "ev7",
    eventTitle: "Щелкунчик — Большой театр",
    buyerName: "Ольга Н.",
    quantity: 2,
    unitPrice: 8500,
    totalAmount: 17000,
    timestamp: m(42),
  },
  {
    id: "s6",
    eventId: "ev1",
    eventTitle: "Кино — Лучшие хиты",
    buyerName: "Иван П.",
    quantity: 1,
    unitPrice: 3500,
    totalAmount: 3500,
    timestamp: h(1),
  },
  {
    id: "s7",
    eventId: "ev6",
    eventTitle: "Dota 2 Major — Playoff",
    buyerName: "Сергей Л.",
    quantity: 2,
    unitPrice: 3200,
    totalAmount: 6400,
    timestamp: h(2),
  },
  {
    id: "s8",
    eventId: "ev3",
    eventTitle: "Баста — Стадион",
    buyerName: "Анна Р.",
    quantity: 2,
    unitPrice: 4000,
    totalAmount: 8000,
    timestamp: h(3),
  },
  {
    id: "s9",
    eventId: "ev2",
    eventTitle: "Турнир по CS2 — Grand Finals",
    buyerName: "Кирилл Ж.",
    quantity: 5,
    unitPrice: 2800,
    totalAmount: 14000,
    timestamp: h(5),
  },
  {
    id: "s10",
    eventId: "ev5",
    eventTitle: "Мельница — Весенний тур",
    buyerName: "Татьяна Б.",
    quantity: 2,
    unitPrice: 2500,
    totalAmount: 5000,
    timestamp: h(8),
  },
  {
    id: "s11",
    eventId: "ev1",
    eventTitle: "Кино — Лучшие хиты",
    buyerName: "Виктор Г.",
    quantity: 3,
    unitPrice: 3500,
    totalAmount: 10500,
    timestamp: daysAgo(5),
  },
  {
    id: "s12",
    eventId: "ev4",
    eventTitle: "Stand-Up Фест 2026",
    buyerName: "Наталья Д.",
    quantity: 2,
    unitPrice: 2200,
    totalAmount: 4400,
    timestamp: daysAgo(10),
  },
  {
    id: "s13",
    eventId: "ev3",
    eventTitle: "Баста — Стадион",
    buyerName: "Павел К.",
    quantity: 6,
    unitPrice: 4000,
    totalAmount: 24000,
    timestamp: daysAgo(35),
  },
  {
    id: "s14",
    eventId: "ev7",
    eventTitle: "Щелкунчик — Большой театр",
    buyerName: "Светлана М.",
    quantity: 4,
    unitPrice: 8500,
    totalAmount: 34000,
    timestamp: daysAgo(38),
  },
  {
    id: "s15",
    eventId: "ev2",
    eventTitle: "Турнир по CS2 — Grand Finals",
    buyerName: "Андрей Ф.",
    quantity: 2,
    unitPrice: 2800,
    totalAmount: 5600,
    timestamp: daysAgo(42),
  },
  {
    id: "s16",
    eventId: "ev6",
    eventTitle: "Dota 2 Major — Playoff",
    buyerName: "Ирина В.",
    quantity: 3,
    unitPrice: 3200,
    totalAmount: 9600,
    timestamp: daysAgo(50),
  },
  {
    id: "s17",
    eventId: "ev1",
    eventTitle: "Кино — Лучшие хиты",
    buyerName: "Олег Т.",
    quantity: 2,
    unitPrice: 3500,
    totalAmount: 7000,
    timestamp: daysAgo(65),
  },
  {
    id: "s18",
    eventId: "ev5",
    eventTitle: "Мельница — Весенний тур",
    buyerName: "Юлия Р.",
    quantity: 1,
    unitPrice: 2500,
    totalAmount: 2500,
    timestamp: daysAgo(70),
  },
  {
    id: "s19",
    eventId: "ev3",
    eventTitle: "Баста — Стадион",
    buyerName: "Максим Б.",
    quantity: 5,
    unitPrice: 4000,
    totalAmount: 20000,
    timestamp: daysAgo(90),
  },
  {
    id: "s20",
    eventId: "ev4",
    eventTitle: "Stand-Up Фест 2026",
    buyerName: "Елизавета Н.",
    quantity: 2,
    unitPrice: 2200,
    totalAmount: 4400,
    timestamp: daysAgo(95),
  },
];

function findEvent(eventId: string): TicketEvent {
  return mockEvents.find((e) => e.id === eventId) ?? mockEvents[0];
}

export const mockActivities: ActivityItem[] = mockSales.map((sale) => ({
  id: `a-${sale.id}`,
  type: "ticket_sold" as const,
  sale,
  event: findEvent(sale.eventId),
  timestamp: sale.timestamp,
  description: `${sale.buyerName} — ${sale.quantity} шт. на "${sale.eventTitle}"`,
}));

export function getSalesForMonth(sales: TicketSale[], year: number, month: number): TicketSale[] {
  return sales.filter((s) => {
    const d = new Date(s.timestamp);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export function getActivitiesForMonth(activities: ActivityItem[], year: number, month: number): ActivityItem[] {
  return activities.filter((a) => {
    const d = new Date(a.timestamp);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export function computeMetricsForSales(
  sales: TicketSale[],
  purchaseCosts: Record<string, number> = {}
): SalesMetrics {
  const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  const ticketsSoldMonth = sales.reduce((sum, s) => sum + s.quantity, 0);
  const afterFee = totalRevenue * 0.94;
  const netRevenue = Math.round(afterFee * 0.87);
  const purchaseCost = sales.reduce(
    (sum, s) => sum + (purchaseCosts[s.eventId] ?? 0) * s.quantity,
    0
  );
  const totalProfit = netRevenue - purchaseCost;

  return {
    totalRevenue,
    netRevenue,
    purchaseCost,
    ticketsSoldMonth,
    totalProfit,
    revenueChange: 0,
    ticketsChange: 0,
    profitChange: 0,
  };
}

export function computeMetricsWithChange(
  currentSales: TicketSale[],
  prevSales: TicketSale[],
  purchaseCosts: Record<string, number> = {}
): SalesMetrics {
  const current = computeMetricsForSales(currentSales, purchaseCosts);
  const prev = computeMetricsForSales(prevSales, purchaseCosts);

  const pctChange = (cur: number, prv: number) => {
    if (prv === 0) return cur > 0 ? 100 : 0;
    return ((cur - prv) / prv) * 100;
  };

  return {
    ...current,
    revenueChange: Math.round(pctChange(current.netRevenue, prev.netRevenue) * 10) / 10,
    ticketsChange: Math.round(pctChange(current.ticketsSoldMonth, prev.ticketsSoldMonth) * 10) / 10,
    profitChange: Math.round(pctChange(current.totalProfit, prev.totalProfit) * 10) / 10,
  };
}

export function groupSalesByMonth(sales: TicketSale[]): { key: string; label: string; sales: TicketSale[] }[] {
  const groups = new Map<string, TicketSale[]>();

  const sorted = [...sales].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  for (const sale of sorted) {
    const d = new Date(sale.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(sale);
  }

  const monthNames = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
  ];

  return Array.from(groups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, groupSales]) => {
      const [year, monthStr] = key.split("-");
      const monthIndex = parseInt(monthStr, 10);
      return {
        key,
        label: `${monthNames[monthIndex]} ${year}`,
        sales: groupSales,
      };
    });
}

const totalRevenue = mockEvents.reduce((sum, ev) => sum + ev.revenue, 0);
const ticketsSoldMonth = mockEvents.reduce((sum, ev) => sum + ev.ticketsSold, 0);
const afterFee = totalRevenue * 0.94;
const totalProfit = afterFee * 0.87;

export const mockMetrics: SalesMetrics = {
  totalRevenue,
  netRevenue: Math.round(totalProfit),
  purchaseCost: 0,
  ticketsSoldMonth,
  totalProfit: Math.round(totalProfit),
  revenueChange: 14.2,
  ticketsChange: 8.7,
  profitChange: 11.5,
};

export { mockSales };
