# Envo Welcome Bot

Бот следит за новыми продажами билетов в **Яндекс.Билетах** и автоматически отправляет
покупателю вэлком-письмо с инструкциями через ящик **Microsoft 365**. Шаблоны писем
настраиваются per-событие через встроенную веб-админку.

## Как это работает

```
Яндекс.Билеты API              Бот (VPS, Docker)                    Microsoft 365
─────────────────             ─────────────────────────────        ─────────────
crm.order.list   ◄── каждые ── 1. Опрос новых заказов
                     60 сек    2. Дедупликация по order_id (SQLite)
                               3. Шаблон события или по умолчанию
                               4. Подстановка данных покупателя ──► Graph sendMail
                               5. Журнал: sent / error / skipped
```

- **Дедупликация**: каждый `order_id` обрабатывается ровно один раз; при первом запуске
  все существующие заказы помечаются «без отправки», чтобы не разослать письма по старым продажам.
- **Ретраи**: при ошибке отправки заказ повторяется на следующих циклах (до 5 попыток).
- **Шаблоны**: свой шаблон на событие; если его нет — используется шаблон по умолчанию;
  если нет и его — письмо не отправляется (фиксируется в журнале).

## Настройка Microsoft 365 (однократно, нужен администратор тенанта)

1. [portal.azure.com](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**.
   Имя: `envo-welcome-bot`, тип аккаунтов: *Single tenant*. Redirect URI не нужен.
2. На странице приложения скопируй **Application (client) ID** → `MS_CLIENT_ID`
   и **Directory (tenant) ID** → `MS_TENANT_ID`.
3. **Certificates & secrets** → **New client secret** (срок 24 мес.) → значение → `MS_CLIENT_SECRET`.
   ⚠️ Показывается один раз; поставь напоминание о продлении.
4. **API permissions** → **Add a permission** → **Microsoft Graph** → **Application permissions** →
   `Mail.Send` → **Add** → кнопка **Grant admin consent**.
5. Создай (или выбери) ящик-отправитель, например `tickets@вашдомен.ru` → `MAIL_FROM`.
6. **Рекомендуется**: разрешение `Mail.Send` даёт отправку от имени *любого* ящика тенанта.
   Ограничь его одним ящиком через Exchange Online PowerShell:

   ```powershell
   New-DistributionGroup -Name "envo-bot-allowed" -Type Security
   Add-DistributionGroupMember -Identity "envo-bot-allowed" -Member tickets@вашдомен.ru
   New-ApplicationAccessPolicy -AppId <MS_CLIENT_ID> -PolicyScopeGroupId envo-bot-allowed@вашдомен.ru -AccessRight RestrictAccess
   ```

## Развёртывание на Selectel VPS

Хватит самой дешёвой конфигурации (1 vCPU / 1 ГБ RAM), ОС — Ubuntu 24.04.

```bash
# 1. Docker
curl -fsSL https://get.docker.com | sh

# 2. Код
git clone <url этого репозитория>
cd rork-envo--sales-crm/bot

# 3. Конфиг
cp .env.example .env
nano .env            # заполнить все переменные; токен: openssl rand -hex 24

# 4. Запуск
docker compose up -d --build
docker compose logs -f    # убедиться, что опрос пошёл
```

Обновление: `git pull && docker compose up -d --build`.
База (шаблоны + журнал) лежит в `./data/bot.sqlite` — включи её в бэкап.

## Админка

Порт 8080 открыт только на localhost сервера. Доступ — через SSH-туннель со своего компьютера:

```bash
ssh -L 8080:localhost:8080 root@<ip-сервера>
```

Затем открой [http://localhost:8080](http://localhost:8080) и введи `ADMIN_TOKEN`.
В админке: шаблон по умолчанию, шаблоны по событиям, тестовая отправка, журнал.

Если захочется доступ без туннеля — добавь домен и Caddy (2 строки конфига дадут HTTPS),
но для одного администратора туннель проще и безопаснее.

### Подстановки в шаблонах

| Плейсхолдер | Значение |
|---|---|
| `{{buyer_name}}` | Имя покупателя |
| `{{event_title}}` | Название события |
| `{{event_date}}` | Дата и время события (МСК) |
| `{{tickets_count}}` | Количество билетов |
| `{{total}}` | Сумма заказа |
| `{{order_id}}` | Номер заказа |

## Первый запуск без риска

1. В `.env` поставь `DRY_RUN=1` — письма будут только в логах (`docker compose logs -f`).
2. Заведи шаблоны, отправь тестовое письмо из админки на свой адрес.
3. Дождись реальной продажи, проверь в логах, что письмо сформировалось правильно.
4. Убери `DRY_RUN`, перезапусти: `docker compose up -d`.

## API (для будущей интеграции с приложением Envo)

Все запросы с заголовком `Authorization: Bearer <ADMIN_TOKEN>`:

- `GET /api/events` — события с флагом наличия шаблона
- `GET|PUT|DELETE /api/templates/:eventId` — шаблоны (`*` = по умолчанию)
- `GET /api/orders?limit=100` — журнал обработки
- `POST /api/test-email` `{to, event_id}` — тестовая отправка
- `GET /api/health` — без токена, для мониторинга
