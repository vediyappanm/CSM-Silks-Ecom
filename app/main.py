"""
CSM Silks API — FastAPI Application
Platform: BuildVerse SaaS v3.1
Backend: Python FastAPI + PostgreSQL + Redis + Claude AI
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import time

from app.config import settings
from app.database import engine, Base

# Routers
from app.routers.auth import router as auth_router
from app.routers.products import router as products_router
from app.routers.cart import router as cart_router
from app.routers.orders import router as orders_router
from app.routers.payments import router as payments_router
from app.routers.ai import router as ai_router
from app.routers.admin import router as admin_router
from app.routers.invoices import router as invoices_router
from app.routers.loyalty import router as loyalty_router


# ── LIFESPAN ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables (use Alembic in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown: dispose engine
    await engine.dispose()


# ── APP ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="CSM Silks API",
    description="Pure Handloom Silk Sarees · Kanchipuram · Est. 1987 — BuildVerse SaaS v3.1",
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)


# ── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if not settings.DEBUG:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["api.csmsilks.com", "*.csmsilks.com"])


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    t0 = time.time()
    response = await call_next(request)
    response.headers["X-Process-Time"] = str(round((time.time() - t0) * 1000, 2))
    response.headers["X-Platform"] = "BuildVerse"
    return response


# ── GLOBAL EXCEPTION HANDLER ─────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Internal server error", "detail": str(exc) if settings.DEBUG else None},
    )


# ── ROUTERS ───────────────────────────────────────────────────────────────────
API_PREFIX = "/api"

app.include_router(auth_router,     prefix=API_PREFIX)
app.include_router(products_router, prefix=API_PREFIX)
app.include_router(cart_router,     prefix=API_PREFIX)
app.include_router(orders_router,   prefix=API_PREFIX)
app.include_router(payments_router, prefix=API_PREFIX)
app.include_router(ai_router,       prefix=API_PREFIX)
app.include_router(admin_router,    prefix=API_PREFIX)
app.include_router(invoices_router, prefix=API_PREFIX)
app.include_router(loyalty_router,  prefix=API_PREFIX)


# ── HEALTH ────────────────────────────────────────────────────────────────────
@app.get("/api/health")
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "CSM Silks API",
        "version": settings.APP_VERSION,
        "platform": settings.PLATFORM,
        "env": settings.APP_ENV,
    }


@app.get("/")
async def root():
    return {
        "message": "CSM Silks API — Pure Handloom Silk · Kanchipuram · Est. 1987",
        "docs": "/docs",
        "version": settings.APP_VERSION,
    }
