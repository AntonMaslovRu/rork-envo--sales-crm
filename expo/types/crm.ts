export type CrmProvider = "yandex_tickets" | "custom";

export interface CrmConfig {
  provider: CrmProvider;
  apiKey: string;
  baseUrl?: string;
  isConnected: boolean;
  lastSync?: string;
  login?: string;
  password?: string;
  cityId?: number;
}

export type EventCategory = "concert" | "tournament" | "festival" | "theater" | "sport" | "other";

export type EventStatus = "upcoming" | "ongoing" | "completed" | "cancelled";

export interface TicketEvent {
  id: string;
  title: string;
  category: EventCategory;
  status: EventStatus;
  venue: string;
  city: string;
  date: string;
  ticketsSold: number;
  ticketsTotal: number;
  ticketPrice: number;
  revenue: number;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
  activityId?: number;
  purchaseCostPerTicket?: number;
}

export interface TicketSale {
  id: string;
  eventId: string;
  eventTitle: string;
  buyerName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  timestamp: string;
  orderId?: number;
  customerId?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
}

export interface ClientPurchaseHistoryItem {
  saleId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  quantity: number;
  totalAmount: number;
  timestamp: string;
}

export type ClientSegment = "vip" | "new" | "sleeping" | "regular";

export interface ClientRfmScore {
  recency: number;
  frequency: number;
  monetary: number;
  total: number;
  label: string;
}

export interface ClientProfile {
  id: string;
  fullName: string;
  postalAddress: string;
  mailbox: string;
  phone: string;
  city: string;
  totalPurchases: number;
  totalTickets: number;
  totalSpent: number;
  firstPurchaseAt: string;
  lastPurchaseAt: string;
  segment: ClientSegment;
  note: string;
  rfm: ClientRfmScore;
  purchases: ClientPurchaseHistoryItem[];
}

export interface ClientFilters {
  segment: ClientSegment | "all";
  minSpent: number;
  periodDays: number | null;
  minPurchases: number;
}

export type EventDateOverrides = Record<string, string>;
export type EventStatusOverrides = Record<string, EventStatus>;
export type EventTitleOverrides = Record<string, string>;
export type EventPurchaseCosts = Record<string, number>;
export type ClientNotes = Record<string, string>;
export type EventGroupAssignments = Record<string, string>;
export type EventGroupNames = Record<string, string>;

export interface ClientCsvExport {
  fileName: string;
  csv: string;
}

export interface ClientCsvRow {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  postalAddress: string;
  segment: string;
  note: string;
  totalPurchases: number;
  totalTickets: number;
  totalSpent: number;
  firstPurchaseAt: string;
  lastPurchaseAt: string;
  recencyScore: number;
  frequencyScore: number;
  monetaryScore: number;
  rfmScore: number;
  rfmLabel: string;
}

export interface SalesMetrics {
  totalRevenue: number;
  netRevenue: number;
  purchaseCost: number;
  ticketsSoldMonth: number;
  totalProfit: number;
  revenueChange: number;
  ticketsChange: number;
  profitChange: number;
}

export interface ActivityItem {
  id: string;
  type: "ticket_sold";
  sale: TicketSale;
  event: TicketEvent;
  timestamp: string;
  description: string;
}

export interface YandexEventRaw {
  id: number;
  status: number;
  name: string;
  venue_id: number;
  date: string;
  activity_id: number;
  city_id: number;
}

export interface YandexEventReport {
  event_id: number;
  event_name: string;
  event_date: string;
  activity_id: number;
  tickets_count: number;
  tickets_available: number;
  tickets_sold: number;
  tickets_sold_sum: number;
  tickets_returned: number;
  tickets_booked: number;
  agent?: string;
  agent_id?: number;
}

export interface YandexOrderCustomer {
  id: number;
  name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_subscripted?: number;
}

export interface YandexOrder {
  id: number;
  customer_id: number;
  customer: YandexOrderCustomer;
  event_id: number;
  status: number;
  is_returned: number;
  order_date: string;
  season_id: number;
  tickets_count: number;
  seasons_count: number;
  sum: number;
  fee: number;
  sale_type: number;
  agent_id: number;
}

export interface YandexCity {
  id: string;
  name: string;
}

export interface NotificationHistoryItem {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: string;
  read: boolean;
  data?: Record<string, unknown>;
}
