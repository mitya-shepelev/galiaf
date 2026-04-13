# PDR 003: Delivery and operations

- Версия: draft
- Дата: 2026-04-13

## Исходные ограничения

- Исходный код хранится в GitHub.
- Сборка и проверки идут через GitHub Actions.
- Деплой на сервер должен запускаться автоматически после успешной сборки.
- Web/backend/chat деплоятся в Docker контейнерах.
- Mobile release builds должны собираться удаленно через Expo/EAS.

## Целевой pipeline

### Pull request pipeline

- install dependencies;
- lint;
- typecheck;
- tests;
- affected build;
- optional security checks.

### Main branch pipeline

- build Docker images:
  - `public-site`
  - `admin-portal`
  - `manager-cabinet`
  - `employee-cabinet`
  - `core-api`
  - `chat`
- push images в registry;
- вызвать deploy webhook;
- выполнить post-deploy health checks.

### Mobile pipeline

- workflow вручную или по тегу запускает Expo/EAS build;
- artifacts публикуются в Expo distribution/TestFlight/Google Play internal track;
- локальная машина не используется для production builds.

## Эксплуатационные требования

1. Для каждого deployable компонента должен быть `Dockerfile`.
2. Для server deploy требуется единый `docker-compose` или эквивалентный orchestration manifest.
3. Webhook deploy должен поддерживать rollback strategy.
4. Secrets хранятся вне репозитория.
5. Health checks обязательны для `core-api`, `chat` и web applications.
