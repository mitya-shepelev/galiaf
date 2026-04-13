# Dokploy Deploy Contract

## Назначение

Этот контракт описывает production deploy path, когда GitHub Actions после публикации image в GHCR инициирует redeploy приложений в Dokploy через API.

## Когда вызывается Dokploy API

- только после успешного `CI` на ветке `main`;
- только после успешной публикации image в GHCR;
- только из workflow `Deploy Containers`.

## GitHub Secrets

- `DOKPLOY_URL`
- `DOKPLOY_TOKEN`

Ожидаемое значение `DOKPLOY_URL`:

```text
https://your-dokploy-domain/api
```

## GitHub Variables

- `DOKPLOY_APP_ID_PUBLIC_SITE`
- `DOKPLOY_APP_ID_ADMIN_PORTAL`
- `DOKPLOY_APP_ID_MANAGER_CABINET`
- `DOKPLOY_APP_ID_EMPLOYEE_CABINET`
- `DOKPLOY_APP_ID_CORE_API`
- `DOKPLOY_APP_ID_CHAT`

## HTTP запрос

- Метод: `POST`
- Path: `/application.deploy`
- Header: `x-api-key: <token>`
- `Content-Type: application/json`

Payload:

```json
{
  "applicationId": "string"
}
```

## Последовательность

1. GitHub Actions публикует image в GHCR.
2. Dokploy application настроен на соответствующий image source.
3. Workflow вызывает `application.deploy` для нужного `applicationId`.
4. Dokploy делает redeploy соответствующего приложения.

## Какие приложения вызываются

- `public-site`
- `admin-portal`
- `manager-cabinet`
- `employee-cabinet`
- `core-api`
- `chat`

## Fallback path

Self-managed deploy webhook из `infra/deploy/` остается доступен как fallback/self-hosted path, но не является primary production path для Dokploy окружения.
