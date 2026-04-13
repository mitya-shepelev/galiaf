# ADR 0007: Observability Baseline

## Статус

Accepted

## Контекст

Платформа дошла до состояния, где у нас уже есть:

- несколько web приложений;
- `core-api`;
- `chat-service`;
- deploy webhook consumer на серверной стороне.

Без минимальной observability-базы эксплуатация staging/production становится хрупкой:

- нет единого разделения между `liveness` и `readiness`;
- нет простого runtime snapshot для базовых метрик;
- HTTP доступы и deploy события логируются неструктурированно или не везде одинаково.

## Решение

Мы вводим минимальный observability baseline без тяжелого внешнего стека:

1. `health` разделяется на:
   - snapshot endpoint;
   - liveness endpoint;
   - readiness endpoint.
2. Для `core-api`, `chat-service`, web apps и deploy webhook consumer вводятся JSON metrics endpoints.
3. Для `core-api` и `chat-service` включаются JSON access logs на уровне HTTP hooks.
4. Deploy webhook consumer пишет JSON line logs, пригодные для `journald`, Docker logs и file shipping.
5. Compose healthchecks и deploy scripts используют readiness probes, а не snapshot endpoint.

## Последствия

### Плюсы

- проще диагностировать деградацию и rollout failures;
- readiness можно использовать в deploy, reverse proxy и orchestration;
- базовые runtime метрики доступны без Prometheus на первом этапе;
- логи становятся пригодными для централизованного сбора.

### Минусы

- метрики пока не в Prometheus-формате;
- нет полноценного trace/span instrumentation;
- web metrics и deploy metrics пока локальные и in-memory.

## Следующие шаги

1. Подключить централизованный сбор stdout/journal логов.
2. Определить целевой metrics backend.
3. Добавить audit/security-sensitive events поверх базовой observability модели.
