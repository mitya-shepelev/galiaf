# PDR 004: Authentication and session model

- Версия: draft
- Дата: 2026-04-13

## Бизнес-требование

Пользователь может входить в разные клиенты платформы без расхождения логики авторизации:

- web-кабинеты;
- мобильное приложение;
- чат;
- backend API.

## Базовые правила

1. Один пользователь может существовать независимо от роли.
2. Роль привязывается либо к платформе, либо к организации.
3. Аутентификация и управление сессиями централизованы.
4. Backend не хранит парольную бизнес-логику приложения.

## Типы доступа

### Глобальный доступ

- `platform_admin`

### Tenant-scoped доступ

- `company_manager`
- `employee`

## Session model

### Web

- login через OIDC provider;
- code flow с PKCE;
- итоговая сессия должна жить в защищенной cookie web-приложения;
- logout должен инициировать single logout в identity provider.
- web chat в OIDC режиме использует отдельный short-lived bridge token вместо основного access token.

### Mobile

- login через браузерный auth flow;
- redirect через app scheme;
- refresh flow через provider;
- чувствительные токены не хранятся в небезопасном storage.
- dev build должен уметь переключать `baseUrl` и persona context для smoke-проверки `session`, `workspace` и RBAC до подключения production OIDC.

### API

- принимает access token;
- не выдает собственные пароли и не дублирует login screen;
- проверяет token claims и access context.
- для tenant-scoped ролей может использовать `memberships` из собственной БД как fallback-источник доступа, если tenant claims не пришли из identity provider.

### Chat

- использует тот же access token, что и API;
- подключение к websocket не должно жить по отдельной auth-схеме.

## MFA policy

- для `platform_admin` MFA обязательно;
- для `company_manager` MFA рекомендуется как обязательное требование для production;
- для `employee` MFA зависит от модели угроз и требований заказчика.

## Запрещенные решения

- самописный password auth в `core-api`;
- `Resource Owner Password Credentials`;
- хранение access token в `localStorage` для production web;
- разные таблицы пользователей для web/mobile/chat.
