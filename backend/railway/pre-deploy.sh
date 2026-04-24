#!/usr/bin/env bash

set -euo pipefail

echo "Preparing Laravel application for Railway..."

mkdir -p storage/framework/{cache/data,sessions,views} bootstrap/cache

php artisan optimize:clear
php artisan storage:link --relative --force || true

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  php artisan migrate --force
fi

if [ -n "${ADMIN_PASSWORD:-}" ]; then
  ensure_admin_args=()
  if [ "${ADMIN_FORCE_PASSWORD:-false}" = "true" ]; then
    ensure_admin_args+=(--update-password)
  fi

  php artisan admin:ensure-from-env "${ensure_admin_args[@]}"
fi

php artisan config:cache
php artisan view:cache
php artisan event:cache

echo "Laravel Railway preparation complete."
