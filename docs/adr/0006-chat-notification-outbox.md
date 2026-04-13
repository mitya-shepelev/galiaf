# ADR 0006: Chat Notification Outbox

- Статус: accepted
- Дата: 2026-04-13

## Контекст

Chat service должен передавать события для push-уведомлений, но прямой вызов внешних провайдеров из websocket handler-ов повышает связность и делает realtime-путь хрупким.

## Решение

Добавить в `services/chat` outbox pipeline:

1. Gateway пишет события в таблицу `chat_notification_outbox`.
2. Фоновый dispatcher забирает pending записи, публикует их в Redis channel `galiaf:chat:notifications`.
3. Запись переводится в `dispatched` или ретраится до лимита, после чего получает `failed`.

Типы событий и envelope вынесены в `packages/types` (`ChatNotificationEventType`, `ChatNotificationEvent`), чтобы исключить дублирование контракта.

## Последствия

Плюсы:

- realtime отправка сообщения не зависит напрямую от внешнего push-провайдера;
- появляется наблюдаемая очередь и контроль неотправленных событий;
- контракт событий унифицирован между сервисами.

Минусы:

- добавляется фоновой процесс и новые operational метрики;
- требуется отдельный notification worker/bridge для конечной доставки в provider.
