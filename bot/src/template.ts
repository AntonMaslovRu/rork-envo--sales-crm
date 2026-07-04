export interface TemplateVars {
  buyer_name: string;
  event_title: string;
  event_date: string;
  tickets_count: string;
  total: string;
  order_id: string;
}

export const PLACEHOLDERS: (keyof TemplateVars)[] = [
  "buyer_name",
  "event_title",
  "event_date",
  "tickets_count",
  "total",
  "order_id",
];

export function render(text: string, vars: TemplateVars): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    if (key in vars) return vars[key as keyof TemplateVars];
    return match;
  });
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return date.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });
}
