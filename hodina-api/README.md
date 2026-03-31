# Hodina API

Laravel API pentru platforma Hodina, construit pentru:

- clienti care rezerva experiente si cazari
- pensiuni care administreaza calendarul, confirmarile si chatul dupa confirmare
- admin custom Laravel + React care configureaza pensiuni, conturi, categorii si date de sistem in `en`, `ro`, `ru`

## Pornire rapida

1. În backend pornește infrastructura proprie:

```bash
cd hodina-api
docker compose up -d
```

2. Tot în `hodina-api`:

```bash
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

3. Emailurile de verificare se pot vedea în Mailpit:

- [http://localhost:8025](http://localhost:8025)

## Date demo

- Admin: `admin@hodina.local` / `password`
- Host: `host@hodina.local` / `password`
- Guest: `guest@hodina.local` / `password`

## Endpointuri principale

- `POST /api/v1/client/auth/register`
- `POST /api/v1/client/auth/login`
- `POST /api/v1/host/auth/login`
- `GET /api/v1/public/bootstrap`
- `GET /api/v1/public/experiences`
- `GET /api/v1/public/accommodations`
- `POST /api/v1/client/bookings/experiences/{session}`
- `POST /api/v1/client/bookings/accommodations/{accommodation}`
- `POST /api/v1/host/bookings/{booking}/confirm`
- `POST /api/v1/host/bookings/{booking}/reject`
- `GET /api/v1/host/calendar`

## Admin

- Adminul custom ruleaza la `/admin`
- Este construit in Laravel + React/Inertia, in acelasi backend
- Accesul este permis doar utilizatorilor cu rol `admin`
- Categoriile si datele traductibile se completeaza pe taburi `EN / RO / RU`
- Frontendurile raman proiecte separate si comunica doar prin API-ul Laravel
