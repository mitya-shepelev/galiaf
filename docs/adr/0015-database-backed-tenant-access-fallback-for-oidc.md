# ADR 0015: Database-Backed Tenant Access Fallback For OIDC

## Статус

Accepted

## Контекст

При переводе live окружения на Keycloak-based OIDC выяснилось, что для `manager` и `employee` критичный tenant context (`active_tenant`, `tenant_roles`, `tenant_memberships`) не всегда удобно и стабильно поддерживать через Keycloak UI и custom mappers.

При этом источник истины для бизнес-доступа у нас уже находится в `core-api` и PostgreSQL:

- `users`
- `memberships`
- `organizations`
- `invitations`

Это лучше соответствует продуктовой модели, где:

- `platform_admin` управляет платформой;
- `company_manager` выдает доступ внутри организации;
- `employee` получает доступ через membership в доменной модели.

## Решение

Оставить OIDC provider источником аутентификации, но добавить fallback в `core-api`:

1. `platform_admin` по-прежнему определяется из `realm_access.roles`.
2. `tenant`-контекст может приходить из OIDC claims, если они настроены.
3. Если tenant claims отсутствуют, `core-api` загружает активные membership из собственной БД по `sub` или `email`.
4. Если у пользователя только один active membership, `activeTenantId` выбирается автоматически.

## Последствия

### Плюсы

- tenant access больше не зависит полностью от сложной настройки Keycloak claims;
- RBAC и tenant isolation ближе к реальному источнику истины;
- rollout `manager` и `employee` через OIDC становится проще и устойчивее.

### Минусы

- identity resolution теперь зависит не только от токена, но и от DB state;
- при расхождении между IdP и БД потребуется явная диагностика membership данных.

## Следующий шаг

- довести `manager-cabinet` и `employee-cabinet` на live OIDC login;
- затем решить, оставлять ли Keycloak tenant mappers как optimization layer или убрать их из обязательного пути.
