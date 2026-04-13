# Local Development Runbook

## Текущее состояние

- `core-api` подключен к локальным PostgreSQL и Redis.
- `admin-portal`, `manager-cabinet` и `employee-cabinet` получают данные из live API через `@galiaf/sdk`.
- `public-site` показывает live snapshot по `health` и `public auth config`.
- `mobile` использует тот же auth/API contract, позволяет переключать `baseUrl` под iOS simulator, Android emulator и внешний хост, а также проверяет dev persona (`employee`, `company_manager`, `platform_admin`) через live `session/access` ручки.
- `chat-service` использует тот же auth contract для websocket handshake и tenant-aware комнат.
- `chat-service` хранит историю сообщений в отдельной PostgreSQL базе `galiaf_chat`.
- `chat-service` использует Redis как realtime bus между инстансами и для shared participant counting по room.
- `chat-service` использует lease-based room membership в Redis: heartbeat продлевает live sockets, а просроченные entries очищаются при очередном room count.
- `chat-service` хранит delivery acknowledgements и read receipts в PostgreSQL и рассылает их как `chat:message-updated`.
- `chat-service` использует notification outbox в PostgreSQL и публикует push-ready события в Redis channel `galiaf:chat:notifications`.
- Локальная память в `chat-service` теперь держит только активные socket connections и runtime bookkeeping текущего процесса.

## Локальные зависимости

- PostgreSQL должен быть доступен локально.
- Redis должен быть доступен локально.
- Для текущей ServBay-конфигурации `core-api` использует:
  - PostgreSQL unix socket `/Applications/ServBay/tmp/.s.PGSQL.5432`
  - Redis TCP `127.0.0.1:6379`

## Переменные окружения

Локальный backend читает `.env` из `apps/api/core-api/`.

Минимально важные переменные:

- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `REDIS_URL`
- `AUTH_MODE`
- `AUTH_DEV_BYPASS_ENABLED`

Для `chat-service` отдельная БД конфигурируется через:

- `CHAT_DATABASE_HOST`
- `CHAT_DATABASE_PORT`
- `CHAT_DATABASE_NAME`
- `CHAT_DATABASE_ADMIN_NAME`
- `CHAT_DATABASE_USER`
- `CHAT_DATABASE_PASSWORD`
- `REDIS_URL`
- `CHAT_PRESENCE_TTL_SECONDS`
- `CHAT_PRESENCE_HEARTBEAT_SECONDS`
- `CHAT_NOTIFICATION_DISPATCH_INTERVAL_MS`
- `CHAT_NOTIFICATION_BATCH_SIZE`
- `CHAT_NOTIFICATION_STALE_SECONDS`
- `CHAT_NOTIFICATION_MAX_ATTEMPTS`

Если `CHAT_DATABASE_*` не заданы, сервис берет сетевые параметры из `DATABASE_*`, но по умолчанию использует отдельную БД `galiaf_chat`.
Если `REDIS_URL` не задан, сервис использует `redis://:1234@127.0.0.1:6379`.
Если `CHAT_PRESENCE_*` не заданы, сервис использует `TTL=45s` и `heartbeat=15s`.
Если `CHAT_NOTIFICATION_*` не заданы, сервис использует `interval=2000ms`, `batch=100`, `stale=90s`, `maxAttempts=5`.

## Команды запуска

### Backend

```bash
cd /Applications/ServBay/www/galiaf/apps/api/core-api
XDG_CACHE_HOME=/tmp/corepack-cache COREPACK_HOME=/tmp/corepack-home corepack pnpm dev
```

Для backend smoke test manager flow:

```bash
cd /Applications/ServBay/www/galiaf
node scripts/core-api-manager-smoke-test.mjs
```

Скрипт проверяет manager flow end-to-end: создание приглашения, принятие приглашения сотрудником, прямое provisioning сотрудника в организацию, DB-backed профиль `users/me`, доступ employee к workspace и запрет на `GET /users`.

### Web

```bash
cd /Applications/ServBay/www/galiaf
XDG_CACHE_HOME=/tmp/corepack-cache COREPACK_HOME=/tmp/corepack-home corepack pnpm --filter @galiaf/web-public-site dev
XDG_CACHE_HOME=/tmp/corepack-cache COREPACK_HOME=/tmp/corepack-home corepack pnpm --filter @galiaf/web-admin-portal dev
XDG_CACHE_HOME=/tmp/corepack-cache COREPACK_HOME=/tmp/corepack-home corepack pnpm --filter @galiaf/web-manager-cabinet dev
XDG_CACHE_HOME=/tmp/corepack-cache COREPACK_HOME=/tmp/corepack-home corepack pnpm --filter @galiaf/web-employee-cabinet dev
```

Для web smoke test по трем кабинетам:

```bash
cd /Applications/ServBay/www/galiaf
node scripts/web-cabinets-smoke-test.mjs
```

Скрипт ожидает, что `core-api`, `admin-portal`, `manager-cabinet` и `employee-cabinet` уже подняты локально, проверяет `health` у backend и затем валидирует живые HTML-страницы по role-specific маркерам.

### Mobile

```bash
cd /Applications/ServBay/www/galiaf/apps/mobile/app
XDG_CACHE_HOME=/tmp/corepack-cache COREPACK_HOME=/tmp/corepack-home corepack pnpm start
```

После запуска в dev build можно:

- переключать `baseUrl`;
- переключать dev persona;
- проверять `session`, `access/roles`, `workspace`, `admin bootstrap`;
- валидировать ожидаемые `403` для employee на restricted routes.

### Chat

```bash
cd /Applications/ServBay/www/galiaf/services/chat
XDG_CACHE_HOME=/tmp/corepack-cache COREPACK_HOME=/tmp/corepack-home corepack pnpm dev
```

`chat-service` слушает `http://127.0.0.1:4010` и websocket namespace `/chat`.
При старте сервис автоматически создает базу `galiaf_chat`, если она еще не существует и у пользователя PostgreSQL есть право на `CREATE DATABASE`.
Для multi-instance локальной проверки можно поднять две ноды на разных портах с общим `REDIS_URL`.

Для локальной проверки websocket handshake можно передавать:

- `Authorization: Bearer <token>` в handshake headers;
- либо `x-dev-auth-context` в headers/auth payload при включенном dev bypass.

Для e2e smoke test manager/employee:

```bash
cd /Applications/ServBay/www/galiaf
node scripts/chat-smoke-test.mjs
```

Скрипт поднимает два websocket-клиента, заводит их в `org:org_alpha`, отправляет сообщение от manager к employee, подтверждает `chat:ack-delivered` и `chat:ack-read`, проверяет broadcast `chat:message-updated`, подтверждает рост `notificationOutbox.dispatched` в `health/snapshot`, а также убеждается, что unauthorized join в `org:org_bravo` блокируется.

Для split-instance smoke test:

```bash
cd /Applications/ServBay/www/galiaf
CHAT_SERVICE_URL_MANAGER=http://127.0.0.1:4010/chat \
CHAT_SERVICE_URL_EMPLOYEE=http://127.0.0.1:4011/chat \
node scripts/chat-smoke-test.mjs
```

Этот прогон подтверждает межинстансовую доставку через Redis bus и shared participant counting.

Дополнительно lease cleanup можно проверить, положив вручную просроченный member в Redis и затем повторив smoke test: join flow должен его вычистить и сохранить корректные `participantCount`.

## Проверка API

### Health

```bash
curl http://127.0.0.1:4000/api/v1/health
```

### Platform admin

```bash
curl -H 'x-dev-auth-context: {"sub":"demo-admin","email":"admin@galiaf.local","name":"Platform Admin","platformRoles":["platform_admin"],"tenantMemberships":[]}' \
  http://127.0.0.1:4000/api/v1/users/me
```

### Company manager

```bash
curl -H 'x-dev-auth-context: {"sub":"demo-manager-alpha","email":"manager.alpha@galiaf.local","name":"Manager Alpha","platformRoles":[],"tenantMemberships":[{"organizationId":"org_alpha","roles":["company_manager"]}],"activeTenantId":"org_alpha"}' \
  http://127.0.0.1:4000/api/v1/users
```

### Employee

`employee` не должен получать списки пользователей и приглашений. Для этих ручек ожидается `403`.

## Что уже задокументировано

- ADR по монорепо, ролям, chat service, mobile build strategy и centralized OIDC auth.
- PDR по product scope, кабинетам, delivery и authentication/session model.
- Runbook по deployment.

## Что документировать дальше

- миграции и production schema strategy;
- окончательный OIDC provider setup;
- chat-service retention policy и attachment pipeline;
- production secrets management и rollback policy.
