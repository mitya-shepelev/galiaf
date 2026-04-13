# Deployment Runbook

## Общая схема

1. Разработчик открывает pull request в GitHub.
2. GitHub Actions выполняет проверки.
3. После merge в основную ветку собираются Docker images.
4. Образы публикуются в registry.
5. Workflow или registry event вызывает deploy webhook на сервере.
6. Сервер выполняет `docker compose pull` и `docker compose up -d`.
7. Выполняются health checks.

## Требования к серверу

- установлен Docker;
- установлен Docker Compose plugin;
- настроен reverse proxy;
- webhook endpoint защищен подписью или token-based validation;
- настроено логирование контейнеров.

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
