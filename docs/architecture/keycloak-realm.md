# Keycloak Realm Baseline

## Назначение

Этот документ фиксирует baseline realm-конфиг для `Keycloak`, который соответствует текущему auth-контракту платформы.

Основной asset лежит в:

- `infra/auth/keycloak/realm-galiaf.json`

## Что входит в baseline

### Realm

- `galiaf`

### Clients

- `galiaf-admin-portal`
- `galiaf-manager-cabinet`
- `galiaf-employee-cabinet`
- `galiaf-mobile-app`
- `galiaf-core-api`
- `galiaf-chat-service`

### Realm roles

- `platform_admin`

### Client scopes

- `galiaf-core-api-audience`
- `galiaf-tenant-context`

## Redirect URIs

Baseline import уже включает:

- `https://admin.socvid.ru/auth/callback`
- `https://manager.socvid.ru/auth/callback`
- `https://employee.socvid.ru/auth/callback`
- локальные callback URL для `3001/3002/3003`

Для mobile baseline включает:

- `galiaf://auth/callback`

Его почти наверняка нужно будет расширить под фактические Expo dev/EAS redirect URIs.

## Production hostname baseline

Текущий production baseline в docs рассчитан на:

- `https://auth.socvid.ru`

Если provider будет поднят на другом домене, нужно синхронно поменять:

- `KEYCLOAK_HOSTNAME`
- `AUTH_ISSUER_URL`
- `AUTH_JWKS_URI`
- redirect URIs web clients

## Runtime baseline для Dokploy

Если `Keycloak` поднимается отдельным сервисом в Dokploy, минимальный runtime contract такой:

- domain: `auth.socvid.ru`
- internal port: `8080`
- reverse proxy должен передавать `X-Forwarded-*`
- Keycloak стартует с `--hostname=https://auth.socvid.ru --proxy-headers=xforwarded --http-enabled=true`

Проверка после старта:

- discovery: `https://auth.socvid.ru/realms/galiaf/.well-known/openid-configuration`
- issuer должен быть `https://auth.socvid.ru/realms/galiaf`

## Claims baseline

### Global role

`platform_admin` идет через:

- `realm_access.roles`

### Tenant context

Baseline realm export мапит user attributes в access token:

- `active_tenant`
- `tenant_roles`

Этого достаточно для текущего fallback path в `core-api` и `chat-service`.

## Ограничение baseline

Полноценный `tenant_memberships` JSON claim в этом baseline не импортируется автоматически.

Для первого production rollout это допустимо, потому что backend уже умеет восстанавливать effective tenant roles через:

- `active_tenant`
- `tenant_roles`

Если later потребуется richer claim model, это будет отдельный auth/identity шаг.
