# CI/CD Notes

## Workflows

- `ci.yml`: линт, typecheck, test, build и live smoke checks для `core-api`, `chat` и web кабинетов.
- `deploy-containers.yml`: сборка и публикация Docker image в GHCR только после успешного `CI` на `main`, затем вызов deploy webhook.
- `mobile-build.yml`: запуск production EAS build через GitHub Actions.

## Secrets

- `DEPLOY_WEBHOOK_URL`
- `DEPLOY_WEBHOOK_TOKEN`
- `EXPO_TOKEN`

## Notes

- deploy webhook получает `sha` и `imageTag`, чтобы сервер мог развернуть именно тот image tag, который был опубликован workflow.
