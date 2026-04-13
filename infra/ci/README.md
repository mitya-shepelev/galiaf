# CI/CD Notes

## Workflows

- `ci.yml`: линт, typecheck, test и build.
- `deploy-containers.yml`: сборка и публикация Docker image в GHCR, затем вызов deploy webhook.
- `mobile-build.yml`: запуск production EAS build через GitHub Actions.

## Secrets

- `DEPLOY_WEBHOOK_URL`
- `DEPLOY_WEBHOOK_TOKEN`
- `EXPO_TOKEN`
