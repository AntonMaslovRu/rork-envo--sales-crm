function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Не задана обязательная переменная окружения: ${name} (см. .env.example)`);
  }
  return value;
}

const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

export const config = {
  // Яндекс.Билеты (те же данные, что вводятся в приложении Envo)
  yandexLogin: required("YANDEX_LOGIN"),
  yandexPassword: required("YANDEX_PASSWORD"),
  yandexCityId: required("YANDEX_CITY_ID"),

  // Microsoft 365 / Graph API. В dry-run не нужны — письма только логируются.
  msTenantId: dryRun ? process.env.MS_TENANT_ID ?? "" : required("MS_TENANT_ID"),
  msClientId: dryRun ? process.env.MS_CLIENT_ID ?? "" : required("MS_CLIENT_ID"),
  msClientSecret: dryRun ? process.env.MS_CLIENT_SECRET ?? "" : required("MS_CLIENT_SECRET"),
  mailFrom: dryRun ? process.env.MAIL_FROM ?? "dry-run@example.com" : required("MAIL_FROM"),

  adminToken: required("ADMIN_TOKEN"),

  pollIntervalSec: Number(process.env.POLL_INTERVAL_SEC ?? 60),
  // Сколько дней назад смотреть заказы — ограничивает объём ответа API
  lookbackDays: Number(process.env.LOOKBACK_DAYS ?? 7),
  maxSendAttempts: Number(process.env.MAX_SEND_ATTEMPTS ?? 5),

  port: Number(process.env.PORT ?? 8080),
  dbPath: process.env.DB_PATH ?? "data/bot.sqlite",
  dryRun,
};
