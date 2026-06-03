from django.conf import settings
from django.core.checks import Error, Tags, register


def _production_like() -> bool:
    return bool(not settings.DEBUG or str(settings.APP_ENV).lower() == "production")


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


@register(Tags.security, deploy=True)
def production_fallback_checks(app_configs, **kwargs):
    errors = []
    if not settings.DEBUG and settings.OTP_DEV_FALLBACK_ENABLED:
        errors.append(
            Error(
                "OTP_DEV_FALLBACK_ENABLED cannot be enabled when DEBUG=False.",
                hint="Disable OTP_DEV_FALLBACK_ENABLED and configure Twilio or Resend OTP delivery.",
                id="csm.E001",
            )
        )
    if not settings.DEBUG and settings.PAYMENT_DEV_FALLBACK_ENABLED:
        errors.append(
            Error(
                "PAYMENT_DEV_FALLBACK_ENABLED cannot be enabled when DEBUG=False.",
                hint="Disable PAYMENT_DEV_FALLBACK_ENABLED and configure Razorpay live/test credentials.",
                id="csm.E002",
            )
        )
    if not _production_like():
        return errors
    if settings.DATABASES["default"].get("ENGINE") != "django.db.backends.postgresql":
        errors.append(
            Error(
                "Production must use PostgreSQL, not SQLite or an in-memory database.",
                hint="Set DATABASE_URL to a postgres:// or postgresql:// URL before deployment.",
                id="csm.E003",
            )
        )
    redis_ready = (
        settings.CHANNEL_LAYER_BACKEND == "redis"
        and _redis_url_ready(settings.REDIS_URL)
        and _redis_url_ready(settings.CELERY_BROKER_URL)
    )
    if not redis_ready:
        errors.append(
            Error(
                "Production realtime and background jobs must use Redis.",
                hint="Set CHANNEL_LAYER_BACKEND=redis, REDIS_URL=redis://..., and CELERY_BROKER_URL=redis://...",
                id="csm.E004",
            )
        )
    if not (settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET and settings.RAZORPAY_WEBHOOK_SECRET):
        errors.append(
            Error(
                "Razorpay key id, key secret, and webhook secret are required in production.",
                hint="Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET.",
                id="csm.E005",
            )
        )
    if not (_twilio_ready() or _otp_email_ready()):
        errors.append(
            Error(
                "Production customer login requires at least one live OTP delivery channel.",
                hint="Configure Twilio SMS OTP or Resend email OTP with OTP_EMAIL_ENABLED=True.",
                id="csm.E006",
            )
        )
    if not (_notification_email_ready() or _whatsapp_ready()):
        errors.append(
            Error(
                "Production order updates require at least one customer notification channel.",
                hint="Enable Resend notification email or Gupshup WhatsApp notifications.",
                id="csm.E007",
            )
        )
    if str(settings.DEFAULT_COURIER_PROVIDER).lower() == "shiprocket" and not (
        settings.SHIPROCKET_EMAIL and settings.SHIPROCKET_PASSWORD and settings.SHIPROCKET_WEBHOOK_SECRET
    ):
        errors.append(
            Error(
                "Shiprocket production shipping requires credentials and webhook secret.",
                hint="Set SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD, and SHIPROCKET_WEBHOOK_SECRET or use DEFAULT_COURIER_PROVIDER=manual.",
                id="csm.E008",
            )
        )
    return errors
