# Health Contract

## Назначение

Этот контракт задает единый подход к health endpoints для backend и web сервисов платформы.

## Endpoint pattern

Для сервисов используются три вида endpoint:

- `GET /health` или `GET /api/health`: человекочитаемый snapshot состояния сервиса.
- `GET /health/live` или `GET /api/health/live`: liveness probe.
- `GET /health/ready` или `GET /api/health/ready`: readiness probe.

Для Nest сервисов (`core-api`, `chat`) prefix уже включает `api/v1`, поэтому итоговые пути:

- `core-api`: `/api/v1/health`, `/api/v1/health/live`, `/api/v1/health/ready`
- `chat`: `/api/v1/health`, `/api/v1/health/live`, `/api/v1/health/ready`

Для Next.js приложений итоговые пути:

- `public-site`: `/api/health/live`, `/api/health/ready`
- `admin-portal`: `/api/health/live`, `/api/health/ready`
- `manager-cabinet`: `/api/health/live`, `/api/health/ready`
- `employee-cabinet`: `/api/health/live`, `/api/health/ready`

## Семантика

### Snapshot

- используется для UI, smoke tests и ручной диагностики;
- может содержать расширенные поля сервиса;
- не должен считаться единственным источником readiness.

### Liveness

- отвечает только на вопрос "процесс жив?";
- не должен зависеть от внешних сервисов;
- возвращает `200`, если процесс способен принимать HTTP запросы.

### Readiness

- отвечает на вопрос "можно ли направлять трафик?";
- может возвращать `503`, если критичные зависимости недоступны;
- используется deploy scripts, orchestrator health checks и reverse proxy.

## Базовый JSON формат

```json
{
  "status": "ok",
  "service": "core-api",
  "kind": "readiness",
  "ready": true,
  "timestamp": "2026-04-14T00:00:00.000Z"
}
```

Для backend snapshot/readiness дополнительно используются:

```json
{
  "database": "ok",
  "redis": "ok"
}
```

## Правила по сервисам

### core-api

- liveness не проверяет PostgreSQL и Redis;
- readiness требует `database=ok` и `redis=ok`.

### chat

- liveness не проверяет PostgreSQL и Redis;
- readiness требует `database=ok` и `redis=ok`;
- snapshot может включать `connections`, `notificationOutbox` и message stats.

### web apps

- liveness подтверждает, что Next process отвечает;
- readiness подтверждает, что обязательные env vars заданы;
- web readiness не должен сам ходить в backend, чтобы не создавать каскадную деградацию.

## Где используется сейчас

- `infra/deploy/check-health.sh`
- `infra/compose/docker-compose.server.yml`
- staging/production deploy runbook
