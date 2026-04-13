# ADR 0003: Отдельный чат-микросервис

- Статус: accepted
- Дата: 2026-04-13

## Контекст

Realtime messaging имеет другой профиль нагрузки и жизненного цикла, чем основной backend. Для платформы охранной компании чат важен для диспетчеризации, координации сотрудников и операционного взаимодействия.

## Решение

Выделить чат в отдельный сервис `services/chat`.

Зона ответственности сервиса:

- создание и доставка сообщений;
- websocket connections;
- online presence;
- read/delivery statuses;
- вложения и metadata;
- интеграция с push notifications через event bus.

Вне зоны ответственности:

- создание пользователей платформы;
- RBAC как источник истины;
- управление организациями;
- core workflows охранной компании.

Чат должен получать авторизационный контекст от `core-api` или общего auth-модуля и работать в tenant-aware режиме.

Dev-реализация должна поддерживать тот же `x-dev-auth-context`, что и `core-api`, чтобы web/mobile и websocket smoke tests использовали одинаковый auth contract.

История сообщений, delivery acknowledgements и read receipts должны храниться в отдельной БД `chat-service`, изолированной от `core-api`. Межинстансовая доставка realtime событий и shared room presence должны идти через Redis pub/sub. Room membership и participant counting должны быть lease-based через Redis с heartbeat/TTL, чтобы stale entries очищались после падения процесса без ручного вмешательства. In-memory state допустим только для локальных socket connections и transient runtime bookkeeping внутри одного процесса.

## Последствия

Плюсы:

- масштабирование отдельно от `core-api`;
- изоляция realtime нагрузки;
- независимый релизный цикл.

Минусы:

- нужна синхронизация auth context;
- увеличивается объем DevOps и observability.
