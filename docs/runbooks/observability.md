# Observability Runbook

## Centralized Logs

Базовый centralized log stack поднимается через `Vector + Loki`.

Используем тот же compose файл:

```bash
cd /opt/galiaf
docker compose \
  --env-file infra/compose/.env \
  -f infra/compose/docker-compose.server.yml \
  --profile observability \
  up -d loki vector
```

## Что собирается

- Docker logs сервисов платформы;
- `journald` unit `galiaf-deploy-webhook.service`.

`logs/deploy-webhook.log` остается локальным fallback trail и используется для incident capture, но не ship-ится в Loki по умолчанию, чтобы не дублировать journald events.

## Проверка после запуска

Проверить, что контейнеры поднялись:

```bash
docker compose \
  --env-file infra/compose/.env \
  -f infra/compose/docker-compose.server.yml \
  --profile observability \
  ps
```

Проверить Loki readiness:

```bash
curl http://127.0.0.1:3100/ready
```

Проверить, что Vector контейнер жив и не пишет ошибок конфигурации:

```bash
docker logs --tail=50 galiaf-vector
```

Проверить, что Loki отвечает на query:

```bash
curl -G http://127.0.0.1:3100/loki/api/v1/query \
  --data-urlencode 'query={service=~".+"}'
```

## Что важно на сервере

- `OBSERVABILITY_JOURNAL_DIR` и `OBSERVABILITY_RUN_JOURNAL_DIR` должны соответствовать Linux journald paths;
- `Vector` должен иметь доступ к `/var/run/docker.sock`.

## Диагностика

Если не приходят логи deploy webhook:

1. Проверить `journalctl -u galiaf-deploy-webhook.service`.
2. Проверить, что `logs/deploy-webhook.log` обновляется.
3. Проверить mounts у контейнера `galiaf-vector`.

Если не приходят container logs:

1. Проверить доступность `/var/run/docker.sock` в контейнере `galiaf-vector`.
2. Проверить, что `vector` и `loki` сами не создают шумящий self-loop.
3. Проверить ответ Loki query API.

## Следующий этап

После этого baseline шага логично добавить:

- Grafana или другой query UI;
- retention rules и alerts;
- экспорт в внешний managed log backend при необходимости.
