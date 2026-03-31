FROM php:8.3-cli-bookworm AS php-base

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git \
        postgresql-client \
        unzip \
        libicu-dev \
        libpq-dev \
        libzip-dev \
    && docker-php-ext-install \
        bcmath \
        intl \
        pcntl \
        pdo_pgsql \
        pgsql \
        zip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /var/www/html

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

FROM php-base AS vendor

COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --prefer-dist \
    --no-interaction \
    --no-progress \
    --optimize-autoloader

FROM node:20-bookworm AS node

FROM php-base AS frontend

COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/bin/npm /usr/local/bin/npm
COPY --from=node /usr/local/bin/npx /usr/local/bin/npx
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules

RUN ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -sf /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
COPY --from=vendor /var/www/html/vendor ./vendor
RUN npm run build

FROM php-base

COPY . .
COPY --from=vendor /var/www/html/vendor ./vendor
COPY --from=frontend /app/public/build ./public/build
COPY docker/entrypoint.sh /usr/local/bin/hodina-entrypoint

RUN chmod +x /usr/local/bin/hodina-entrypoint \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 8000

ENTRYPOINT ["hodina-entrypoint"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
