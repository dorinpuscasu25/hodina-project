# Hodina Dashboard

## Docker

1. Creează fișierul local de configurare:

```bash
cp .env.example .env
```

2. Ajustează valorile din `.env`:

```env
DASH_PORT=3001
VITE_API_BASE_URL=https://api.exemplu.ro/api/v1
```

3. Pornește aplicația:

```bash
docker compose up -d --build
```

4. Oprește aplicația:

```bash
docker compose down
```

Notă: `VITE_API_BASE_URL` este injectat la build, deci după orice schimbare în `.env` trebuie rulat din nou `docker compose up -d --build`.
