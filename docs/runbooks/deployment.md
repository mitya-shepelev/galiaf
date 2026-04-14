# Deployment Runbook

## Общая схема

1. Разработчик открывает pull request в GitHub.
2. GitHub Actions выполняет проверки.
3. После merge в основную ветку собираются Docker images.
4. Образы публикуются в registry.
5. После успешного `CI` workflow публикации вызывает Dokploy API deploy для production applications.
6. Dokploy выполняет redeploy приложений на опубликованных image.
7. Выполняются health checks и platform-level deployment checks.

Webhook payload описан отдельно в `docs/architecture/deploy-webhook-contract.md`.
Dokploy production deploy contract описан отдельно в `docs/architecture/dokploy-deploy-contract.md`.
Health probes описаны отдельно в `docs/architecture/health-contract.md`.
Metrics и log sources описаны отдельно в `docs/architecture/observability.md`.
Отдельный runbook для centralized logs описан в `docs/runbooks/observability.md`.

## Требования к серверу

- установлен Docker;
- установлен Docker Compose plugin;
- установлен Node.js 20+ для запуска webhook consumer;
- настроен reverse proxy;
- webhook endpoint защищен подписью или token-based validation;
- настроено логирование контейнеров.
- на сервере подготовлен `.env` для `infra/compose/docker-compose.server.yml`.

## Переменные окружения compose

Минимально нужно заполнить:

- `GHCR_NAMESPACE`
- `IMAGE_TAG`
- `GALIAF_PUBLIC_SITE_URL`
- `GALIAF_ADMIN_PORTAL_URL`
- `GALIAF_MANAGER_CABINET_URL`
- `GALIAF_EMPLOYEE_CABINET_URL`
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_NAME`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `CHAT_DATABASE_HOST`
- `CHAT_DATABASE_PORT`
- `CHAT_DATABASE_NAME`
- `CHAT_DATABASE_ADMIN_NAME`
- `CHAT_DATABASE_USER`
- `CHAT_DATABASE_PASSWORD`
- `REDIS_URL`
- `AUTH_MODE`
- `AUTH_DEV_BYPASS_ENABLED`
- `AUTH_UNSAFE_ALLOW_DEV_BYPASS`
- `AUTH_ISSUER_URL`
- `AUTH_AUDIENCE`
- `AUTH_JWKS_URI`
- `AUTH_ALLOWED_CORS_ORIGINS`
- `GALIAF_ENABLE_DEV_PERSONAS`
- `CHAT_AUTH_AUDIENCE`
- `AUTH_ADMIN_WEB_CLIENT_ID`
- `AUTH_MANAGER_WEB_CLIENT_ID`
- `AUTH_EMPLOYEE_WEB_CLIENT_ID`
- `AUTH_MOBILE_CLIENT_ID`

## Dokploy production path

Для production окружения в Dokploy GitHub Actions использует:

- `DOKPLOY_URL`
- `DOKPLOY_TOKEN`
- `DOKPLOY_APP_ID_*` для 6 приложений

Текущий workflow вызывает:

```text
POST <DOKPLOY_URL>/application.deploy
```

с payload:

```json
{
  "applicationId": "..."
}
```

Это primary production path для Dokploy.

## Временный public debug режим

Если production-like deployment пока еще работает без реального OIDC и использует dev bypass, теперь это требует явного opt-in.

Для `core-api` и `chat`:

```text
AUTH_MODE=dev
AUTH_DEV_BYPASS_ENABLED=true
AUTH_UNSAFE_ALLOW_DEV_BYPASS=true
```

Для `admin-portal`, `manager-cabinet`, `employee-cabinet`:

```text
GALIAF_ENABLE_DEV_PERSONAS=true
```

Без этих флагов backend/chat не поднимутся на non-local origins, а внутренние кабинеты покажут explicit auth-required экран вместо demo personas.

## Web OIDC bootstrap

Для `admin-portal`, `manager-cabinet`, `employee-cabinet` production path теперь такой:

1. пользователь открывает кабинет;
2. если `GALIAF_ENABLE_DEV_PERSONAS=false` и нет session cookie, кабинет предлагает `/auth/login`;
3. web проходит `OIDC Authorization Code + PKCE`;
4. callback сохраняет access token в `HttpOnly` cookie;
5. server components и server actions используют bearer token для запросов в `core-api`.

Опциональные service-level env overrides для web:

- `GALIAF_OIDC_CLIENT_ID`
- `GALIAF_OIDC_REDIRECT_URI`
- `GALIAF_OIDC_POST_LOGOUT_REDIRECT_URI`

Обычно они не нужны, если:

- `AUTH_*_WEB_CLIENT_ID` на backend совпадают с OIDC provider clients;
- redirect URI может быть вычислен от реального origin кабинета.

Важно: `manager` и `employee` в OIDC-режиме пока не включают live websocket chat. Для этого нужен отдельный auth bridge, который не будет светить access token в client runtime.

## Self-managed fallback deploy stack

Если нужен self-managed fallback path вне Dokploy, можно использовать следующий skeleton из репозитория:

- `infra/deploy/webhook-server.mjs`
- `infra/deploy/deploy-release.sh`
- `infra/deploy/check-health.sh`

Пример запуска:

```bash
cd /opt/galiaf
cp infra/compose/.env.example infra/compose/.env
chmod +x infra/deploy/deploy-release.sh infra/deploy/check-health.sh

export DEPLOY_WEBHOOK_TOKEN='replace-me'
export DEPLOY_REPOSITORY='Mitya-Shepelev/galiaf'
export DEPLOY_REF='main'
node infra/deploy/webhook-server.mjs
```

Webhook consumer слушает:

- `GET /health`
- `POST /deploy`

Для production его лучше запускать через `systemd`, `pm2` или другой supervisor.

## Рекомендуемый systemd unit

В репозитории добавлен пример:

- `infra/deploy/galiaf-deploy-webhook.service`
- `infra/deploy/deploy-webhook.env.example`

Рекомендуемая установка на staging/production сервер:

```bash
sudo mkdir -p /etc/galiaf
sudo cp /opt/galiaf/infra/deploy/deploy-webhook.env.example /etc/galiaf/deploy-webhook.env
sudo cp /opt/galiaf/infra/deploy/galiaf-deploy-webhook.service /etc/systemd/system/galiaf-deploy-webhook.service
sudo systemctl daemon-reload
sudo systemctl enable --now galiaf-deploy-webhook.service
sudo systemctl status galiaf-deploy-webhook.service
```

Полезные команды:

```bash
sudo journalctl -u galiaf-deploy-webhook.service -f
sudo systemctl restart galiaf-deploy-webhook.service
curl http://127.0.0.1:8090/health
curl http://127.0.0.1:8090/metrics
```

Если нужен reverse proxy, его стоит ограничить:

- разрешить только `POST /deploy` и `GET /health`;
- ограничить доступ по IP или internal network;
- не публиковать webhook endpoint без token validation.

## Пример nginx reverse proxy

В репозитории добавлен пример:

- `infra/deploy/nginx.deploy-webhook.conf.example`

Базовый порядок:

1. Скопировать пример в `/etc/nginx/sites-available/galiaf-deploy-webhook.conf`.
2. Подставить реальный `server_name` и TLS certificate paths.
3. При необходимости включить `allow/deny` правила для GitHub Actions IP ranges или internal network.
4. Активировать конфиг и перезагрузить `nginx`.

Минимальная проверка после этого:

```bash
curl -i https://deploy.example.com/deploy
curl -i http://127.0.0.1:8090/health
sudo nginx -t
sudo systemctl reload nginx
```

## Порядок выполнения self-managed deploy по webhook

1. GitHub Actions отправляет `POST /deploy`.
2. `webhook-server.mjs` валидирует `X-Deploy-Token`, `repository`, `ref`, `sha`, `imageTag`.
3. Consumer запускает `infra/deploy/deploy-release.sh <imageTag>`.
4. Скрипт обновляет `IMAGE_TAG` в `infra/compose/.env`.
5. Скрипт выполняет `docker compose pull`.
6. Скрипт выполняет `docker compose up -d`.
7. Скрипт запускает `infra/deploy/check-health.sh`.
8. Логи пишутся в `logs/deploy-webhook.log`.

`check-health.sh` использует readiness probes:

- `core-api`: `/api/v1/health/ready`
- `chat`: `/api/v1/health/ready`
- web apps: `/api/health/ready`

## Rollback

1. Определить последний стабильный image tag.
2. Запустить `infra/deploy/deploy-release.sh <stable-tag>`.
3. Проверить health checks и критические бизнес-сценарии.
4. Если rollback не проходит, сохранить `docker compose logs` и логи webhook consumer.

Пример:

```bash
cd /opt/galiaf
infra/deploy/deploy-release.sh 24352821398
```

## Incident capture checklist

При неуспешном deploy нужно сохранить минимум:

```bash
sudo journalctl -u galiaf-deploy-webhook.service --since '30 minutes ago' > /tmp/galiaf-deploy-webhook.log
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.server.yml ps > /tmp/galiaf-compose-ps.log
docker compose --env-file infra/compose/.env -f infra/compose/docker-compose.server.yml logs --tail=200 > /tmp/galiaf-compose.log
cat logs/deploy-webhook.log > /tmp/galiaf-deploy-run.log
```

Дальше проверить:

1. какой `imageTag` был запрошен;
2. прошел ли `docker compose pull`;
3. на каком сервисе упал healthcheck;
4. можно ли откатиться на предыдущий стабильный tag.

Для дополнительной диагностики можно снять metrics snapshot:

```bash
curl http://127.0.0.1:4000/api/v1/metrics
curl http://127.0.0.1:4010/api/v1/metrics
curl http://127.0.0.1:3000/api/metrics
curl http://127.0.0.1:8090/metrics
```

Для centralized logs можно дополнительно поднять observability profile:

```bash
docker compose \
  --env-file infra/compose/.env \
  -f infra/compose/docker-compose.server.yml \
  --profile observability \
  up -d loki vector
```

## Audit retention

Чтобы `audit_events` не росла бесконтрольно, в репозитории есть baseline команда очистки:

```bash
cd /opt/galiaf
DATABASE_HOST=/var/run/postgresql \
DATABASE_PORT=5432 \
DATABASE_NAME=galiaf \
DATABASE_USER=galiaf \
DATABASE_PASSWORD='replace-me' \
pnpm audit:prune -- --days=90
```

Рекомендуемый operational режим:

1. запускать cleanup по расписанию раз в неделю;
2. держать retention window не меньше `90` дней, если нет отдельного compliance требования;
3. сохранять отдельные incident exports до cleanup, если идет разбор инцидента.

## Staging first-deploy checklist

Перед первым staging deploy:

1. Подготовить `/opt/galiaf` и скопировать репозиторий на сервер.
2. Заполнить `infra/compose/.env`.
3. Заполнить `/etc/galiaf/deploy-webhook.env`.
4. Убедиться, что сервер авторизован в GHCR.
5. Проверить `docker compose ... config`.
6. Проверить `node infra/deploy/webhook-server.mjs` локально на сервере.
7. Поднять `systemd` unit.
8. Проверить `GET /health` у webhook consumer.
9. Поднять reverse proxy и проверить `nginx -t`.
10. Выполнить ручной тест:

```bash
cd /opt/galiaf
infra/deploy/deploy-release.sh latest
```

11. Отправить пробный `POST /deploy` с тестовым token из локальной сети.
12. Только после этого указывать production webhook URL в GitHub Secrets.

Пример ручного теста webhook:

```bash
curl --fail --show-error --silent \
  -X POST http://127.0.0.1:8090/deploy \
  -H "Content-Type: application/json" \
  -H "X-Deploy-Token: replace-me" \
  -d '{"sha":"manual-test-sha","imageTag":"latest","ref":"main","repository":"Mitya-Shepelev/galiaf"}'
```

## Минимальный набор контейнеров

- `public-site`
- `admin-portal`
- `manager-cabinet`
- `employee-cabinet`
- `core-api`
- `chat`
- `postgres`
- `redis`
