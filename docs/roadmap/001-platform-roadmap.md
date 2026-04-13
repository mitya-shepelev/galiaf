# Platform Roadmap

- Статус: active
- Дата: 2026-04-13
- Формат: living document

## Цель

Этот roadmap фиксирует, куда мы двигаем платформу дальше, в каком порядке и по каким критериям считаем этап завершенным.

Документ не заменяет ADR/PDR:

- архитектурные изменения продолжаем фиксировать в `docs/adr/`;
- продуктовые изменения, роли и сценарии продолжаем фиксировать в `docs/pdr/`.

## Текущее состояние

На текущий момент у нас уже есть базовый каркас платформы:

- монорепозиторий с разделением на `web`, `api`, `mobile`, `services/chat`, `packages`, `infra`, `docs`;
- базовый auth contract и dev bypass для локальной разработки;
- кабинеты `admin`, `manager`, `employee` и публичный сайт как отдельные приложения;
- `chat-service` с отдельной БД, Redis realtime bus, presence, persisted messages, delivery/read receipts;
- notification outbox для chat events;
- локальный runbook и smoke test для manager/employee chat flow.

## Принцип приоритизации

Сначала закрываем то, без чего команда дальше будет упираться:

1. доменная модель и рабочие CRUD/flows в `core-api`;
2. интеграция кабинетов с live backend;
3. базовый production delivery pipeline;
4. mobile на тех же контрактах;
5. hardening, observability и production readiness.

## Этапы

### Phase 0. Foundation

- Статус: `done`
- Результат:
  - каркас монорепозитория;
  - базовые пакеты `types/sdk/config`;
  - отдельный `chat-service`;
  - базовые docs, ADR, PDR, runbooks.

### Phase 1. Core Domain And RBAC

- Статус: `in_progress`
- Цель: довести `core-api` до рабочего состояния для трех ролей.
- Основные задачи:
  - завершить lifecycle для `organizations / users / memberships / invitations`;
  - зафиксировать API contracts и DTO в `packages/`;
  - закрыть manager flow: создание сотрудника, выдача доступа, отзыв доступа;
  - закрыть employee flow: просмотр только разрешенных данных;
  - закрыть admin flow: управление организациями и аудитом;
  - добавить e2e smoke tests по ролям вне chat-сценариев.
- Критерий выхода:
  - manager может создать сотрудника и выдать доступ через live API;
  - employee получает только разрешенные данные;
  - admin управляет организациями и видит аудит;
  - сценарии покрыты smoke/e2e тестами.

### Phase 2. Web Cabinets To Live State

- Статус: `in_progress`
- Цель: перевести web-приложения из каркаса в рабочие кабинеты.
- Основные задачи:
  - подключить admin portal к live organization/user management;
  - завершить manager cabinet вокруг live `invitations`, `memberships` и `employee roster`;
  - подключить employee cabinet к персональным данным и рабочему пространству;
  - оформить ошибки доступа, empty states и loading states;
  - добавить smoke tests на ключевые web flows.
- Текущий прогресс:
  - `admin-portal` уже использует live `organizations`, `users`, `memberships`, `admin/bootstrap` и позволяет создавать организации через live action;
  - `manager-cabinet` уже использует live `core-api` для просмотра активной организации, roster, memberships и pending invitations;
  - в `manager-cabinet` уже подключены live actions для создания invitation и прямого provisioning сотрудника.
  - `employee-cabinet` переведен на live `users/me` и `workspace`, чтобы кабинет опирался только на разрешенные employee-scoped данные.
  - добавлен минимальный `web-cabinets` smoke test для live-проверки `admin`, `manager` и `employee` кабинетов.
- Критерий выхода:
  - каждая роль может пройти свой базовый путь через web UI без ручных заглушек.

### Phase 3. Chat Productization

- Статус: `in_progress`
- Цель: довести чат от технического MVP до интегрируемого сервиса.
- Основные задачи:
  - добавить notification worker/bridge, который читает `galiaf:chat:notifications`;
  - определить retention policy и cleanup jobs;
  - добавить attachment metadata pipeline;
  - расширить e2e smoke test до split-instance сценариев и failure/retry cases;
  - связать chat rooms и права доступа с core domain.
- Критерий выхода:
  - чат можно безопасно подключать к production notification pipeline;
  - права на комнаты и события согласованы с `core-api`;
  - есть минимальный набор operational runbooks.

### Phase 4. Mobile App

- Статус: `planned`
- Цель: довести Expo mobile app до рабочего клиента на тех же контрактах, что и web.
- Основные задачи:
  - авторизация через выбранный OIDC flow;
  - переключение ролей/dev personas только для локальной разработки;
  - экран рабочего пространства сотрудника;
  - базовый chat client;
  - smoke tests для Expo dev build;
  - подготовка EAS profiles и secrets strategy.
- Критерий выхода:
  - employee может авторизоваться, открыть workspace и чат с live backend.

### Phase 5. CI/CD And Delivery

- Статус: `planned`
- Цель: перевести проект на предсказуемую сборку и доставку через GitHub Actions и Docker.
- Основные задачи:
  - собрать workflow-ы на `lint`, `typecheck`, `test`, `build`;
  - build/push Docker images для `web`, `core-api`, `chat-service`;
  - webhook-triggered deploy на сервер;
  - Docker Compose или эквивалент для обновления контейнеров;
  - env/secrets strategy для GitHub, server и Expo.
- Критерий выхода:
  - после merge/push артефакты собираются автоматически;
  - сервер обновляется по webhook без ручного SSH как основного пути.

### Phase 6. Security, Observability, Production Readiness

- Статус: `planned`
- Цель: убрать главные риски перед production rollout.
- Основные задачи:
  - завершить production OIDC configuration;
  - audit trail и security-sensitive events;
  - health/readiness/liveness checks для всех сервисов;
  - централизованные логи и базовые метрики;
  - rollback runbooks, incident runbooks, backup/restore policy;
  - rate limits, secret rotation, dependency review.
- Критерий выхода:
  - проект можно безопасно выкатывать в staging/production с понятной операционной моделью.

## Ближайший фокус

Логичнее всего двигаться так:

1. Оформить empty/error/loading states там, где кабинеты еще выглядят как технические экраны, а не продуктовые flows.
2. После этого собрать базовый GitHub Actions + Docker delivery path, чтобы изменения можно было стабильно гонять через CI.
3. Затем уже подключать эти smoke checks в GitHub Actions как часть delivery pipeline.

## Что считаем успехом в ближайшие итерации

В коротком горизонте нам нужно получить три результата:

- роли работают не только на уровне auth claims, но и на уровне реальных бизнес-сценариев;
- web и mobile опираются на один и тот же backend contract;
- деплой и сборка перестают быть ручным процессом.

## Правило обновления roadmap

Roadmap обновляется, когда меняется:

- порядок приоритетов;
- состав ближайших этапов;
- критерии завершения этапов;
- состав крупных delivery milestones.
