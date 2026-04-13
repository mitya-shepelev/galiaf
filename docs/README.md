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

## Базовое правило

Документация обновляется вместе с кодом, а не после него.
