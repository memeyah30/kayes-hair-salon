#!/usr/bin/env bash

set -euo pipefail

echo "Preparing Laravel application for Railway..."

mkdir -p storage/framework/{cache/data,sessions,views} bootstrap/cache

php artisan optimize:clear
php artisan storage:link --force || true

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  php artisan migrate --force
fi

php artisan config:cache
php artisan view:cache
php artisan event:cache

echo "Laravel Railway preparation complete."
