from __future__ import annotations

import os


def init_sentry() -> None:
    dsn = os.getenv("SENTRY_DSN", "")
    if not dsn:
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.celery import CeleryIntegration
        from sentry_sdk.integrations.django import DjangoIntegration
        from sentry_sdk.integrations.redis import RedisIntegration
    except ImportError:
        return

    sample_rate = float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.1"))
    environment = os.getenv("APP_ENV", "development")

    sentry_sdk.init(
        dsn=dsn,
        environment=environment,
        traces_sample_rate=sample_rate,
        send_default_pii=False,
        integrations=[
            DjangoIntegration(transaction_style="url"),
            CeleryIntegration(monitor_beat_tasks=True),
            RedisIntegration(),
        ],
        before_send=_scrub_sensitive,
    )


def _scrub_sensitive(event: dict, hint: object) -> dict:
    """Remove OTP values, tokens, and payment credentials from Sentry payloads."""
    sensitive_keys = {
        "otp", "otp_hash", "password", "access_token", "refresh_token",
        "razorpay_signature", "razorpay_key_secret", "authorization",
        "card_number", "cvv",
    }
    request = event.get("request", {})
    data = request.get("data", {})
    if isinstance(data, dict):
        for key in sensitive_keys:
            if key in data:
                data[key] = "[Filtered]"
    return event
