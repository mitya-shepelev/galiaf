# Docs

В этой папке хранится проектная документация платформы.

## Разделы

- `adr/`: архитектурные решения.
- `pdr/`: продуктовые и проектные решения.
- `architecture/`: схемы, контексты, доменные модели.
- `roadmap/`: текущий план этапов и ближайших приоритетов.
- `runbooks/`: инструкции по эксплуатации и деплою.

## Что уже зафиксировано

- базовая структура монорепо и delivery pipeline;
- роли `platform_admin`, `company_manager`, `employee`;
- centralized OIDC strategy и dev auth bypass для локальной разработки;
- границы `core-api` и `chat-service`;
- текущий roadmap по этапам реализации;
- локальный runbook для backend, web и mobile.
- deploy webhook contract для container delivery.
- health contract для liveness/readiness/snapshot probes.
- observability baseline для metrics и structured logs.
- centralized log sink baseline через `Vector + Loki`.
- audit trail baseline для access-sensitive и security-sensitive событий в `core-api`.
- Dokploy API deploy contract для production delivery path.
- server-side skeleton для webhook deploy в `infra/deploy/`.
- staging/production deployment checklist и `systemd` unit для webhook consumer.
- пример `nginx` reverse proxy для deploy webhook.

## Базовое правило

Документация обновляется вместе с кодом, а не после него.
