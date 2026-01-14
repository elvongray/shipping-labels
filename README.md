# Shipping Labels

A 3‑step shipping labels wizard that lets users upload CSVs, review/edit shipments, select shipping services, and purchase labels. The app is split into a Django + DRF backend and a Vite + React frontend.

## Features

- CSV import with async processing and progress polling
- Review table with search, filters, pagination, selection, bulk actions
- Address/package edits with modals and validation UX
- Shipping quotes + per‑row and bulk service selection
- Partial checkout: purchase eligible shipments and continue fixing others
- Presets for addresses and packages

## Tech Stack

- Backend: Django, DRF, Celery, Redis, Postgres
- Frontend: Vite, React, TanStack Router/Query/Table, Zustand, shadcn/ui, Tailwind

## Repo Structure

- `backend/` Django + DRF API
- `frontend/` Vite + React UI
- `docker-compose.yml` local Postgres + Redis
- `render.yaml` production deployment config

## Local Development

### Prereqs

- Python 3.12+
- `uv` for Python deps
- `bun` for frontend deps
- Docker (recommended) or local Postgres + Redis

### 1) Start Postgres + Redis (recommended)

```bash
docker compose up -d
```

### 2) Backend setup (uv)

```bash
cd backend
uv sync
```

Create or update `backend/.env` (a sample exists in the repo). Required vars:

```
DJANGO_SECRET_KEY=dev-secret-key
DJANGO_DEBUG=1
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgres://shipping_labels:shipping_labels@localhost:5432/shipping_labels
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
CORS_ALLOWED_ORIGINS=http://localhost:5173
CORS_ALLOW_CREDENTIALS=0
```

Run migrations and start the server:

```bash
uv run python manage.py migrate
uv run python manage.py runserver
```

Start the worker (separate terminal):

```bash
uv run celery --app config worker --loglevel info --concurrency 4
```

### 3) Frontend setup (bun)

```bash
cd frontend
bun install
```

Create/update `frontend/.env`:

```
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

Start the dev server:

```bash
bun dev
```

Open `http://localhost:5173`.

## Common Tasks

- Backend tests: `cd backend && uv run pytest`
- Backend lint: `cd backend && uv run ruff check .`
- Frontend lint: `cd frontend && bun run lint`

## Notes

- The backend is the source of truth for validation and business logic.
- Checkout purchases only eligible shipments (READY + service + verified address). Others remain available for fixes in Review.
- Use the Review “Hide purchased” toggle to focus on remaining shipments.

## Production

Render deployment config is in `render.yaml`. It provisions:

- Postgres database
- Redis for Celery
- `celery-worker` process
- `shipping_labels` web service

Update environment variables as needed in Render before deploying.
