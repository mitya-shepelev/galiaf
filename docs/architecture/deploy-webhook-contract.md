# Deploy Webhook Contract

## Назначение

Этот контракт описывает payload, который GitHub Actions отправляет на серверный deploy webhook после успешной публикации Docker images.

## Когда вызывается webhook

- только после успешного `CI` на ветке `main`;
- только после успешной публикации image в GHCR;
- webhook не вызывается для pull request и неуспешных workflow.

## HTTP запрос

- Метод: `POST`
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
