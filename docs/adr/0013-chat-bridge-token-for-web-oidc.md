# ADR 0013: Chat Bridge Token For Web OIDC

## Статус

Accepted

## Контекст

`core-api` и `chat-service` уже умеют работать с OIDC bearer token, а внутренние web-кабинеты получили `OIDC login/callback/logout` flow.

Проблема оставалась в realtime chat для web:

- websocket client должен передать credential в browser runtime;
- прямое использование основного access token в client runtime нежелательно;
- возврат к demo persona для chat в OIDC-режиме ломает production auth model.

## Решение

1. `core-api` выпускает короткоживущий `chat bridge token` для уже аутентифицированной web session:
   - endpoint: `GET /api/v1/auth/chat-bridge-token`
2. Токен подписывается через shared secret и содержит только claims, нужные `chat-service`.
3. `chat-service` принимает такой токен на websocket handshake как обычный bearer token, но проверяет его отдельным локальным verifier.
4. Web-кабинеты получают bridge token server-side и передают в client runtime только его, а не основной OIDC access token.

## Env контракт

- `CHAT_BRIDGE_SHARED_SECRET`
- `CHAT_BRIDGE_ISSUER`
- `CHAT_BRIDGE_TOKEN_TTL_SECONDS`
- `CHAT_AUTH_AUDIENCE`

## Последствия

### Плюсы

- live chat возвращается в OIDC-режим без передачи основного access token в browser runtime;
- auth path для web chat становится совместимым с production login flow;
- bridge token можно делать короткоживущим и audience-scoped только под chat.

### Минусы

- появляется дополнительный auth contract между `core-api` и `chat-service`;
- нужен общий secret rotation process;
- это не заменяет полноценный refresh policy для долгоживущих websocket reconnection сценариев.

## Что дальше

- добавить secret rotation policy для bridge token;
- при необходимости ввести refresh/reconnect strategy для web chat;
- расширить smoke/e2e сценарии под OIDC chat flow.
