# Galiaf Platform

Монорепозиторий для платформы охранной компании.

## Цели

- Публичный сайт компании.
- Backend с ролевой моделью и API.
- Отдельные кабинеты для администратора, руководителя и сотрудника.
- Мобильное приложение для iOS и Android.
- Отдельный чат-микросервис.
- GitHub-based CI/CD с Docker-деплоем на сервер.

## Предлагаемая структура

```text
.
├── AGENTS.md
├── docs/
├── apps/
│   ├── api/core-api
│   ├── mobile/app
│   └── web/
│       ├── public-site
│       ├── admin-portal
│       ├── manager-cabinet
│       └── employee-cabinet
├── services/
│   └── chat
├── packages/
│   ├── ui
│   ├── types
│   ├── sdk
│   ├── config
│   ├── eslint-config
│   └── tsconfig
├── infra/
│   ├── ci
│   ├── compose
│   ├── docker
│   └── terraform
└── scripts/
```

## Базовый стек

- Web: Next.js + TypeScript
- Backend: NestJS + TypeScript
- Mobile: React Native + Expo
- Chat: NestJS microservice + WebSocket + Redis
- Database: PostgreSQL
- Cache/queues: Redis
- Deployment: GitHub Actions + Docker Registry + webhook deploy

## Зафиксированные версии

- `pnpm`: `10.15.0`
- `turbo`: `2.5.6`
- `typescript`: `5.9.2`
- `next`: `15.5.3`
- `react`: `19.1.1`
- `react-dom`: `19.1.1`
- `@nestjs/*`: `11.1.6`
- `expo`: `53.0.22`
- `react-native`: `0.79.6`
- `tsx`: `4.20.5`
- `@biomejs/biome`: `2.2.3`

Все версии зафиксированы без диапазонов `^` и `~`, чтобы стартовая сборка была воспроизводимой.

## Рабочие команды

- `pnpm install`
- `pnpm dev`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## Auth Strategy

- Централизованный OIDC provider вместо самописной парольной логики в `core-api`
- `Authorization Code + PKCE` для `web` и `mobile`
- `core-api` и `chat` работают как resource servers и валидируют JWT access token по `JWKS`
- `platform_admin` является глобальной ролью, `company_manager` и `employee` работают в tenant-контексте
- Для локальной разработки допускается `dev`-режим с подстановкой auth context через заголовок, но production-путь должен идти через OIDC

## Роли

- `platform_admin`: системный администратор платформы.
- `company_manager`: руководитель организации, который создает сотрудников и выдает доступы.
- `employee`: сотрудник организации с ограниченным личным кабинетом.

Подробности зафиксированы в `docs/`.
