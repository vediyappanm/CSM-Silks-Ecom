# CSM Silks E-Commerce - Agent Guide

## Stack
- Backend: Python 3.12+ / Django 6 / Django REST Framework / PostgreSQL in production / SQLite for local dev
- Frontend: React 19 / TypeScript 6 / Vite 8 / React Router 7
- Queue: Celery + Redis
- Infra: Docker Compose with Django API, Celery worker/beat, PostgreSQL, Redis, Nginx

## Quick Start
```bash
python backend/manage.py migrate
python backend/manage.py seed_csm
python backend/manage.py runserver 0.0.0.0:8000

cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies `/api` to Django on `http://localhost:8000`.

## Commands
| Action | Command |
|--------|---------|
| Seed DB | `python backend/manage.py seed_csm` |
| Django migration | `python backend/manage.py makemigrations` |
| Django migrate | `python backend/manage.py migrate` |
| Backend check | `python backend/manage.py check` |
| Backend tests | `python backend/manage.py test accounts catalog cart orders payments inventory loyalty notifications analytics shipping reviews ai` |
| Docker up (dev) | `docker compose up` |
| Docker up (prod) | `docker compose -f docker-compose.prod.yml up` |
| Frontend lint | `cd frontend && npm run lint` |
| Frontend build | `cd frontend && npm run build` |

## API
- All routes use the `/api` prefix.
- Health: `GET /health` or `GET /api/health`.
- API docs: `GET /api/docs`.
- Auth: customer phone OTP and admin email/password.
- Dev OTP is returned as `dev_otp` by `/api/auth/otp/send`.

## Architecture
```text
backend/
  csm_backend/        Django project/settings/urls/celery
  accounts/           customers, staff roles, OTP, addresses
  catalog/            categories, products, variants, images, facets
  inventory/          stock ledger and admin inventory
  cart/               cart and wishlist
  orders/             checkout, order status, returns
  payments/           Razorpay/COD payment flow
  shipping/           shipment and tracking helpers
  loyalty/            points and rewards
  reviews/            product reviews
  notifications/      notification logs
  analytics/          dashboard/report APIs
  ai/                 non-critical AI helpers
frontend/
  src/pages/          customer and admin screens
  src/features/       feature-level UI
  src/ui/             shared UI primitives
  src/styles/         tokens/base/layout/product/commerce/admin CSS
```

## Core Accounts
- Admin: `admin@csmsilks.com` / `admin123`
- Customer OTP phone: `+918888888888`

## Production Notes
- Replace default secrets before deployment.
- Configure production PostgreSQL, Redis, Razorpay, courier, WhatsApp/SMS/email credentials.
- Do not commit local SQLite DBs, screenshots, logs, or `.env`.
