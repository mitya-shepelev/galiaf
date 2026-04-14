# ADR 0011: Explicit Opt-In For Dev Auth In Public Environments

## Статус

Accepted

## Контекст

Платформа уже доступна из интернета, но текущая временная auth-модель все еще использует:

- `AUTH_MODE=dev`
- `AUTH_DEV_BYPASS_ENABLED=true`
- demo personas в web кабинетах

Это допустимо только как временный debug path. Если оставить его без явных guardrail-ов, production deployment может незаметно продолжать работать в небезопасном режиме.

## Решение

Вводим явный security guard:

1. `core-api` и `chat` при старте валидируют auth runtime safety.
2. Если `AUTH_MODE=dev` и `AUTH_ALLOWED_CORS_ORIGINS` содержит non-local origins, сервис отказывается стартовать без:

```text
AUTH_UNSAFE_ALLOW_DEV_BYPASS=true
```

3. Если `AUTH_MODE=oidc`, `AUTH_DEV_BYPASS_ENABLED=true` запрещен.
4. `admin-portal`, `manager-cabinet`, `employee-cabinet` больше не используют demo personas в production неявно.
5. Для временного internet-facing debug режима нужен отдельный явный opt-in:

```text
GALIAF_ENABLE_DEV_PERSONAS=true
```

## Последствия

### Плюсы

- публичный deployment больше не может незаметно остаться на dev auth;
- небезопасный режим требует явного и осознанного подтверждения;
- следующий шаг к OIDC становится более управляемым.

### Минусы

- production-like окружения на demo auth теперь требуют дополнительных env vars;
- до внедрения OIDC кабинеты могут показывать explicit auth-required экран вместо live данных.

## Что не делаем сейчас

- не внедряем полноценный OIDC login flow в этом ADR;
- не убираем dev auth из локальной разработки;
- не меняем mobile auth flow в этом шаге.
