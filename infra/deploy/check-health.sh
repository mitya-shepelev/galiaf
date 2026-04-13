#!/usr/bin/env bash

set -euo pipefail

CORE_API_HEALTH_URL="${CORE_API_HEALTH_URL:-http://127.0.0.1:4000/api/v1/health/ready}"
CHAT_HEALTH_URL="${CHAT_HEALTH_URL:-http://127.0.0.1:4010/api/v1/health/ready}"
ADMIN_PORTAL_URL="${ADMIN_PORTAL_URL:-http://127.0.0.1:3001/api/health/ready}"
MANAGER_CABINET_URL="${MANAGER_CABINET_URL:-http://127.0.0.1:3002/api/health/ready}"
EMPLOYEE_CABINET_URL="${EMPLOYEE_CABINET_URL:-http://127.0.0.1:3003/api/health/ready}"
PUBLIC_SITE_URL="${PUBLIC_SITE_URL:-http://127.0.0.1:3000/api/health/ready}"
HEALTHCHECK_TIMEOUT_SECONDS="${HEALTHCHECK_TIMEOUT_SECONDS:-180}"

wait_for_url() {
  local name="$1"
  local url="$2"
  local started_at

  started_at="$(date +%s)"

  until curl --fail --silent --show-error "$url" > /dev/null; do
    if (( "$(date +%s)" - started_at >= HEALTHCHECK_TIMEOUT_SECONDS )); then
      echo "Timed out waiting for $name at $url" >&2
      exit 1
    fi
    sleep 2
  done
}

wait_for_url "core-api" "$CORE_API_HEALTH_URL"
wait_for_url "chat" "$CHAT_HEALTH_URL"
wait_for_url "public-site" "$PUBLIC_SITE_URL"
wait_for_url "admin-portal" "$ADMIN_PORTAL_URL"
wait_for_url "manager-cabinet" "$MANAGER_CABINET_URL"
wait_for_url "employee-cabinet" "$EMPLOYEE_CABINET_URL"
