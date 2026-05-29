# CSM Silks E-Commerce — Agent Guide

## Stack
- **Backend**: Python 3.12+ · FastAPI · SQLAlchemy 2.0 (async) · PostgreSQL (prod) / SQLite (dev)
- **Frontend**: React 19 · TypeScript 6 · Vite 8 · React Router 7
- **Queue**: Celery + Redis + APScheduler
- **Infra**: Docker Compose (Nginx + api + celery_worker + celery_beat + PostgreSQL + Redis)

## Quick Start
```bash
python seed.py              # Creates tables + 14 products + admin/customer users
uvicorn app.main:app --reload  # Dev server on :8000
cd frontend && npm run dev     # Vite on :5173, proxies /api -> :8001
```

## Commands
| Action | Command |
|--------|---------|
| Seed DB | `python seed.py` |
| Alembic migration | `alembic revision --autogenerate -m "msg"` |
| Alembic upgrade | `alembic upgrade head` |
| Run tests | `pytest` (requires PostgreSQL running) |
| Docker up (dev) | `docker compose up` |
| Docker up (prod) | `docker compose -f docker-compose.prod.yml up` |
| Frontend lint | `cd frontend && npm run lint` |
| Frontend build | `cd frontend && npm run build` |

## API
- All routes at **`/api`** prefix. Health at `GET /health` or `GET /api/health`.
- Auth: OTP-based. In dev, OTP returned as `dev_otp`. Stored in-memory dict.
- Endpoints: `/api/auth/otp/send`, `/api/auth/otp/verify`, `/api/auth/refresh`, `/api/auth/me`
- Swagger at `/docs` (only when `DEBUG=True`).

## Architecture
```
app/
├── main.py          # FastAPI app, lifespan (creates tables), middleware, routers
├── config.py        # pydantic-settings (.env); defaults to SQLite
├── database.py      # Async engine + session factory + get_db
├── models/          # 12+ SQLAlchemy ORM models (5 are re-export stubs from tryon.py)
├── routers/         # 9 routers: auth, products, cart, orders, payments, admin, ai, invoices, loyalty
├── schemas/         # Pydantic request/response (21 schemas)
├── services/        # order_service (GST, loyalty, cart->order), ai_service (Claude)
├── tasks/           # Celery: daily_report, unsold_alert
└── utils/           # auth (JWT + bcrypt), razorpay, whatsapp
frontend/
└── src/
    ├── App.tsx      # React Router: 14 routes
    ├── pages/       # 14 pages (all complete)
    ├── components/  # Navbar, Footer, ProductCard, Ticker, FloatingButtons
    ├── store/       # React Context (AppContext: cart, wishlist, toast)
    └── lib/         # api.ts (all endpoints), data.ts (mock data)
```

## Notable Config
- Default DB: `sqlite+aiosqlite:///./csm_silks.db` — override via `DATABASE_URL` env
- GST: 5% (CGST 2.5% + SGST 2.5%, HSN 5007) — see order_service.py:18
- Free shipping: ≥₹999 (config.py)
- Loyalty: 5 points / ₹100 spent (config.py)
- Rate limiting: prod-only, 100 req/min per IP (main.py)
- Logging: level from `LOG_LEVEL` env (default INFO)

## Secrets / Auth
- `SECRET_KEY`: default is `change-me-in-production-min-32-chars!!` — **change before prod**
- `hash_password` uses **bcrypt directly** (not passlib — bcrypt 5.x broke passlib compat)
- Admin: `admin@csmsilks.com` / `admin123` (SUPER_ADMIN)
- Customer: `customer@example.com` / `customer123` (CUSTOMER)

## Testing
- **Tests require PostgreSQL**: conftest.py hardcodes `postgresql+asyncpg://csm:csm_secret@localhost:5432/csm_silks_test`
- `asyncio_mode = auto`, coverage `--cov=app --cov-report=term-missing`
- Tests use `/api/` prefix (fixed; old `/api/v1/` was wrong)

## Production
- Docker Compose: `docker-compose.prod.yml` (adds Nginx reverse proxy)
- Nginx config: `nginx.conf` (SSL, security headers, API proxy, SPA fallback)
- CI/CD: `.github/workflows/ci.yml` (Python tests + frontend lint/build)
- `.env` template included with all configurable vars
- Rate limiting middleware active in prod (`APP_ENV != development`)
- Celery: uses `crontab` schedules (9 AM daily report, every 6h unsold alert)

## Known Issues (Resolved)
- ~~Celery `AttributeError`~~ — `CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND` now defined in config.py; falls back to `REDIS_URL`, then `redis://localhost:6379/0`
- ~~Test `/api/v1/` prefix mismatch~~ — all tests updated to `/api/`
- ~~Admin CSS broken~~ — `--bg`, `--bg2`, `--bg3`, `--border`, `--text*`, `--surface`, `--green/red/orange/blue` now in `:root`
- ~~Account.tsx full page reload~~ — uses `useNavigate()` now
- ~~WhatsApp admin notifications using email~~ — uses `ADMIN_PHONE` now
- ~~passlib+bcrypt crash~~ — replaced with direct `bcrypt` calls
- ~~Admin placeholder pages~~ — Customers, Reports, Try-On Stats, Unsold all populated with real data/tables
- ~~Loyalty redemption not wired~~ — `loyalty_points_to_use` from `OrderCreate` is now consumed during checkout
- ~~Daily report hardcoded top_product~~ — computed from `OrderItem` aggregation
