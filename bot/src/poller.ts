import { config } from "./config.js";
import { fetchOrders, fetchEvents, eventTitle, type YandexOrder, type YandexEvent } from "./yandex.js";
import { getMeta, setMeta, getOrder, saveOrder, getTemplate } from "./db.js";
import { sendMail } from "./graph.js";
import { render, formatDate } from "./template.js";

function buyerName(order: YandexOrder): string {
  const fullName = [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(" ").trim();
  return fullName || order.customer?.name?.trim() || "Покупатель";
}

function lookbackDate(): string {
  const date = new Date(Date.now() - config.lookbackDays * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

async function processOrder(order: YandexOrder, events: YandexEvent[], attempts: number): Promise<void> {
  const orderId = String(order.id);
  const eventId = String(order.event_id);
  const title = eventTitle(events, eventId);
  const email = order.customer?.email?.trim();

  const base = {
    order_id: orderId,
    event_id: eventId,
    event_title: title,
    buyer_name: buyerName(order),
    email: email ?? null,
  };

  if (!email || !email.includes("@")) {
    saveOrder({ ...base, status: "skipped_no_email", attempts, last_error: null });
    return;
  }

  // Шаблон события, иначе шаблон по умолчанию ('*')
  const template = getTemplate(eventId) ?? getTemplate("*");
  if (!template || !template.enabled) {
    saveOrder({ ...base, status: "skipped_no_template", attempts, last_error: null });
    return;
  }

  const vars = {
    buyer_name: base.buyer_name,
    event_title: title,
    event_date: formatDate(events.find((e) => String(e.id) === eventId)?.date ?? ""),
    tickets_count: String(order.tickets_count ?? 1),
    total: String(order.sum ?? ""),
    order_id: orderId,
  };

  try {
    await sendMail(email, render(template.subject, vars), render(template.body, vars));
    saveOrder({ ...base, status: "sent", attempts: attempts + 1, last_error: null });
    console.log(`[Poller] Письмо отправлено: заказ ${orderId}, ${email}, «${title}»`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    saveOrder({ ...base, status: "error", attempts: attempts + 1, last_error: message });
    console.error(`[Poller] Ошибка отправки для заказа ${orderId}: ${message}`);
  }
}

export async function pollOnce(): Promise<void> {
  const [orders, events] = await Promise.all([fetchOrders(lookbackDate()), fetchEvents()]);

  // Первый запуск: помечаем все существующие заказы обработанными, ничего не шлём,
  // чтобы не разослать письма по старым продажам
  if (!getMeta("seeded")) {
    for (const order of orders) {
      saveOrder({
        order_id: String(order.id),
        event_id: String(order.event_id),
        event_title: eventTitle(events, String(order.event_id)),
        buyer_name: buyerName(order),
        email: order.customer?.email ?? null,
        status: "seeded",
        attempts: 0,
        last_error: null,
      });
    }
    setMeta("seeded", new Date().toISOString());
    console.log(`[Poller] Первый запуск: ${orders.length} существующих заказов помечены без отправки`);
    return;
  }

  for (const order of orders) {
    const existing = getOrder(String(order.id));
    if (!existing) {
      await processOrder(order, events, 0);
    } else if (existing.status === "error" && existing.attempts < config.maxSendAttempts) {
      await processOrder(order, events, existing.attempts);
    }
  }
}

export function startPoller(): void {
  const tick = async () => {
    try {
      await pollOnce();
    } catch (err) {
      console.error("[Poller] Ошибка цикла опроса:", err instanceof Error ? err.message : err);
    } finally {
      setTimeout(tick, config.pollIntervalSec * 1000);
    }
  };
  console.log(`[Poller] Запущен, интервал ${config.pollIntervalSec} c${config.dryRun ? ", DRY RUN — письма не отправляются" : ""}`);
  void tick();
}
