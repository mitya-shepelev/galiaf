# ADR 0005: Централизованная авторизация через OIDC provider

- Статус: accepted
- Дата: 2026-04-13

## Контекст

Платформа должна поддерживать:

- три разные роли доступа;
- несколько web-приложений;
- мобильное приложение на Expo;
- backend API;
- chat service.

Если реализовывать логин и хранение паролей внутри `core-api`, система быстро придет к проблемам с SSO, refresh flow, logout, MFA, mobile redirects и безопасным хранением сессий.

## Решение

Принять централизованную identity-модель:

1. Источник аутентификации и пользовательских сессий выносится в отдельный OIDC provider.
2. Базовый рекомендуемый вариант для self-hosted окружения: `Keycloak`.
3. Все клиенты используют `Authorization Code Flow + PKCE`.
4. `Password Grant` не используется.
5. `core-api` и `chat` работают как resource servers и валидируют access token по `JWKS`.

## Клиенты

- `galiaf-admin-portal`
- `galiaf-manager-cabinet`
- `galiaf-employee-cabinet`
- `galiaf-mobile-app`
- `galiaf-core-api`
- `galiaf-chat`

## Модель ролей

- `platform_admin` является глобальной платформенной ролью.
- `company_manager` и `employee` являются tenant-scoped ролями.
- В access token должен присутствовать активный контекст доступа:
  - `active_tenant`
  - `tenant_memberships`
  - или эквивалентные custom claims, из которых backend восстанавливает effective roles.

## Правила по платформам

### Web

- web-клиенты не должны хранить access token в `localStorage`;
- рекомендуется BFF/session-cookie подход на стороне web-приложений;
- cookies должны быть `HttpOnly`, `Secure`, `SameSite=Lax` или строже.

### Mobile

- mobile использует OIDC/PKCE через `expo-auth-session`;
- access token хранится краткоживущим;
- refresh token хранится в защищенном storage;
- redirect URI регистрируются на клиенте явно.

### API и chat

- `core-api` и `chat` проверяют issuer, audience, подпись и срок жизни токена;
- websocket handshake должен принимать тот же access token и восстанавливать auth context без отдельной логики логина.

## Последствия

Плюсы:

- единый SSO для web и mobile;
- меньше риска сломать auth при росте числа клиентов;
- проще добавить MFA, social login и внешние identity providers;
- backend не хранит пользовательские пароли и не становится identity-provider сам по себе.

Минусы:

- появляется отдельный критичный компонент identity;
- требуется тщательная настройка claims и redirect URIs;
- нужно явно проектировать tenant context и role switching.
