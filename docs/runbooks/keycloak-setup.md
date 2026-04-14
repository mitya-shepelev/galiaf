# Keycloak Setup

## Цель

Поднять baseline OIDC provider для `Galiaf` и подготовить переключение `core-api`, `chat-service` и внутренних кабинетов на `AUTH_MODE=oidc`.

## Что уже есть в репозитории

- realm baseline: `infra/auth/keycloak/realm-galiaf.json`
- compose/env baseline: `infra/auth/keycloak/docker-compose.keycloak.yml`, `infra/auth/keycloak/.env.example`
- web OIDC bootstrap для `admin`, `manager`, `employee`
- bearer/JWKS verification в `core-api` и `chat-service`
- chat bridge token для web realtime flow

## Production mapping для `socvid.ru`

Рекомендуемая схема:

- `auth.socvid.ru` -> отдельный Keycloak service
- `admin.socvid.ru` -> `galiaf-admin-portal`
- `manager.socvid.ru` -> `galiaf-manager-cabinet`
- `employee.socvid.ru` -> `galiaf-employee-cabinet`
- `api.socvid.ru` -> `galiaf-core-api`
- `chat.socvid.ru` -> `galiaf-chat-service`

## Быстрый локальный/стендовый запуск через compose

1. Скопировать env:

```bash
cd infra/auth/keycloak
cp .env.example .env
```

2. Указать реальные значения:

- `KEYCLOAK_BOOTSTRAP_ADMIN_PASSWORD`
- `KEYCLOAK_DB_URL`
- `KEYCLOAK_DB_USERNAME`
- `KEYCLOAK_DB_PASSWORD`
- при необходимости `KEYCLOAK_HOSTNAME`

3. Поднять сервис:

```bash
docker compose --env-file .env -f docker-compose.keycloak.yml up -d
```

4. Проверить:

```bash
curl http://127.0.0.1:8080/health/ready
```

5. Открыть admin console и убедиться, что realm `galiaf` импортирован.

## Production запуск в Dokploy для `auth.socvid.ru`

### 1. Подготовить отдельную базу

Для Keycloak лучше сразу создать отдельную PostgreSQL базу, например:

- database: `keycloak`
- user: `keycloak`
- password: отдельный пароль, не переиспользовать пароль `core-api`

### 2. Создать отдельный service в Dokploy

Рекомендуемая конфигурация:

- image: `quay.io/keycloak/keycloak:26.6.0`
- domain: `auth.socvid.ru`
- internal port: `8080`
- command:

```text
start --hostname=https://auth.socvid.ru --proxy-headers=xforwarded --http-enabled=true --import-realm
```

### 3. Добавить env vars в Dokploy

Минимальный рабочий набор:

```text
KC_BOOTSTRAP_ADMIN_USERNAME=admin
KC_BOOTSTRAP_ADMIN_PASSWORD=<strong-password>
KC_HEALTH_ENABLED=true
KC_METRICS_ENABLED=true
KC_HTTP_MANAGEMENT_HEALTH_ENABLED=true
KC_DB=postgres
KC_DB_URL=jdbc:postgresql://<postgres-host>:5432/keycloak
KC_DB_USERNAME=keycloak
KC_DB_PASSWORD=<strong-password>
```

Если Dokploy просит hostname отдельным полем только на уровне домена, это нормально. Ключевой момент в том, что Keycloak должен стартовать с:

- `--hostname=https://auth.socvid.ru`
- `--proxy-headers=xforwarded`
- `--http-enabled=true`

### 4. Импортировать realm baseline

Есть два рабочих варианта:

1. смонтировать `infra/auth/keycloak/realm-galiaf.json` внутрь контейнера как:

```text
/opt/keycloak/data/import/galiaf-realm.json
```

и оставить `--import-realm`;

2. либо один раз импортировать realm вручную через admin console / `kcadm.sh`, если Dokploy volume mount неудобен.

Для первого rollout предпочтителен именно первый вариант, потому что он воспроизводим.

### 5. Проверить готовность Keycloak

После деплоя проверить:

```bash
curl -I https://auth.socvid.ru/realms/galiaf/.well-known/openid-configuration
```

И отдельно discovery:

```bash
curl https://auth.socvid.ru/realms/galiaf/.well-known/openid-configuration
```

Ожидаемый результат:

- `200 OK`
- `issuer` равен `https://auth.socvid.ru/realms/galiaf`

### 6. Проверить clients после импорта

В realm `galiaf` должны существовать:

- `galiaf-admin-portal`
- `galiaf-manager-cabinet`
- `galiaf-employee-cabinet`
- `galiaf-mobile-app`
- `galiaf-core-api`
- `galiaf-chat-service`

## Порядок запуска

1. Поднять `Keycloak` в отдельном сервисе.
2. Импортировать `infra/auth/keycloak/realm-galiaf.json`.
3. Проверить, что realm называется `galiaf`.
4. Проверить clients:
   - `galiaf-admin-portal`
   - `galiaf-manager-cabinet`
   - `galiaf-employee-cabinet`
   - `galiaf-mobile-app`
   - `galiaf-core-api`
   - `galiaf-chat-service`
5. Создать bootstrap users и задать им:
   - email
   - verified email
   - пароль
   - при необходимости realm role `platform_admin`
   - user attributes `active_tenant`
   - multivalued user attribute `tenant_roles`

## Минимальные bootstrap users

### Platform admin

- realm role: `platform_admin`
- `active_tenant` можно не задавать
- `tenant_roles` можно не задавать

### Company manager

- realm role не нужен
- `active_tenant=org_alpha`
- `tenant_roles=company_manager`

### Employee

- realm role не нужен
- `active_tenant=org_alpha`
- `tenant_roles=employee`

## Env для сервисов после переключения на OIDC

### Core api

```text
AUTH_MODE=oidc
AUTH_DEV_BYPASS_ENABLED=false
AUTH_UNSAFE_ALLOW_DEV_BYPASS=false
AUTH_ISSUER_URL=https://auth.socvid.ru/realms/galiaf
AUTH_AUDIENCE=galiaf-core-api
AUTH_JWKS_URI=https://auth.socvid.ru/realms/galiaf/protocol/openid-connect/certs
CHAT_AUTH_AUDIENCE=galiaf-chat-service
CHAT_BRIDGE_SHARED_SECRET=...
CHAT_BRIDGE_ISSUER=galiaf-core-api-chat-bridge
CHAT_BRIDGE_TOKEN_TTL_SECONDS=300
AUTH_ADMIN_WEB_CLIENT_ID=galiaf-admin-portal
AUTH_MANAGER_WEB_CLIENT_ID=galiaf-manager-cabinet
AUTH_EMPLOYEE_WEB_CLIENT_ID=galiaf-employee-cabinet
AUTH_MOBILE_CLIENT_ID=galiaf-mobile-app
```

### Chat

```text
AUTH_MODE=oidc
AUTH_DEV_BYPASS_ENABLED=false
AUTH_UNSAFE_ALLOW_DEV_BYPASS=false
AUTH_ISSUER_URL=https://auth.socvid.ru/realms/galiaf
AUTH_AUDIENCE=galiaf-chat-service
AUTH_JWKS_URI=https://auth.socvid.ru/realms/galiaf/protocol/openid-connect/certs
CHAT_BRIDGE_SHARED_SECRET=...
CHAT_BRIDGE_ISSUER=galiaf-core-api-chat-bridge
AUTH_ADMIN_WEB_CLIENT_ID=galiaf-admin-portal
AUTH_MANAGER_WEB_CLIENT_ID=galiaf-manager-cabinet
AUTH_EMPLOYEE_WEB_CLIENT_ID=galiaf-employee-cabinet
AUTH_MOBILE_CLIENT_ID=galiaf-mobile-app
```

### Admin / Manager / Employee

```text
GALIAF_ENABLE_DEV_PERSONAS=false
```

Обычно этого достаточно, потому что web-app получает issuer и client ids через `auth/public-config`.
Готовые baseline env-файлы для этих кабинетов лежат в:

- `apps/web/admin-portal/.env.example`
- `apps/web/manager-cabinet/.env.example`
- `apps/web/employee-cabinet/.env.example`

### Web-кабинеты при прямом OIDC bootstrap

Если нужно явно переопределить redirect-адреса в Dokploy, можно задать:

#### Admin portal

```text
GALIAF_OIDC_CLIENT_ID=galiaf-admin-portal
GALIAF_OIDC_REDIRECT_URI=https://admin.socvid.ru/auth/callback
GALIAF_OIDC_POST_LOGOUT_REDIRECT_URI=https://admin.socvid.ru/
```

#### Manager cabinet

```text
GALIAF_OIDC_CLIENT_ID=galiaf-manager-cabinet
GALIAF_OIDC_REDIRECT_URI=https://manager.socvid.ru/auth/callback
GALIAF_OIDC_POST_LOGOUT_REDIRECT_URI=https://manager.socvid.ru/
```

#### Employee cabinet

```text
GALIAF_OIDC_CLIENT_ID=galiaf-employee-cabinet
GALIAF_OIDC_REDIRECT_URI=https://employee.socvid.ru/auth/callback
GALIAF_OIDC_POST_LOGOUT_REDIRECT_URI=https://employee.socvid.ru/
```

## Что обновить в Dokploy при реальном переключении

### Новый сервис

Поднять отдельный сервис для Keycloak:

- image: `quay.io/keycloak/keycloak:26.6.0`
- domain: `auth.socvid.ru`
- port: `8080`

### Core api

Заменить:

```text
AUTH_MODE=dev
AUTH_DEV_BYPASS_ENABLED=true
AUTH_UNSAFE_ALLOW_DEV_BYPASS=true
```

на:

```text
AUTH_MODE=oidc
AUTH_DEV_BYPASS_ENABLED=false
AUTH_UNSAFE_ALLOW_DEV_BYPASS=false
AUTH_ISSUER_URL=https://auth.socvid.ru/realms/galiaf
AUTH_AUDIENCE=galiaf-core-api
AUTH_JWKS_URI=https://auth.socvid.ru/realms/galiaf/protocol/openid-connect/certs
CHAT_AUTH_AUDIENCE=galiaf-chat-service
CHAT_BRIDGE_SHARED_SECRET=...
CHAT_BRIDGE_ISSUER=galiaf-core-api-chat-bridge
CHAT_BRIDGE_TOKEN_TTL_SECONDS=300
```

### Chat

Заменить:

```text
AUTH_MODE=dev
AUTH_DEV_BYPASS_ENABLED=true
AUTH_UNSAFE_ALLOW_DEV_BYPASS=true
```

на:

```text
AUTH_MODE=oidc
AUTH_DEV_BYPASS_ENABLED=false
AUTH_UNSAFE_ALLOW_DEV_BYPASS=false
AUTH_ISSUER_URL=https://auth.socvid.ru/realms/galiaf
AUTH_AUDIENCE=galiaf-chat-service
AUTH_JWKS_URI=https://auth.socvid.ru/realms/galiaf/protocol/openid-connect/certs
CHAT_BRIDGE_SHARED_SECRET=...
CHAT_BRIDGE_ISSUER=galiaf-core-api-chat-bridge
```

### Admin / Manager / Employee

Заменить:

```text
GALIAF_ENABLE_DEV_PERSONAS=true
```

на:

```text
GALIAF_ENABLE_DEV_PERSONAS=false
```

## Smoke checklist после переключения

1. Открыть:
   - `https://admin.socvid.ru`
   - `https://manager.socvid.ru`
   - `https://employee.socvid.ru`
2. Проверить redirect на `Keycloak`.
3. Выполнить login под нужным пользователем.
4. Проверить:
   - `https://api.socvid.ru/api/v1/health`
   - `session`
   - tenant-scoped данные для manager/employee
5. Проверить websocket chat для `manager` и `employee`.

## Если что-то не работает

### `401` на backend

Проверить:

- `AUTH_ISSUER_URL`
- `AUTH_AUDIENCE`
- `AUTH_JWKS_URI`
- наличие `galiaf-core-api` audience в access token

### `403` для manager/employee

Проверить user attributes:

- `active_tenant`
- `tenant_roles`

### Chat не подключается

Проверить:

- `CHAT_BRIDGE_SHARED_SECRET` одинаковый в `core-api` и `chat-service`
- `CHAT_BRIDGE_ISSUER`
- `CHAT_AUTH_AUDIENCE`
- что web получает `GET /api/v1/auth/chat-bridge-token`
