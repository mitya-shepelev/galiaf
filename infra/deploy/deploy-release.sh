#!/usr/bin/env bash

set -euo pipefail

IMAGE_TAG="${1:-}"
DEPLOY_ROOT="${DEPLOY_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
COMPOSE_FILE="${DEPLOY_COMPOSE_FILE:-$DEPLOY_ROOT/infra/compose/docker-compose.server.yml}"
ENV_FILE="${DEPLOY_ENV_FILE:-$DEPLOY_ROOT/infra/compose/.env}"
HEALTHCHECK_SCRIPT="${DEPLOY_HEALTHCHECK_SCRIPT:-$DEPLOY_ROOT/infra/deploy/check-health.sh}"

if [[ -z "$IMAGE_TAG" ]]; then
  echo "IMAGE_TAG argument is required" >&2
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

if [[ ! -x "$HEALTHCHECK_SCRIPT" ]]; then
  echo "Healthcheck script is not executable: $HEALTHCHECK_SCRIPT" >&2
  exit 1
fi

tmp_env="$(mktemp)"
trap 'rm -f "$tmp_env"' EXIT

awk -v image_tag="$IMAGE_TAG" '
  BEGIN { replaced = 0 }
  /^IMAGE_TAG=/ {
    print "IMAGE_TAG=" image_tag
    replaced = 1
    next
  }
  { print }
  END {
    if (replaced == 0) {
      print "IMAGE_TAG=" image_tag
    }
  }
' "$ENV_FILE" > "$tmp_env"

mv "$tmp_env" "$ENV_FILE"

docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  pull

docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  up -d

"$HEALTHCHECK_SCRIPT"
