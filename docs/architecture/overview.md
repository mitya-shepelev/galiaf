# Architecture Overview

## Контейнеры

- `apps/web/public-site`: публичный сайт.
- `apps/web/admin-portal`: панель платформенного администратора.
- `apps/web/manager-cabinet`: кабинет руководителя.
- `apps/web/employee-cabinet`: кабинет сотрудника.
- `apps/api/core-api`: backend API, auth, RBAC, audit, tenant management.
- `services/chat`: realtime messaging service.
- `postgres`: основная БД.
- `redis`: cache, pub/sub, realtime coordination.

## Интеграции

1. Web и mobile клиенты работают с `core-api`.
2. Chat clients работают с `services/chat`, используя auth context из `core-api`.
3. `core-api` отправляет события в notification/chat integration layer.
4. GitHub Actions собирает и публикует контейнеры.
5. Deploy webhook запускает обновление контейнеров на сервере.

## Стартовая структура каталогов

```text
apps/
  web/
    public-site/
    admin-portal/
    manager-cabinet/
    employee-cabinet/
  api/
    core-api/
  mobile/
    app/
services/
  chat/
packages/
  ui/
  types/
  sdk/
  config/
infra/
  docker/
  compose/
  ci/
```
