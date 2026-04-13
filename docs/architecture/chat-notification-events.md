# Chat Notification Events Contract

## Канал

- Redis channel: `galiaf:chat:notifications`
- Источник: `services/chat` (notification outbox dispatcher)
- Назначение: мост к push/email/in-app notification worker-ам

## События

`eventType`:

- `room_message_created`
- `message_delivered`
- `message_read`

## Payload (shared contract)

Контракт вынесен в `packages/types`:

- `ChatNotificationEventType`
- `ChatNotificationEvent`

Формат события:

```json
{
  "id": "notif_xxxxxxxx",
  "eventType": "room_message_created",
  "roomId": "org:org_alpha",
  "messageId": "msg_xxxxxxxx",
  "actorSubject": "demo-manager-alpha",
  "payload": {
    "textPreview": "smoke:171...",
    "authorSubject": "demo-manager-alpha"
  },
  "createdAt": "2026-04-13T10:00:00.000Z"
}
```

## Delivery semantics

- Dispatcher публикует события из outbox батчами.
- На время отправки запись переводится в `dispatching`.
- При успехе — `dispatched`.
- При ошибке — запись возвращается в `pending` до `max attempts`, затем `failed`.
- Dedupe на уровне outbox: уникальный ключ `(event_type, message_id, actor_subject)`.

## Ответственность

- Chat service не вызывает push providers напрямую.
- Внешний worker реализует provider-specific retry/backoff, template mapping и rate limits.
