#!/bin/sh
set -e

cd /var/www/html

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

if [ ! -L public/storage ]; then
  php artisan storage:link >/dev/null 2>&1 || true
fi

if [ "${RUN_MIGRATIONS:-false}" = "true" ] && [ "${CONTAINER_ROLE:-app}" = "app" ]; then
  php artisan migrate --force
fi

if [ "${APP_ENV:-production}" = "production" ] && [ "${CONTAINER_ROLE:-app}" = "app" ]; then
  php artisan config:cache
  php artisan route:cache
  php artisan view:cache
fi

exec "$@"

