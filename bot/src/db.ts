import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config.js";

mkdirSync(dirname(config.dbPath), { recursive: true });

export const db = new Database(config.dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- event_id = '*' — шаблон по умолчанию для событий без своего шаблона
  CREATE TABLE IF NOT EXISTS templates (
    event_id TEXT PRIMARY KEY,
    event_title TEXT,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    order_id TEXT PRIMARY KEY,
    event_id TEXT,
    event_title TEXT,
    buyer_name TEXT,
    email TEXT,
    -- seeded | sent | error | skipped_no_email | skipped_no_template
    status TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    processed_at TEXT
  );
`);

export interface TemplateRow {
  event_id: string;
  event_title: string | null;
  subject: string;
  body: string;
  enabled: number;
  updated_at: string;
}

export interface OrderRow {
  order_id: string;
  event_id: string | null;
  event_title: string | null;
  buyer_name: string | null;
  email: string | null;
  status: string;
  attempts: number;
  last_error: string | null;
  processed_at: string | null;
}

export function getMeta(key: string): string | undefined {
  const row = db.prepare("SELECT value FROM meta WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value;
}

export function setMeta(key: string, value: string): void {
  db.prepare("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
}

export function getTemplate(eventId: string): TemplateRow | undefined {
  return db.prepare("SELECT * FROM templates WHERE event_id = ?").get(eventId) as TemplateRow | undefined;
}

export function listTemplates(): TemplateRow[] {
  return db.prepare("SELECT * FROM templates ORDER BY event_id = '*' DESC, updated_at DESC").all() as TemplateRow[];
}

export function upsertTemplate(t: Omit<TemplateRow, "updated_at">): void {
  db.prepare(`
    INSERT INTO templates (event_id, event_title, subject, body, enabled, updated_at)
    VALUES (@event_id, @event_title, @subject, @body, @enabled, datetime('now'))
    ON CONFLICT(event_id) DO UPDATE SET
      event_title = excluded.event_title,
      subject = excluded.subject,
      body = excluded.body,
      enabled = excluded.enabled,
      updated_at = excluded.updated_at
  `).run(t);
}

export function deleteTemplate(eventId: string): void {
  db.prepare("DELETE FROM templates WHERE event_id = ?").run(eventId);
}

export function getOrder(orderId: string): OrderRow | undefined {
  return db.prepare("SELECT * FROM orders WHERE order_id = ?").get(orderId) as OrderRow | undefined;
}

export function listOrders(limit: number): OrderRow[] {
  return db.prepare("SELECT * FROM orders ORDER BY processed_at DESC LIMIT ?").all(limit) as OrderRow[];
}

export function saveOrder(row: Omit<OrderRow, "processed_at">): void {
  db.prepare(`
    INSERT INTO orders (order_id, event_id, event_title, buyer_name, email, status, attempts, last_error, processed_at)
    VALUES (@order_id, @event_id, @event_title, @buyer_name, @email, @status, @attempts, @last_error, datetime('now'))
    ON CONFLICT(order_id) DO UPDATE SET
      status = excluded.status,
      attempts = excluded.attempts,
      last_error = excluded.last_error,
      processed_at = excluded.processed_at
  `).run(row);
}
