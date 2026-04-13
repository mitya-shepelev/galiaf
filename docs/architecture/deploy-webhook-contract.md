# Self-Managed Deploy Webhook Contract

## Назначение

Этот контракт описывает payload для self-managed deploy webhook consumer из `infra/deploy/`.

Для production окружения на Dokploy primary path теперь описан отдельно в `docs/architecture/dokploy-deploy-contract.md`.

## Когда вызывается webhook

Этот контракт актуален для self-hosted fallback path, когда используется собственный deploy webhook consumer, а не Dokploy API.

## HTTP запрос

- Метод: `POST`
- Path: `/deploy`
- `Content-Type: application/json`
- Header: `X-Deploy-Token: <token>`

## Payload

```json
{
  "sha": "git-sha",
  "imageTag": "git-sha",
  "ref": "main",
  "repository": "owner/repo"
}
```

## Ожидания от серверного webhook consumer

1. Провалидировать `X-Deploy-Token`.
2. Принять `imageTag` как версию, которую нужно развернуть в `docker-compose.server.yml`.
3. Выполнить `docker compose pull`.
4. Выполнить `docker compose up -d`.
5. Проверить health критичных сервисов:
   - `core-api`
   - `chat`
   - web кабинеты
6. При ошибке завершить deploy как failed и сохранить логи для разбора.
7. Не запускать параллельные deploy для разных `imageTag`, пока активный deploy не завершен.

## Рекомендуемый server-side skeleton

- `infra/deploy/webhook-server.mjs`: минимальный HTTP consumer.
- `infra/deploy/deploy-release.sh`: обновляет `IMAGE_TAG` в `.env`, выполняет `docker compose pull` и `docker compose up -d`.
- `infra/deploy/check-health.sh`: ожидает readiness `core-api`, `chat` и web сервисов.
- `infra/deploy/galiaf-deploy-webhook.service`: пример `systemd` unit для production/staging.
- `infra/deploy/nginx.deploy-webhook.conf.example`: пример reverse proxy для внешнего webhook endpoint.
