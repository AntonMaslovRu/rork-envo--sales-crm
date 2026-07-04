import { createHash } from "node:crypto";
import { config } from "./config.js";

const BASE_URL = "https://api.tickets.yandex.net/api/crm/";

export interface YandexCustomer {
  id?: number;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

export interface YandexOrder {
  id: number;
  event_id: number;
  order_date: string;
  sum: number;
  tickets_count: number;
  customer?: YandexCustomer;
}

export interface YandexEvent {
  id: number;
  name?: string;
  date: string;
  status: number;
}

// Схема авторизации Яндекс.Билетов: login:sha1(md5(password) + timestamp):timestamp
function generateAuth(login: string, password: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const md5Password = createHash("md5").update(password).digest("hex");
  const shaHash = createHash("sha1").update(md5Password + timestamp).digest("hex");
  return `${login}:${shaHash}:${timestamp}`;
}

// API иногда оборачивает каждый элемент результата в собственный массив
function unwrapResult<T>(result: unknown): T[] {
  if (!Array.isArray(result) || result.length === 0) return [];
  if (Array.isArray(result[0])) {
    return result.map((item: unknown) =>
      Array.isArray(item) && item.length > 0 ? (item[0] as T) : (item as T)
    );
  }
  return result as T[];
}

async function apiRequest<T>(
  action: string,
  extraParams: Record<string, string | number> = {}
): Promise<T[]> {
  const params = new URLSearchParams({
    action,
    auth: generateAuth(config.yandexLogin, config.yandexPassword),
    city_id: config.yandexCityId,
  });
  for (const [key, value] of Object.entries(extraParams)) {
    params.set(key, String(value));
  }

  const response = await fetch(`${BASE_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Yandex API HTTP ${response.status}: ${response.statusText}`);
  }

  const json = (await response.json()) as { status: string | number; error?: string; result?: unknown };
  if (json.status === "1" || json.status === 1) {
    throw new Error(`Yandex API error: ${json.error || "unknown"}`);
  }

  return unwrapResult<T>(json.result);
}

export async function fetchOrders(startDate: string): Promise<YandexOrder[]> {
  // status=1 — оплаченные заказы (так же фильтрует приложение Envo)
  return apiRequest<YandexOrder>("crm.order.list", { status: 1, start_date: startDate });
}

let eventsCache: { at: number; events: YandexEvent[] } | null = null;
const EVENTS_CACHE_TTL_MS = 5 * 60 * 1000;

export async function fetchEvents(): Promise<YandexEvent[]> {
  if (eventsCache && Date.now() - eventsCache.at < EVENTS_CACHE_TTL_MS) {
    return eventsCache.events;
  }
  const events = await apiRequest<YandexEvent>("crm.event.list");
  eventsCache = { at: Date.now(), events };
  return events;
}

export function eventTitle(events: YandexEvent[], eventId: string): string {
  const event = events.find((e) => String(e.id) === eventId);
  return event?.name ?? `Событие #${eventId}`;
}
