from __future__ import annotations

from django.conf import settings
from django.db import connection
from django.http import JsonResponse


def _redis_url_ready(value: str) -> bool:
    return str(value or "").startswith(("redis://", "rediss://"))


def _twilio_ready() -> bool:
    has_auth = bool(
        (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN)
        or (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_API_KEY_SID and settings.TWILIO_API_KEY_SECRET)
    )
    has_sender = bool(settings.TWILIO_FROM_PHONE or settings.TWILIO_MESSAGING_SERVICE_SID)
    return bool(settings.SMS_OTP_ENABLED and has_auth and has_sender)


def _otp_email_ready() -> bool:
    return bool(settings.OTP_EMAIL_ENABLED and settings.RESEND_API_KEY and settings.RESEND_FROM_EMAIL)


def _notification_email_ready() -> bool:
    return bool(settings.NOTIFICATION_EMAIL_ENABLED and settings.RESEND_API_KEY and settings.RESEND_FROM_EMAIL)


def _whatsapp_ready() -> bool:
    return bool(settings.WHATSAPP_ENABLED and settings.GUPSHUP_API_KEY and settings.GUPSHUP_SOURCE_PHONE and settings.GUPSHUP_APP_NAME)


def _shiprocket_ready() -> bool:
    return bool(settings.SHIPROCKET_EMAIL and settings.SHIPROCKET_PASSWORD and settings.SHIPROCKET_WEBHOOK_SECRET)


def _check_database() -> dict:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:
        return {"ok": False, "detail": "Database connection failed"}
    return {"ok": True, "detail": "Database connection is available"}


def readiness(_request):
    realtime_ok = settings.CHANNEL_LAYER_BACKEND == "redis" and _redis_url_ready(settings.REDIS_URL)
    celery_ok = _redis_url_ready(settings.CELERY_BROKER_URL)
    payments_ok = bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET and settings.RAZORPAY_WEBHOOK_SECRET)
    otp_channels = [channel for channel, ready in (("twilio_sms", _twilio_ready()), ("resend_email", _otp_email_ready())) if ready]
    notification_channels = [
        channel
        for channel, ready in (("resend_email", _notification_email_ready()), ("gupshup_whatsapp", _whatsapp_ready()))
        if ready
    ]
    courier_provider = str(settings.DEFAULT_COURIER_PROVIDER or "manual").lower()
    shipping_ok = courier_provider != "shiprocket" or _shiprocket_ready()
    fallbacks_ok = not settings.OTP_DEV_FALLBACK_ENABLED and not settings.PAYMENT_DEV_FALLBACK_ENABLED

    checks = {
        "database": _check_database(),
        "realtime": {
            "ok": realtime_ok,
            "detail": "Redis channel layer configured" if realtime_ok else "Redis channel layer is not configured",
        },
        "celery": {
            "ok": celery_ok,
            "detail": "Redis Celery broker configured" if celery_ok else "Redis Celery broker is not configured",
        },
        "payments": {
            "ok": payments_ok,
            "detail": "Razorpay credentials and webhook secret configured" if payments_ok else "Razorpay credentials or webhook secret missing",
        },
        "otp": {
            "ok": bool(otp_channels),
            "detail": "Live OTP channel configured" if otp_channels else "No live OTP delivery channel configured",
            "channels": otp_channels,
        },
        "notifications": {
            "ok": bool(notification_channels),
            "detail": "Customer notification channel configured" if notification_channels else "No customer notification channel configured",
            "channels": notification_channels,
        },
        "shipping": {
            "ok": shipping_ok,
            "detail": "Manual courier workflow enabled" if courier_provider != "shiprocket" else "Shiprocket credentials configured",
            "provider": courier_provider,
        },
        "development_fallbacks": {
            "ok": fallbacks_ok,
            "detail": "Development fallbacks disabled" if fallbacks_ok else "Development fallbacks are enabled",
        },
    }
    ready = all(check["ok"] for check in checks.values())
    return JsonResponse(
        {
            "status": "ready" if ready else "degraded",
            "service": "CSM Silks Django API",
            "env": settings.APP_ENV,
            "checks": checks,
        },
        status=200 if ready else 503,
    )
