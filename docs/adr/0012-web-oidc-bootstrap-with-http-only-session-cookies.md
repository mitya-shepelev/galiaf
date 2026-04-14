# ADR 0012: Web OIDC Bootstrap With HttpOnly Session Cookies

## Статус

Accepted

## Контекст

Платформа уже публично доступна, а `core-api` и `chat` умеют проверять bearer token по `JWKS`. Но внутренние web-кабинеты до этого шага работали только через demo personas и `x-dev-auth-context`.

Для production readiness нужен следующий безопасный шаг:

- web должен уметь пройти реальный OIDC login flow;
- итоговая web-сессия не должна хранить access token в `localStorage`;
- rollout не должен зависеть от полной переработки chat websocket auth в том же шаге.

## Решение

1. `admin-portal`, `manager-cabinet`, `employee-cabinet` получают минимальный server-side OIDC bootstrap:
   - `/auth/login`
   - `/auth/callback`
   - `/auth/logout`
2. Web использует `Authorization Code Flow + PKCE`.
3. После callback access token сохраняется в `HttpOnly`, `Secure`, `SameSite=Lax` cookie конкретного web-приложения.
4. Server components и server actions используют bearer token из cookie при обращении к `core-api`.
5. Demo personas остаются только как explicit local/debug path.
6. Realtime chat в web при `OIDC` пока не включается, пока не будет отдельного websocket auth bridge без вывода access token в client runtime.

## Последствия

### Плюсы

- внутренние кабинеты получают реальный production login flow;
- access token не хранится в `localStorage`;
- rollout можно делать поэтапно, без блокировки на websocket auth bridge.

### Минусы

- chat в web временно остается dev-only до следующего auth шага;
- logout пока опирается на provider `end_session_endpoint`, если он доступен в discovery;
- web-сессия сейчас живет в рамках access token lifetime, без отдельного refresh orchestration.

## Следующий шаг

- добавить websocket auth bridge для `chat` в web OIDC режиме;
- добавить refresh/session renewal policy;
- довести Keycloak client setup, redirect URIs и logout policy в production runbook.
