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

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production-min-32-chars!!")
DEBUG = os.getenv("DEBUG", "True").lower() in {"1", "true", "yes", "on"}
APP_ENV = os.getenv("APP_ENV", "development")

ALLOWED_HOSTS = [h.strip() for h in os.getenv("ALLOWED_HOSTS", "*").split(",") if h.strip()]

INSTALLED_APPS = [
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

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        os.getenv(
            "CORS_ALLOWED_ORIGINS",
            "http://localhost:5173,http://localhost:3000,http://localhost:8080",
        ),
    ).split(",")
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = True

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
        "tracking": os.getenv("DRF_TRACKING_THROTTLE", "30/minute"),
        "courier_webhook": os.getenv("DRF_COURIER_WEBHOOK_THROTTLE", "120/minute"),
    },
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
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
FREE_SHIPPING_THRESHOLD = float(os.getenv("FREE_SHIPPING_THRESHOLD", "999"))
LOYALTY_POINTS_PER_RUPEE = float(os.getenv("LOYALTY_POINTS_PER_RUPEE", "0.05"))
UNSOLD_ALERT_DAYS = int(os.getenv("UNSOLD_ALERT_DAYS", "20"))

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL") or REDIS_URL
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND") or REDIS_URL

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

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

SMS_OTP_ENABLED = os.getenv("SMS_OTP_ENABLED", "False").lower() in {"1", "true", "yes", "on"}
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_API_KEY_SID = os.getenv("TWILIO_API_KEY_SID", "")
TWILIO_API_KEY_SECRET = os.getenv("TWILIO_API_KEY_SECRET", "")
TWILIO_FROM_PHONE = os.getenv("TWILIO_FROM_PHONE", "")
TWILIO_MESSAGING_SERVICE_SID = os.getenv("TWILIO_MESSAGING_SERVICE_SID", "")

OTP_TTL_MINUTES = int(os.getenv("OTP_TTL_MINUTES", "5"))
OTP_RATE_LIMIT = int(os.getenv("OTP_RATE_LIMIT", "3"))
