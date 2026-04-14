# Auth Flow

## Целевая схема

1. Пользователь открывает один из клиентов платформы.
2. Клиент перенаправляет пользователя в OIDC provider.
3. Provider аутентифицирует пользователя и возвращает authorization code.
4. Клиент завершает code flow с PKCE.
5. Клиент получает access token и auth context.
6. `core-api` и `chat` валидируют access token по `JWKS`.
7. Backend применяет RBAC и tenant isolation на основе effective roles.

## Клиентская матрица

- `admin-portal`: отдельный OIDC client, отдельный redirect URI.
- `manager-cabinet`: отдельный OIDC client, отдельный redirect URI.
- `employee-cabinet`: отдельный OIDC client, отдельный redirect URI.
- `mobile-app`: native/public client с PKCE и app scheme redirect.

## Контракт claims

- `sub`
- `email`
- `name`
- `azp`
- `aud`
- `realm_access.roles`
- `active_tenant`
- `tenant_memberships`

## Контекст переключения

Если пользователь имеет несколько tenant memberships, активный контекст не должен угадываться на backend.

Нужна явная модель:

1. клиент запрашивает доступный контекст;
2. пользователь выбирает активную организацию;
3. provider или session layer формирует обновленный access context;
4. backend применяет только active context, а не весь список memberships без выбора.

## Dev verification

- `public-site` использует публичный `auth/public-config` и `health` как live snapshot;
- `admin-portal`, `manager-cabinet`, `employee-cabinet` используют общий SDK и `x-dev-auth-context`;
- `mobile-app` должен уметь проверять `session`, `access/roles`, `workspace` и ожидаемые `403` для restricted routes в dev-режиме.

## Текущая web-реализация

- `admin-portal`, `manager-cabinet`, `employee-cabinet` используют server-side routes:
  - `/auth/login`
  - `/auth/callback`
  - `/auth/logout`
- login использует `Authorization Code Flow + PKCE`;
- после callback access token хранится в `HttpOnly`, `Secure`, `SameSite=Lax` cookie web-приложения;
- server components и server actions отправляют bearer token в `core-api`;
- при `401` кабинет не откатывается в demo persona, а требует переавторизацию.

## Текущий компромисс по chat

- backend и websocket support bearer token;
- web OIDC login для кабинетов включен;
- `core-api` выпускает short-lived chat bridge token для web OIDC session;
- `chat-service` принимает этот bridge token на websocket handshake;
- основной OIDC access token не уходит в browser runtime для chat подключения;
- dev/local режим с demo personas сохраняет текущий smoke-friendly path.

## Guardrails для internet-facing окружений

`dev bypass` и demo personas допустимы только как временный debug path.

Для internet-facing deployment теперь требуется явный opt-in:

- backend/chat:
  - `AUTH_UNSAFE_ALLOW_DEV_BYPASS=true`
- web кабинеты:
  - `GALIAF_ENABLE_DEV_PERSONAS=true`

Без этих флагов production-like deployment должен либо переходить на `OIDC`, либо явно блокировать demo auth usage.
