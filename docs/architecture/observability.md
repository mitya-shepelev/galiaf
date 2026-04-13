# Observability

## Базовый состав

На текущем этапе observability строится вокруг трех вещей:

1. health probes;
2. metrics endpoints;
3. structured logs.

Health probes описаны отдельно в `docs/architecture/health-contract.md`.

## Metrics endpoints

### Backend

- `core-api`: `GET /api/v1/metrics`
- `chat`: `GET /api/v1/metrics`

Они отдают JSON snapshot с:

- runtime process metrics;
- status критичных зависимостей;
- базовыми service-specific counters.

### Web

- `public-site`: `GET /api/metrics`
- `admin-portal`: `GET /api/metrics`
- `manager-cabinet`: `GET /api/metrics`
- `employee-cabinet`: `GET /api/metrics`

Web metrics пока содержат:

- uptime процесса;
- memory usage;
- состояние обязательных env vars.

### Deploy webhook

- `deploy-webhook`: `GET /metrics`

Endpoint содержит:

- uptime и memory процесса;
- counters по deploy requests;
- состояние активного deploy;
- информацию о последнем deploy.

## Structured logs

### core-api и chat

Для HTTP запросов включены JSON access logs:

- `event=http_access`
- `service`
- `method`
- `path`
- `statusCode`
- `durationMs`
- `requestId`
- `remoteAddress`
- `timestamp`

### Deploy webhook

Webhook consumer пишет JSON line logs для:

- startup;
- rejected deploy requests;
- started deploy;
- successful deploy;
- failed deploy;
- stdout/stderr deploy script;
- HTTP access.

## Где это должно собираться

На текущем baseline источники логов такие:

- `stdout/stderr` контейнеров;
- `journald` для `galiaf-deploy-webhook.service`;
- `logs/deploy-webhook.log` как локальный fallback trail.

## Centralized log sink

Следующий слой observability теперь реализован как `Vector + Loki`:

- `Vector` читает Docker logs и `journald`;
- `Loki` выступает centralized log sink;
- запуск выполняется через `docker-compose.server.yml` c профилем `observability`.

`logs/deploy-webhook.log` остается локальным fallback trail и incident artifact, но не ship-ится в Loki по умолчанию, чтобы не дублировать те же события из `journald`.

Подробности по запуску и проверке:

- `docs/runbooks/observability.md`

Это baseline-решение для staging и первых production rollout-ов. Query UI и alerts остаются следующим шагом.

## Audit trail

Security-sensitive и access-sensitive действия фиксируются отдельно от access logs и metrics.

- источник истины: `core-api`
- отдельный API contract: `GET /api/v1/audit/events`
- описание структуры и границ: `docs/architecture/audit-trail.md`
- sensitive reads `admin bootstrap` и `audit log` тоже пишутся в audit trail
