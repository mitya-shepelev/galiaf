# ADR 0014: Keycloak Realm Baseline For Galiaf

## Статус

Accepted

## Контекст

Архитектурно мы уже выбрали централизованную OIDC-модель, а web и chat получили production-ready auth pieces:

- server-side OIDC login для внутренних кабинетов;
- bearer/JWKS verification в `core-api` и `chat-service`;
- short-lived chat bridge token для web realtime flow.

Следующий риск был операционный: без зафиксированного realm/client baseline переход на `AUTH_MODE=oidc` снова стал бы ручной и неявной задачей.

## Решение

Добавить baseline realm assets для `Keycloak`:

1. Realm `galiaf`
2. Clients:
   - `galiaf-admin-portal`
   - `galiaf-manager-cabinet`
   - `galiaf-employee-cabinet`
   - `galiaf-mobile-app`
   - `galiaf-core-api`
   - `galiaf-chat-service`
3. Realm role:
   - `platform_admin`
4. Client scopes:
   - `galiaf-core-api-audience`
   - `galiaf-tenant-context`

## Последствия

### Плюсы

- перевод на `AUTH_MODE=oidc` становится повторяемым;
- redirect URIs, audiences и базовые claims больше не держатся только в runbook;
- команда получает единый baseline для dev/staging/production.

### Минусы

- tenant context baseline пока опирается на `active_tenant` и `tenant_roles`, а не на полноценный `tenant_memberships` JSON claim;
- mobile redirect URIs почти наверняка потребуют донастройки под фактические EAS/dev build схемы.

## Следующий шаг

- развернуть Keycloak в отдельном Dokploy app или другом изолированном окружении;
- импортировать realm baseline;
- создать bootstrap users и проверить login для `admin`, `manager`, `employee`;
- затем перевести live backend/chat на `AUTH_MODE=oidc`.
