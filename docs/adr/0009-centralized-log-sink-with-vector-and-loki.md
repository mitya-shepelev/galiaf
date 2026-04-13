# ADR 0009: Centralized Log Sink With Vector And Loki

## Статус

Accepted

## Контекст

После observability baseline у платформы уже есть:

- structured logs из `core-api` и `chat-service`;
- JSON line logs у deploy webhook consumer;
- Docker Compose based delivery path;
- audit trail для security-sensitive и access-sensitive действий.

Но логи по-прежнему разрознены:

- container stdout/stderr живут в Docker;
- deploy webhook consumer пишет в `journald` и `logs/deploy-webhook.log`;
- единой точки запроса и хранения логов нет.

Для staging и первых production rollout-ов нужен легкий centralized log sink без тяжелой ELK-инфраструктуры.

## Решение

Принимаем решение использовать `Vector + Loki` как базовый centralized log stack:

1. `Vector` собирает:
   - Docker container logs;
   - `journald` unit `galiaf-deploy-webhook.service`.
2. `Loki` хранит собранные логи как централизованный sink.
3. Стек запускается тем же `docker-compose.server.yml`, но через отдельный профиль `observability`.
4. На первом этапе UI для логов не делаем обязательной зависимостью. При необходимости Grafana может быть добавлена позже отдельным шагом.
5. `logs/deploy-webhook.log` остается локальным fallback trail и incident artifact, но не ship-ится в Loki по умолчанию, чтобы не дублировать journald events.

## Последствия

### Плюсы

- один легкий sink для backend, web и deploy logs;
- не нужно поднимать тяжелый search stack ради первого production этапа;
- стек совместим с текущим Docker Compose delivery path.

### Минусы

- полноценный UI и dashboards не входят в baseline;
- journald shipping зависит от Linux server path mounts;
- retention и алертинг на стороне Loki/Grafana еще не доведены до production-grade уровня.

## Что не делаем сейчас

- не добавляем ELK/OpenSearch;
- не делаем обязательный Grafana слой;
- не строим отдельный managed logging backend как жесткую зависимость.
