"""CSM Silks — Settings (env-based config)."""
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ── APP ─────────────────────────────────────────────
    APP_NAME: str = "CSM Silks API"
    APP_VERSION: str = "3.1.0"
    APP_ENV: str = "development"
    DEBUG: bool = True
    BASE_URL: str = "http://localhost:8000"
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8080",
        "https://csmsilks.com",
        "https://www.csmsilks.com",
        "https://admin.csmsilks.com",
    ]

    # ── DATABASE ────────────────────────────────────────
    DATABASE_URL: str = "sqlite+aiosqlite:///./csm_silks.db"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    # ── REDIS ───────────────────────────────────────────
    REDIS_URL: str = ""

    # ── JWT ─────────────────────────────────────────────
    SECRET_KEY: str = "change-me-in-production-min-32-chars!!"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60  # 1 hour
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── AI / ANTHROPIC ──────────────────────────────────
    ANTHROPIC_API_KEY: str = ""
    AI_PRIMARY_MODEL: str = "claude-sonnet-4-20250514"
    AI_FAST_MODEL: str = "claude-haiku-4-5-20251001"

    # ── RAZORPAY ────────────────────────────────────────
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""

    # ── WHATSAPP ────────────────────────────────────────
    WHATSAPP_API_KEY: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""

    # ── AWS S3 ─────────────────────────────────────────
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "ap-south-1"
    S3_BUCKET: str = "csm-silks-assets"
    CLOUDFRONT_URL: str = ""

    # ── SMTP ────────────────────────────────────────────
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_TLS: bool = True
    FROM_EMAIL: str = "noreply@csmsilks.com"
    FROM_NAME: str = "CSM Silks"
    ADMIN_EMAIL: str = "admin@csmsilks.com"

    # ── SHIPROCKET ──────────────────────────────────────
    SHIPROCKET_EMAIL: str = ""
    SHIPROCKET_PASSWORD: str = ""

    # ── BUSINESS ────────────────────────────────────────
    GST_RATE: float = 0.05
    HSN_CODE: str = "5007"
    UNSOLD_ALERT_DAYS: int = 20
    LOYALTY_POINTS_PER_RUPEE: float = 0.05
    FREE_SHIPPING_THRESHOLD: float = 999.0
    PLATFORM: str = "BuildVerse"

    # ── RATE LIMITING ───────────────────────────────────
    OTP_RATE_LIMIT: int = 3  # per phone per hour
    API_RATE_LIMIT: int = 100  # per minute


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
