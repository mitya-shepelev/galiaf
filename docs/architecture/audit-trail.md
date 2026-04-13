# Audit Trail

## Где живет аудит

Audit trail хранится в `core-api` и считается частью доменной и security-модели платформы.

Причина простая: именно `core-api` знает про организации, memberships, invitations, RBAC и auth context.

## Что фиксируется

На текущем baseline пишутся события:

- `organization_created`
- `organization_employee_provisioned`
- `invitation_created`
- `invitation_revoked`
- `invitation_accepted`
- `membership_roles_updated`
- `membership_revoked`
- `auth_context_switch_requested`
- `admin_bootstrap_viewed`
- `audit_events_viewed`

## Модель записи

Каждое событие содержит:

- `action`
- `entityType`
- `entityId`
- `organizationId`
- `actorSubject`
- `actorUserId`
- `actorEmail`
- `actorName`
- `actorRoles`
- `actorActiveTenantId`
- `details`
- `createdAt`

`details` используется как расширяемое поле для контекста операции и не заменяет нормализованные доменные таблицы.

## API контракт

- `GET /api/v1/audit/events`

Поддерживаемые query params:

- `organizationId`
- `limit`

Ограничения доступа:

- `platform_admin` видит весь журнал или журнал по конкретной организации;
- `company_manager` видит только события своей организации;
- `employee` не имеет доступа к audit endpoint.

## UI и тесты

- `admin-portal` показывает последние audit events через `@galiaf/sdk`;
- `core-api-manager-smoke-test.mjs` проверяет, что manager flow создает audit записи.

## Retention

Текущий baseline retention policy:

- operational audit события храним в основной БД `core-api`;
- базовый retention window: `90` дней, если не требуется более длинное хранение;
- очистка выполняется отдельной operational командой:

```bash
DATABASE_HOST=/Applications/ServBay/tmp \
DATABASE_PORT=5432 \
DATABASE_NAME=galiaf \
DATABASE_USER=dmitrijsepelev \
DATABASE_PASSWORD='ServBay.dev' \
pnpm audit:prune -- --days=90
```

Команда удаляет только записи старше указанного окна и не влияет на актуальные события.

## Следующие шаги

- расширять audit events для новых security-sensitive admin операций и production auth flows;
- определить export policy и внешний sink;
- при необходимости подключить внешний sink или SIEM.
