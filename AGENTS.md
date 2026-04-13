# AGENTS

Этот репозиторий развивается как монорепозиторий платформы охранной компании. Все изменения должны сохранять согласованность между web, mobile, backend, chat-service и документацией.

## Обязательные принципы

1. Любое изменение архитектуры сопровождается новым ADR в `docs/adr/`.
2. Любое изменение продуктового scope, ролей или ключевых пользовательских сценариев сопровождается обновлением PDR в `docs/pdr/`.
3. Общие типы, DTO, API contracts и SDK выносятся в `packages/`, а не дублируются в приложениях.
4. Публичный сайт, административная панель, кабинет руководителя и кабинет сотрудника не смешиваются в один deployable artifact без отдельного ADR.
5. Chat service не содержит core business logic. Его зона ответственности: сообщения, presence, delivery status, attachments metadata и realtime transport.
6. Core business logic, RBAC, доступы, аудит и интеграции находятся в `apps/api/core-api`.

## Целевая структура

- `apps/web/public-site`: публичный сайт компании.
- `apps/web/admin-portal`: панель системного администратора.
- `apps/web/manager-cabinet`: кабинет руководителя компании-клиента.
- `apps/web/employee-cabinet`: кабинет сотрудника организации.
- `apps/api/core-api`: основной backend и BFF/API слой.
- `apps/mobile/app`: мобильное приложение на Expo/React Native.
- `services/chat`: отдельный чат-микросервис.
- `packages/*`: общие библиотеки, типы, SDK и конфигурации.
- `docs/*`: ADR, PDR, схемы, runbooks.
- `infra/*`: Docker, CI/CD, IaC, deployment configs.

## GitHub и delivery

1. Код хранится в GitHub.
2. Pull request обязателен для изменений в `apps/`, `services/`, `packages/`, `infra/` и `docs/`.
3. GitHub Actions выполняют:
   - lint
   - unit tests
   - typecheck
   - build affected apps/services
   - Docker image build/push для web/backend/chat
4. Деплой на сервер запускается webhook-ом после успешной публикации Docker image.
5. Серверная сторона деплоя должна обновлять контейнеры через Docker Compose или другой контейнерный оркестратор, но не через ручной SSH как основной путь.

## Mobile build policy

1. Сборка мобильных приложений выполняется через Expo/EAS, чтобы не нагружать локальные машины.
2. Локально допускаются только dev-сборки, emulator/simulator runs и smoke tests.
3. Secrets для mobile builds хранятся в GitHub Secrets и/или Expo secrets, но не в репозитории.

## Backend rules

1. RBAC обязателен на уровне API и доменных сервисов.
2. Минимальные сущности доступа:
   - `platform_admin`
   - `company_manager`
   - `employee`
3. `company_manager` может:
   - создавать сотрудников своей организации
   - выдавать и отзывать доступ
   - управлять объектами и рабочими процессами своей организации
4. `employee` видит только собственные данные и данные, явно разрешенные политиками доступа.
5. `platform_admin` управляет платформой, организациями, глобальными настройками и аудитом.

## Документация

1. Новый сервис нельзя добавлять без описания границ ответственности.
2. Новый внешний интеграционный контракт должен быть отражен в `docs/architecture/` или `docs/api/`.
3. Runbook обязателен для деплоя, rollback и инцидентов.

## Definition of Done

Изменение считается завершенным, когда:

1. код собран и проверен локально в разумном объеме;
2. обновлены тесты или явно зафиксирован долг;
3. обновлены ADR/PDR при необходимости;
4. описаны env vars, миграции и операционные эффекты;
5. GitHub Actions для соответствующих компонентов остаются зелеными.
