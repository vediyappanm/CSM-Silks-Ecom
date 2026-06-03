from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlparse

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent

try:
    from dotenv import load_dotenv

    load_dotenv(PROJECT_ROOT / ".env")
except ImportError:
    pass


TRUE_VALUES = {"1", "true", "yes", "on"}


def env_bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).lower() in TRUE_VALUES


def env_list(name: str, default: str = "") -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production-min-32-chars!!")
DEBUG = env_bool("DEBUG", True)
APP_ENV = os.getenv("APP_ENV", "development")

ALLOWED_HOSTS = env_list("ALLOWED_HOSTS", "*")

INSTALLED_APPS = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "django_filters",
    "rest_framework",
    "drf_spectacular",
    "channels",
    "accounts",
    "catalog",
    "inventory",
    "cart",
    "orders",
    "payments",
    "shipping",
    "loyalty",
    "reviews",
    "notifications",
    "analytics",
    "ai",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "csm_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "csm_backend.wsgi.application"
ASGI_APPLICATION = "csm_backend.asgi.application"


def database_config() -> dict:
    url = os.getenv("DATABASE_URL", f"sqlite:///{PROJECT_ROOT / 'csm_silks_django.db'}")
    parsed = urlparse(url)
    if parsed.scheme in {"postgres", "postgresql"}:
        return {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": parsed.path.lstrip("/"),
            "USER": parsed.username or "",
            "PASSWORD": parsed.password or "",
            "HOST": parsed.hostname or "localhost",
            "PORT": str(parsed.port or 5432),
        }
    if parsed.scheme in {"postgresql+asyncpg", "postgres+asyncpg"}:
        return {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": parsed.path.lstrip("/"),
            "USER": parsed.username or "",
            "PASSWORD": parsed.password or "",
            "HOST": parsed.hostname or "localhost",
            "PORT": str(parsed.port or 5432),
        }
    return {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": str(PROJECT_ROOT / "csm_silks_django.db"),
    }


DATABASES = {"default": database_config()}

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
APPEND_SLASH = False

CORS_ALLOWED_ORIGINS = env_list(
    "ALLOWED_ORIGINS",
    os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://localhost:8080",
    ),
)
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS", ",".join(CORS_ALLOWED_ORIGINS if not DEBUG else []))

SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", not DEBUG)
SESSION_COOKIE_SECURE = env_bool("SESSION_COOKIE_SECURE", not DEBUG)
CSRF_COOKIE_SECURE = env_bool("CSRF_COOKIE_SECURE", not DEBUG)
SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000" if not DEBUG else "0"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", not DEBUG)
SECURE_HSTS_PRELOAD = env_bool("SECURE_HSTS_PRELOAD", not DEBUG)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https") if env_bool("USE_X_FORWARDED_PROTO", not DEBUG) else None

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.AllowAny",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ),
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": os.getenv("DRF_ANON_THROTTLE", "500/hour"),
        "user": os.getenv("DRF_USER_THROTTLE", "5000/hour"),
        "otp": os.getenv("DRF_OTP_THROTTLE", "5/minute"),
        "admin_login": os.getenv("DRF_ADMIN_LOGIN_THROTTLE", "10/minute"),
        "tracking": os.getenv("DRF_TRACKING_THROTTLE", "5/minute"),
        "courier_webhook": os.getenv("DRF_COURIER_WEBHOOK_THROTTLE", "120/minute"),
    },
    "DEFAULT_SCHEMA_CLASS": "csm_backend.schema.CSMAutoSchema",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))),
    "AUTH_HEADER_TYPES": ("Bearer",),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "CSM Silks Retailer API",
    "DESCRIPTION": "Django/DRF API for the CSM Silks textile ecommerce platform.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

GST_RATE = float(os.getenv("GST_RATE", "0.05"))
CGST_RATE = GST_RATE / 2
SGST_RATE = GST_RATE / 2
HSN_CODE = os.getenv("HSN_CODE", "5007")
STORE_CONTACT_EMAIL = os.getenv("STORE_CONTACT_EMAIL", "orders@csmsilks.com")
FREE_SHIPPING_THRESHOLD = float(os.getenv("FREE_SHIPPING_THRESHOLD", "999"))
LOYALTY_POINTS_PER_RUPEE = float(os.getenv("LOYALTY_POINTS_PER_RUPEE", "0.05"))
UNSOLD_ALERT_DAYS = int(os.getenv("UNSOLD_ALERT_DAYS", "20"))

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL") or REDIS_URL
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND") or REDIS_URL
CHANNEL_LAYER_BACKEND = os.getenv("CHANNEL_LAYER_BACKEND", "redis" if not DEBUG else "memory").lower()
if CHANNEL_LAYER_BACKEND == "redis":
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {"hosts": [REDIS_URL]},
        }
    }
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }
CELERY_BEAT_SCHEDULE = {
    "release-expired-stock-reservations": {
        "task": "inventory.release_expired_stock_reservations",
        "schedule": 300.0,
    }
}

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
PAYMENT_DEV_FALLBACK_ENABLED = os.getenv("PAYMENT_DEV_FALLBACK_ENABLED", "False").lower() in {"1", "true", "yes", "on"}

SHIPROCKET_EMAIL = os.getenv("SHIPROCKET_EMAIL", "")
SHIPROCKET_PASSWORD = os.getenv("SHIPROCKET_PASSWORD", "")
SHIPROCKET_BASE_URL = os.getenv("SHIPROCKET_BASE_URL", "https://apiv2.shiprocket.in/v1/external")
SHIPROCKET_WEBHOOK_SECRET = os.getenv("SHIPROCKET_WEBHOOK_SECRET", "")
SHIPROCKET_PICKUP_LOCATION = os.getenv("SHIPROCKET_PICKUP_LOCATION", "Primary")
SHIPROCKET_PACKAGE_LENGTH_CM = float(os.getenv("SHIPROCKET_PACKAGE_LENGTH_CM", "32"))
SHIPROCKET_PACKAGE_BREADTH_CM = float(os.getenv("SHIPROCKET_PACKAGE_BREADTH_CM", "24"))
SHIPROCKET_PACKAGE_HEIGHT_CM = float(os.getenv("SHIPROCKET_PACKAGE_HEIGHT_CM", "5"))
SHIPROCKET_PACKAGE_WEIGHT_KG = float(os.getenv("SHIPROCKET_PACKAGE_WEIGHT_KG", "0.5"))
DEFAULT_COURIER_PROVIDER = os.getenv("DEFAULT_COURIER_PROVIDER", "manual")

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")
NOTIFICATION_EMAIL_ENABLED = os.getenv("NOTIFICATION_EMAIL_ENABLED", "False").lower() in {"1", "true", "yes", "on"}
OTP_EMAIL_ENABLED = os.getenv("OTP_EMAIL_ENABLED", str(NOTIFICATION_EMAIL_ENABLED)).lower() in {"1", "true", "yes", "on"}

SMS_OTP_ENABLED = os.getenv("SMS_OTP_ENABLED", "False").lower() in {"1", "true", "yes", "on"}
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_API_KEY_SID = os.getenv("TWILIO_API_KEY_SID", "")
TWILIO_API_KEY_SECRET = os.getenv("TWILIO_API_KEY_SECRET", "")
TWILIO_FROM_PHONE = os.getenv("TWILIO_FROM_PHONE", "")
TWILIO_MESSAGING_SERVICE_SID = os.getenv("TWILIO_MESSAGING_SERVICE_SID", "")

WHATSAPP_ENABLED = os.getenv("WHATSAPP_ENABLED", "False").lower() in {"1", "true", "yes", "on"}
GUPSHUP_API_KEY = os.getenv("GUPSHUP_API_KEY", "")
GUPSHUP_SOURCE_PHONE = os.getenv("GUPSHUP_SOURCE_PHONE", "")
GUPSHUP_APP_NAME = os.getenv("GUPSHUP_APP_NAME", "")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022")

OTP_TTL_MINUTES = int(os.getenv("OTP_TTL_MINUTES", "5"))
OTP_RATE_LIMIT = int(os.getenv("OTP_RATE_LIMIT", "3"))
OTP_DEV_FALLBACK_ENABLED = os.getenv("OTP_DEV_FALLBACK_ENABLED", "False").lower() in {"1", "true", "yes", "on"}
