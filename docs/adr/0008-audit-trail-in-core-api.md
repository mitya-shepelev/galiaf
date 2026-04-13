# ADR 0008: Audit Trail In Core API

- Статус: accepted
- Дата: 2026-04-14

## Контекст

Платформа уже имеет разделение ролей `platform_admin`, `company_manager`, `employee`, а также production-oriented delivery и observability baseline. Следующий риск перед production rollout — отсутствие системного audit trail по security-sensitive и access-sensitive действиям.

Нам нужно фиксировать как минимум:

- создание организаций;
- provisioning сотрудников;
- создание, отзыв и принятие приглашений;
- изменение ролей membership;
- отзыв membership;
- запросы на переключение auth context.

Chat service не должен становиться источником business audit. Его граница остается transport/realtime. Основной audit trail должен жить в `core-api`, где уже находятся RBAC, доменные сервисы и бизнес-правила.

## Решение

Принимаем решение хранить audit trail в `core-api`:

- отдельная таблица `audit_events` в основной БД `core-api`;
- запись событий из domain/application сервисов и auth controller;
- чтение audit events через `GET /api/v1/audit/events`;
- доступ к audit только у `platform_admin` и `company_manager`;
- `company_manager` видит только события своей организации;
- web admin portal использует тот же API contract через `@galiaf/sdk`.

## Последствия

Плюсы:

- audit находится рядом с RBAC и бизнес-действиями;
- журнал можно использовать в admin UI, smoke tests и операционных runbooks;
- не требуется отдельный audit microservice на текущем этапе.

Минусы:

- audit trail пока хранится в той же БД, что и `core-api`;
- пока нет внешней отправки в SIEM/log sink;
- покрыт минимальный baseline, а не полный compliance-grade audit.

## Что не делаем сейчас

- не выносим audit в отдельный сервис;
- не строим immutable append-only storage вне PostgreSQL;
- не добавляем пользовательский экспорт журнала;
- не подключаем внешний SIEM как обязательную зависимость.
