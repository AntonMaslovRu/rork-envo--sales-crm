import { Hono } from "hono";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { config } from "./config.js";
import { listTemplates, getTemplate, upsertTemplate, deleteTemplate, listOrders } from "./db.js";
import { fetchEvents } from "./yandex.js";
import { sendMail } from "./graph.js";
import { render, formatDate, PLACEHOLDERS, type TemplateVars } from "./template.js";

const adminHtml = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "admin.html"), "utf-8");

export const app = new Hono();

app.get("/", (c) => c.html(adminHtml));
app.get("/api/health", (c) => c.json({ ok: true, dryRun: config.dryRun }));

// Всё остальное под /api/* — только с токеном админки
app.use("/api/*", async (c, next) => {
  if (c.req.path === "/api/health") return next();
  const auth = c.req.header("Authorization");
  if (auth !== `Bearer ${config.adminToken}`) {
    return c.json({ error: "unauthorized" }, 401);
  }
  return next();
});

app.get("/api/events", async (c) => {
  const events = await fetchEvents();
  const templates = new Set(listTemplates().map((t) => t.event_id));
  return c.json(
    events.map((e) => ({
      id: String(e.id),
      title: e.name ?? `Событие #${e.id}`,
      date: e.date,
      hasTemplate: templates.has(String(e.id)),
    }))
  );
});

app.get("/api/templates", (c) => c.json({ templates: listTemplates(), placeholders: PLACEHOLDERS }));

app.get("/api/templates/:eventId", (c) => {
  const template = getTemplate(c.req.param("eventId"));
  return template ? c.json(template) : c.json({ error: "not_found" }, 404);
});

app.put("/api/templates/:eventId", async (c) => {
  const body = await c.req.json<{ subject?: string; body?: string; enabled?: boolean; event_title?: string }>();
  if (!body.subject?.trim() || !body.body?.trim()) {
    return c.json({ error: "subject и body обязательны" }, 400);
  }
  upsertTemplate({
    event_id: c.req.param("eventId"),
    event_title: body.event_title ?? null,
    subject: body.subject,
    body: body.body,
    enabled: body.enabled === false ? 0 : 1,
  });
  return c.json({ ok: true });
});

app.delete("/api/templates/:eventId", (c) => {
  deleteTemplate(c.req.param("eventId"));
  return c.json({ ok: true });
});

app.get("/api/orders", (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 100), 500);
  return c.json(listOrders(limit));
});

// Тестовая отправка шаблона на свой адрес с примерными данными
app.post("/api/test-email", async (c) => {
  const { to, event_id } = await c.req.json<{ to?: string; event_id?: string }>();
  if (!to || !event_id) return c.json({ error: "to и event_id обязательны" }, 400);

  const template = getTemplate(event_id) ?? getTemplate("*");
  if (!template) return c.json({ error: "шаблон не найден" }, 404);

  const events = await fetchEvents();
  const event = events.find((e) => String(e.id) === event_id);
  const vars: TemplateVars = {
    buyer_name: "Иван Тестов",
    event_title: event?.name ?? "Тестовое событие",
    event_date: formatDate(event?.date ?? new Date().toISOString()),
    tickets_count: "2",
    total: "5000",
    order_id: "TEST-0001",
  };

  try {
    await sendMail(to, `[ТЕСТ] ${render(template.subject, vars)}`, render(template.body, vars));
    return c.json({ ok: true, dryRun: config.dryRun });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 502);
  }
});
