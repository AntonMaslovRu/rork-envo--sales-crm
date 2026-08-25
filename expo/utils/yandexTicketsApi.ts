import {
  CrmConfig,
  TicketEvent,
  TicketSale,
  ActivityItem,
  YandexEventRaw,
  YandexEventReport,
  YandexOrder,
  YandexCity,
  EventStatus,
  EventCategory,
} from "@/types/crm";

const BASE_URL = "https://api.tickets.yandex.net/api/crm/";

function md5(input: string): string {
  const safeCharCodeAt = (str: string, i: number) => str.charCodeAt(i) & 0xff;

  const rotateLeft = (lValue: number, iShiftBits: number) =>
    (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));

  const addUnsigned = (lX: number, lY: number) => {
    const lX8 = lX & 0x80000000;
    const lY8 = lY & 0x80000000;
    const lX4 = lX & 0x40000000;
    const lY4 = lY & 0x40000000;
    const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
    if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
    if (lX4 | lY4) {
      if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
      return lResult ^ 0x40000000 ^ lX8 ^ lY8;
    }
    return lResult ^ lX8 ^ lY8;
  };

  const F = (x: number, y: number, z: number) => (x & y) | (~x & z);
  const G = (x: number, y: number, z: number) => (x & z) | (y & ~z);
  const H = (x: number, y: number, z: number) => x ^ y ^ z;
  const I = (x: number, y: number, z: number) => y ^ (x | ~z);

  const FF = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) =>
    addUnsigned(rotateLeft(addUnsigned(addUnsigned(F(b, c, d), addUnsigned(a, x)), ac), s), b);
  const GG = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) =>
    addUnsigned(rotateLeft(addUnsigned(addUnsigned(G(b, c, d), addUnsigned(a, x)), ac), s), b);
  const HH = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) =>
    addUnsigned(rotateLeft(addUnsigned(addUnsigned(H(b, c, d), addUnsigned(a, x)), ac), s), b);
  const II = (a: number, b: number, c: number, d: number, x: number, s: number, ac: number) =>
    addUnsigned(rotateLeft(addUnsigned(addUnsigned(I(b, c, d), addUnsigned(a, x)), ac), s), b);

  const convertToWordArray = (str: string) => {
    const lMessageLength = str.length;
    const lNumberOfWordsTemp1 = lMessageLength + 8;
    const lNumberOfWordsTemp2 = (lNumberOfWordsTemp1 - (lNumberOfWordsTemp1 % 64)) / 64;
    const lNumberOfWords = (lNumberOfWordsTemp2 + 1) * 16;
    const lWordArray = new Array<number>(lNumberOfWords - 1);
    let lBytePosition = 0;
    let lByteCount = 0;
    while (lByteCount < lMessageLength) {
      const lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (safeCharCodeAt(str, lByteCount) << lBytePosition);
      lByteCount++;
    }
    const lWordCount = (lByteCount - (lByteCount % 4)) / 4;
    lBytePosition = (lByteCount % 4) * 8;
    lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
    lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
    lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
    return lWordArray;
  };

  const wordToHex = (lValue: number) => {
    let result = "";
    for (let lCount = 0; lCount <= 3; lCount++) {
      const lByte = (lValue >>> (lCount * 8)) & 255;
      result += ("0" + lByte.toString(16)).slice(-2);
    }
    return result;
  };

  const x = convertToWordArray(input);
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;

  const S11=7,S12=12,S13=17,S14=22,S21=5,S22=9,S23=14,S24=20,S31=4,S32=11,S33=16,S34=23,S41=6,S42=10,S43=15,S44=21;

  for (let k = 0; k < x.length; k += 16) {
    const AA=a,BB=b,CC=c,DD=d;
    a=FF(a,b,c,d,x[k+0],S11,0xD76AA478);d=FF(d,a,b,c,x[k+1],S12,0xE8C7B756);c=FF(c,d,a,b,x[k+2],S13,0x242070DB);b=FF(b,c,d,a,x[k+3],S14,0xC1BDCEEE);
    a=FF(a,b,c,d,x[k+4],S11,0xF57C0FAF);d=FF(d,a,b,c,x[k+5],S12,0x4787C62A);c=FF(c,d,a,b,x[k+6],S13,0xA8304613);b=FF(b,c,d,a,x[k+7],S14,0xFD469501);
    a=FF(a,b,c,d,x[k+8],S11,0x698098D8);d=FF(d,a,b,c,x[k+9],S12,0x8B44F7AF);c=FF(c,d,a,b,x[k+10],S13,0xFFFF5BB1);b=FF(b,c,d,a,x[k+11],S14,0x895CD7BE);
    a=FF(a,b,c,d,x[k+12],S11,0x6B901122);d=FF(d,a,b,c,x[k+13],S12,0xFD987193);c=FF(c,d,a,b,x[k+14],S13,0xA679438E);b=FF(b,c,d,a,x[k+15],S14,0x49B40821);
    a=GG(a,b,c,d,x[k+1],S21,0xF61E2562);d=GG(d,a,b,c,x[k+6],S22,0xC040B340);c=GG(c,d,a,b,x[k+11],S23,0x265E5A51);b=GG(b,c,d,a,x[k+0],S24,0xE9B6C7AA);
    a=GG(a,b,c,d,x[k+5],S21,0xD62F105D);d=GG(d,a,b,c,x[k+10],S22,0x2441453);c=GG(c,d,a,b,x[k+15],S23,0xD8A1E681);b=GG(b,c,d,a,x[k+4],S24,0xE7D3FBC8);
    a=GG(a,b,c,d,x[k+9],S21,0x21E1CDE6);d=GG(d,a,b,c,x[k+14],S22,0xC33707D6);c=GG(c,d,a,b,x[k+3],S23,0xF4D50D87);b=GG(b,c,d,a,x[k+8],S24,0x455A14ED);
    a=GG(a,b,c,d,x[k+13],S21,0xA9E3E905);d=GG(d,a,b,c,x[k+2],S22,0xFCEFA3F8);c=GG(c,d,a,b,x[k+7],S23,0x676F02D9);b=GG(b,c,d,a,x[k+12],S24,0x8D2A4C8A);
    a=HH(a,b,c,d,x[k+5],S31,0xFFFA3942);d=HH(d,a,b,c,x[k+8],S32,0x8771F681);c=HH(c,d,a,b,x[k+11],S33,0x6D9D6122);b=HH(b,c,d,a,x[k+14],S34,0xFDE5380C);
    a=HH(a,b,c,d,x[k+1],S31,0xA4BEEA44);d=HH(d,a,b,c,x[k+4],S32,0x4BDECFA9);c=HH(c,d,a,b,x[k+7],S33,0xF6BB4B60);b=HH(b,c,d,a,x[k+10],S34,0xBEBFBC70);
    a=HH(a,b,c,d,x[k+13],S31,0x289B7EC6);d=HH(d,a,b,c,x[k+0],S32,0xEAA127FA);c=HH(c,d,a,b,x[k+3],S33,0xD4EF3085);b=HH(b,c,d,a,x[k+6],S34,0x4881D05);
    a=HH(a,b,c,d,x[k+9],S31,0xD9D4D039);d=HH(d,a,b,c,x[k+12],S32,0xE6DB99E5);c=HH(c,d,a,b,x[k+15],S33,0x1FA27CF8);b=HH(b,c,d,a,x[k+2],S34,0xC4AC5665);
    a=II(a,b,c,d,x[k+0],S41,0xF4292244);d=II(d,a,b,c,x[k+7],S42,0x432AFF97);c=II(c,d,a,b,x[k+14],S43,0xAB9423A7);b=II(b,c,d,a,x[k+5],S44,0xFC93A039);
    a=II(a,b,c,d,x[k+12],S41,0x655B59C3);d=II(d,a,b,c,x[k+3],S42,0x8F0CCC92);c=II(c,d,a,b,x[k+10],S43,0xFFEFF47D);b=II(b,c,d,a,x[k+1],S44,0x85845DD1);
    a=II(a,b,c,d,x[k+8],S41,0x6FA87E4F);d=II(d,a,b,c,x[k+15],S42,0xFE2CE6E0);c=II(c,d,a,b,x[k+6],S43,0xA3014314);b=II(b,c,d,a,x[k+13],S44,0x4E0811A1);
    a=II(a,b,c,d,x[k+4],S41,0xF7537E82);d=II(d,a,b,c,x[k+11],S42,0xBD3AF235);c=II(c,d,a,b,x[k+2],S43,0x2AD7D2BB);b=II(b,c,d,a,x[k+9],S44,0xEB86D391);
    a=addUnsigned(a,AA);b=addUnsigned(b,BB);c=addUnsigned(c,CC);d=addUnsigned(d,DD);
  }

  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

function sha1(input: string): string {
  const rotLeft = (n: number, s: number) => (n << s) | (n >>> (32 - s));

  const cvtHex = (val: number) => {
    let str = "";
    for (let i = 7; i >= 0; i--) {
      const v = (val >>> (i * 4)) & 0x0f;
      str += v.toString(16);
    }
    return str;
  };

  const utf8Encode = (str: string) => {
    let utfStr = "";
    for (let n = 0; n < str.length; n++) {
      const c = str.charCodeAt(n);
      if (c < 128) {
        utfStr += String.fromCharCode(c);
      } else if (c > 127 && c < 2048) {
        utfStr += String.fromCharCode((c >> 6) | 192);
        utfStr += String.fromCharCode((c & 63) | 128);
      } else {
        utfStr += String.fromCharCode((c >> 12) | 224);
        utfStr += String.fromCharCode(((c >> 6) & 63) | 128);
        utfStr += String.fromCharCode((c & 63) | 128);
      }
    }
    return utfStr;
  };

  const str = utf8Encode(input);
  const strLen = str.length;

  const wordArray: number[] = [];
  for (let i = 0; i < strLen - 3; i += 4) {
    wordArray.push(
      (str.charCodeAt(i) << 24) |
      (str.charCodeAt(i + 1) << 16) |
      (str.charCodeAt(i + 2) << 8) |
      str.charCodeAt(i + 3)
    );
  }

  const remainder = strLen % 4;
  if (remainder === 0) wordArray.push(0x080000000);
  else if (remainder === 1) wordArray.push((str.charCodeAt(strLen - 1) << 24) | 0x0800000);
  else if (remainder === 2) wordArray.push((str.charCodeAt(strLen - 2) << 24) | (str.charCodeAt(strLen - 1) << 16) | 0x08000);
  else wordArray.push((str.charCodeAt(strLen - 3) << 24) | (str.charCodeAt(strLen - 2) << 16) | (str.charCodeAt(strLen - 1) << 8) | 0x80);

  while (wordArray.length % 16 !== 14) wordArray.push(0);
  wordArray.push(strLen >>> 29);
  wordArray.push((strLen << 3) & 0x0ffffffff);

  let H0 = 0x67452301, H1 = 0xEFCDAB89, H2 = 0x98BADCFE, H3 = 0x10325476, H4 = 0xC3D2E1F0;

  const W = new Array<number>(80);
  for (let blockstart = 0; blockstart < wordArray.length; blockstart += 16) {
    for (let i = 0; i < 16; i++) W[i] = wordArray[blockstart + i];
    for (let i = 16; i <= 79; i++) W[i] = rotLeft(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);

    let A = H0, B = H1, C = H2, D = H3, E = H4;
    for (let i = 0; i <= 19; i++) {
      const temp = (rotLeft(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5A827999) & 0x0ffffffff;
      E = D; D = C; C = rotLeft(B, 30); B = A; A = temp;
    }
    for (let i = 20; i <= 39; i++) {
      const temp = (rotLeft(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff;
      E = D; D = C; C = rotLeft(B, 30); B = A; A = temp;
    }
    for (let i = 40; i <= 59; i++) {
      const temp = (rotLeft(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff;
      E = D; D = C; C = rotLeft(B, 30); B = A; A = temp;
    }
    for (let i = 60; i <= 79; i++) {
      const temp = (rotLeft(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff;
      E = D; D = C; C = rotLeft(B, 30); B = A; A = temp;
    }

    H0 = (H0 + A) & 0x0ffffffff;
    H1 = (H1 + B) & 0x0ffffffff;
    H2 = (H2 + C) & 0x0ffffffff;
    H3 = (H3 + D) & 0x0ffffffff;
    H4 = (H4 + E) & 0x0ffffffff;
  }

  return (cvtHex(H0) + cvtHex(H1) + cvtHex(H2) + cvtHex(H3) + cvtHex(H4)).toLowerCase();
}

function generateAuth(login: string, password: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const md5Password = md5(password);
  const shaHash = sha1(md5Password + timestamp);
  return `${login}:${shaHash}:${timestamp}`;
}

async function apiRequest<T>(
  action: string,
  config: CrmConfig,
  extraParams: Record<string, string | number> = {}
): Promise<T> {
  if (!config.login || !config.password || !config.cityId) {
    throw new Error("Yandex Tickets: login, password, and cityId are required");
  }

  const auth = generateAuth(config.login, config.password);
  const params = new URLSearchParams({
    action,
    auth,
    city_id: String(config.cityId),
  });

  for (const [key, value] of Object.entries(extraParams)) {
    params.set(key, String(value));
  }

  const url = `${BASE_URL}?${params.toString()}`;
  console.log(`[YandexAPI] Request: ${action}`, { cityId: config.cityId });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`[YandexAPI] HTTP ${response.status}: ${response.statusText}`);
  }

  const json = await response.json();
  console.log(`[YandexAPI] Response for ${action}: status=${json.status}`);

  if (json.status === "1" || json.status === 1) {
    throw new Error(`[YandexAPI] Error: ${json.error || "Unknown error"}`);
  }

  return json.result as T;
}

function unwrapResult<T>(result: unknown): T[] {
  if (!Array.isArray(result)) return [];
  if (result.length === 0) return [];

  if (Array.isArray(result[0])) {
    return result.map((item: unknown) => {
      if (Array.isArray(item) && item.length > 0) return item[0] as T;
      return item as T;
    });
  }

  return result as T[];
}

export async function fetchCities(config: CrmConfig): Promise<YandexCity[]> {
  if (!config.login || !config.password) {
    throw new Error("Login and password required");
  }

  const auth = generateAuth(config.login, config.password);
  const params = new URLSearchParams({
    action: "crm.city.list",
    auth,
  });

  const url = `${BASE_URL}?${params.toString()}`;
  console.log("[YandexAPI] Fetching cities...");

  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const json = await response.json();
  if (json.status === "1" || json.status === 1) {
    throw new Error(json.error || "Failed to fetch cities");
  }

  return unwrapResult<YandexCity>(json.result);
}

function mapEventStatus(rawStatus: number, eventDate: string): EventStatus {
  const now = new Date();
  const date = new Date(eventDate);
  const hoursDiff = (date.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (rawStatus === 0) {
    if (hoursDiff < -4) return "completed";
    return "cancelled";
  }

  if (hoursDiff > 0) return "upcoming";
  if (hoursDiff > -4) return "ongoing";
  return "completed";
}

function guessCategory(name: string): EventCategory {
  const lower = name.toLowerCase();
  if (lower.includes("концерт") || lower.includes("тур")) return "concert";
  if (lower.includes("турнир") || lower.includes("чемпионат") || lower.includes("матч")) return "tournament";
  if (lower.includes("фест") || lower.includes("festival")) return "festival";
  if (lower.includes("театр") || lower.includes("балет") || lower.includes("опера") || lower.includes("спектакль")) return "theater";
  if (lower.includes("спорт") || lower.includes("хоккей") || lower.includes("футбол") || lower.includes("баскетбол")) return "sport";
  return "other";
}

export async function fetchYandexEvents(config: CrmConfig): Promise<TicketEvent[]> {
  console.log("[YandexAPI] Fetching events...");

  const rawResult = await apiRequest<unknown>("crm.event.list", config);
  const rawEvents = unwrapResult<YandexEventRaw>(rawResult);

  if (!rawEvents || rawEvents.length === 0) {
    console.log("[YandexAPI] No events found");
    return [];
  }
  console.log(`[YandexAPI] Unwrapped ${rawEvents.length} events`);

  const eventIds = rawEvents.map((e) => e.id).join(",");
  let reports: YandexEventReport[] = [];
  try {
    const reportResult = await apiRequest<YandexEventReport[] | unknown>("crm.report.event", config, {
      event_ids: eventIds,
    });
    if (Array.isArray(reportResult)) {
      if (reportResult.length > 0 && Array.isArray(reportResult[0])) {
        reports = unwrapResult<YandexEventReport>(reportResult);
      } else {
        reports = reportResult as YandexEventReport[];
      }
    }
    console.log(`[YandexAPI] Got ${reports.length} report entries`);
  } catch (err) {
    console.log("[YandexAPI] Failed to fetch event reports:", err);
  }

  const reportMap = new Map<number, YandexEventReport>();
  for (const r of reports) {
    const existing = reportMap.get(r.event_id);
    if (existing) {
      existing.tickets_sold += r.tickets_sold;
      existing.tickets_sold_sum += r.tickets_sold_sum;
      existing.tickets_count += r.tickets_count;
      existing.tickets_available += r.tickets_available;
      existing.tickets_returned += r.tickets_returned;
      existing.tickets_booked += r.tickets_booked;
    } else {
      reportMap.set(r.event_id, { ...r });
    }
  }

  const now = new Date().toISOString();

  return rawEvents.map((raw): TicketEvent => {
    const report = reportMap.get(raw.id);
    const ticketsSold = report?.tickets_sold ?? 0;
    const ticketsTotal = report?.tickets_count ?? 0;
    const revenue = report?.tickets_sold_sum ?? 0;
    const avgPrice = ticketsSold > 0 ? Math.round(revenue / ticketsSold) : 0;

    return {
      id: String(raw.id),
      title: raw.name ?? report?.event_name ?? `Event #${raw.id}`,
      category: guessCategory(raw.name ?? ""),
      status: mapEventStatus(raw.status, raw.date),
      venue: "",
      city: "",
      date: raw.date,
      ticketsSold,
      ticketsTotal,
      ticketPrice: avgPrice,
      revenue,
      createdAt: now,
      updatedAt: now,
      activityId: raw.activity_id,
    };
  });
}

export async function fetchYandexOrders(
  config: CrmConfig,
  startDate?: string,
  endDate?: string
): Promise<TicketSale[]> {
  console.log("[YandexAPI] Fetching orders...");

  const params: Record<string, string | number> = { status: 1 };
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;

  const rawResult = await apiRequest<unknown>("crm.order.list", config, params);
  const rawOrders = unwrapResult<YandexOrder>(rawResult);

  if (!rawOrders || rawOrders.length === 0) {
    console.log("[YandexAPI] No orders found");
    return [];
  }

  console.log(`[YandexAPI] Unwrapped ${rawOrders.length} orders`);

  const paidOrders = rawOrders.filter(
    (order) => order.status === 1 && order.is_returned !== 1
  );
  const droppedCount = rawOrders.length - paidOrders.length;
  if (droppedCount > 0) {
    const statusCounts: Record<string, number> = {};
    for (const order of rawOrders) {
      if (order.status !== 1 || order.is_returned === 1) {
        const key = order.is_returned === 1 ? "returned" : `status_${order.status}`;
        statusCounts[key] = (statusCounts[key] ?? 0) + 1;
      }
    }
    console.log(`[YandexAPI] Skipped ${droppedCount} unpaid/returned orders:`, statusCounts);
  }

  return paidOrders.map((order): TicketSale => {
    const fullName = [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(" ").trim();
    const fallbackName = order.customer?.name?.trim() ?? "";
    const buyerName = fullName || fallbackName || order.customer?.email || "Покупатель";

    return {
      id: String(order.id),
      eventId: String(order.event_id),
      eventTitle: `Event #${order.event_id}`,
      buyerName,
      quantity: order.tickets_count ?? 1,
      unitPrice: order.tickets_count > 0 ? Math.round(order.sum / order.tickets_count) : order.sum,
      totalAmount: order.sum,
      timestamp: order.order_date,
      orderId: order.id,
      customerId: order.customer?.id ? String(order.customer.id) : undefined,
      customerEmail: order.customer?.email,
      customerPhone: order.customer?.phone,
      customerAddress: order.customer?.address,
    };
  });
}

export function enrichSalesWithEventNames(
  sales: TicketSale[],
  events: TicketEvent[]
): TicketSale[] {
  const eventMap = new Map<string, string>();
  for (const ev of events) {
    eventMap.set(ev.id, ev.title);
  }
  return sales.map((sale) => ({
    ...sale,
    eventTitle: eventMap.get(sale.eventId) ?? sale.eventTitle,
  }));
}

export async function fetchYandexActivities(
  config: CrmConfig,
  events: TicketEvent[],
  startDate?: string,
  endDate?: string
): Promise<ActivityItem[]> {
  const sales = await fetchYandexOrders(config, startDate, endDate);

  const eventMap = new Map<string, TicketEvent>();
  for (const ev of events) {
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

  return sales.map((sale): ActivityItem => {
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
}

export async function testConnection(config: CrmConfig): Promise<{ success: boolean; message: string; cities?: YandexCity[] }> {
  try {
    console.log("[YandexAPI] Testing connection...");
    const cities = await fetchCities(config);
    console.log("[YandexAPI] Connection successful, cities:", cities.length);
    return {
      success: true,
      message: `Подключено. Найдено городов: ${cities.length}`,
      cities,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.log("[YandexAPI] Connection failed:", msg);
    return { success: false, message: `Ошибка: ${msg}` };
  }
}
