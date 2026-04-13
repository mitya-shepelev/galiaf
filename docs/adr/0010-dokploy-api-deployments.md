# ADR 0010: Dokploy API Deployments After Image Publish

## Статус

Accepted

## Контекст

Проект уже публикует production images в GHCR через GitHub Actions.

Ранее delivery path ориентировался на self-managed deploy webhook consumer на стороне сервера. Но production окружение сейчас живет в Dokploy, и для каждого приложения уже создан отдельный Dokploy application.

Нам нужен единый и предсказуемый путь:

- собрать image в GitHub Actions;
- опубликовать image в GHCR;
- инициировать redeploy приложений в Dokploy;
- не держать дополнительный обязательный custom deploy consumer как главный production путь.

Dokploy официально поддерживает programmatic deploy через `application.deploy`.

## Решение

Основной production delivery path переводится на Dokploy API:

1. `CI` проходит на `main`.
2. `Deploy Containers` публикует 6 image в GHCR.
3. После публикации workflow вызывает `POST /application.deploy` в Dokploy для:
   - `public-site`
   - `admin-portal`
   - `manager-cabinet`
   - `employee-cabinet`
   - `core-api`
   - `chat`
4. GitHub хранит:
   - `DOKPLOY_URL`
   - `DOKPLOY_TOKEN`
   - `DOKPLOY_APP_ID_*` для 6 приложений

Self-managed deploy webhook consumer остается как fallback/self-hosted path, но не как основной production механизм для Dokploy окружения.

## Последствия

### Плюсы

- production deploy path соответствует текущей hosting-платформе;
- меньше кастомной серверной логики в обязательном критическом пути;
- GitHub Actions деплоит только после успешной публикации image.

### Минусы

- delivery теперь зависит от доступности Dokploy API;
- нужно поддерживать в GitHub корректные `applicationId`;
- часть старой self-managed deploy документации становится fallback, а не primary path.

## Что не делаем сейчас

- не удаляем self-managed deploy webhook consumer из репозитория;
- не переводим Dokploy deploy в environment-specific matrix c partial deploy rules;
- не добавляем rollback orchestration поверх Dokploy API в этом шаге.
