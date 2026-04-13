# Deployment Runbook

## Общая схема

1. Разработчик открывает pull request в GitHub.
2. GitHub Actions выполняет проверки.
3. После merge в основную ветку собираются Docker images.
4. Образы публикуются в registry.
5. После успешного `CI` workflow публикации вызывает deploy webhook на сервере.
6. Сервер выполняет `docker compose pull` и `docker compose up -d` с `IMAGE_TAG=<sha>`.
7. Выполняются health checks.

Webhook payload описан отдельно в `docs/architecture/deploy-webhook-contract.md`.

## Требования к серверу

- установлен Docker;
- установлен Docker Compose plugin;
- настроен reverse proxy;
- webhook endpoint защищен подписью или token-based validation;
- настроено логирование контейнеров.
- на сервере подготовлен `.env` для `infra/compose/docker-compose.server.yml`.

## Переменные окружения compose

Минимально нужно заполнить:

- `GHCR_NAMESPACE`
- `IMAGE_TAG`
- `GALIAF_PUBLIC_SITE_URL`
- `GALIAF_ADMIN_PORTAL_URL`
- `GALIAF_MANAGER_CABINET_URL`
- `GALIAF_EMPLOYEE_CABINET_URL`
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `CHAT_DATABASE_HOST`
- `CHAT_DATABASE_PORT`
- `CHAT_DATABASE_NAME`
- `CHAT_DATABASE_ADMIN_NAME`
- `CHAT_DATABASE_USER`
- `CHAT_DATABASE_PASSWORD`
- `REDIS_URL`
- `AUTH_MODE`
- `AUTH_DEV_BYPASS_ENABLED`
- `AUTH_ISSUER_URL`
- `AUTH_AUDIENCE`
- `AUTH_JWKS_URI`
- `AUTH_ALLOWED_CORS_ORIGINS`

## Rollback

1. Определить последний стабильный image tag.
2. Обновить compose manifest или deploy payload до стабильного тега.
3. Перезапустить нужный сервис.
4. Проверить health checks и критические бизнес-сценарии.

## Минимальный набор контейнеров

- `public-site`
- `admin-portal`
- `manager-cabinet`
- `employee-cabinet`
- `core-api`
- `chat`
- `postgres`
- `redis`
