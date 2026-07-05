"""
Environment variable validation for production deployment.
Validates all required environment variables are set and properly configured.
"""
import os
from typing import List, Tuple

from django.conf import settings


def validate_environment() -> Tuple[bool, List[str]]:
    """
    Validate all required environment variables.
    Returns (is_valid, list_of_errors)
    """
    errors = []
    
    # Critical security variables
    if not settings.SECRET_KEY or settings.SECRET_KEY == "dev-secret-key-change-in-production-min-32-chars":
        if settings.IS_PRODUCTION:
            errors.append("SECRET_KEY must be set to a secure random value in production")
    
    if settings.DEBUG and settings.IS_PRODUCTION:
        errors.append("DEBUG cannot be True in production")
    
    # Database configuration
    if settings.IS_PRODUCTION:
        db_engine = settings.DATABASES["default"].get("ENGINE")
        if db_engine != "django.db.backends.postgresql":
            errors.append("Production must use PostgreSQL database")
    
    # CORS and CSRF
    if settings.IS_PRODUCTION:
        if not settings.CORS_ALLOWED_ORIGINS:
            errors.append("CORS_ALLOWED_ORIGINS must be configured in production")
        if not settings.CSRF_TRUSTED_ORIGINS:
            errors.append("CSRF_TRUSTED_ORIGINS must be configured in production")
    
    # Payment configuration
    if settings.IS_PRODUCTION:
        if not (settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET and settings.RAZORPAY_WEBHOOK_SECRET):
            errors.append("Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET) must be configured in production")
    
    # OTP configuration
    if settings.IS_PRODUCTION:
        if not (settings.SMS_OTP_ENABLED or settings.OTP_EMAIL_ENABLED):
            errors.append("At least one OTP delivery channel (SMS_OTP_ENABLED or OTP_EMAIL_ENABLED) must be enabled in production")
        if settings.OTP_DEV_FALLBACK_ENABLED:
            errors.append("OTP_DEV_FALLBACK_ENABLED must be False in production")
    
    # Notification configuration
    if settings.IS_PRODUCTION:
        if not (settings.NOTIFICATION_EMAIL_ENABLED or settings.WHATSAPP_ENABLED):
            errors.append("At least one notification channel (NOTIFICATION_EMAIL_ENABLED or WHATSAPP_ENABLED) must be enabled in production")
    
    # Redis configuration
    if settings.IS_PRODUCTION:
        if settings.CHANNEL_LAYER_BACKEND != "redis":
            errors.append("CHANNEL_LAYER_BACKEND must be 'redis' in production")
        if not settings.REDIS_URL.startswith(("redis://", "rediss://")):
            errors.append("REDIS_URL must be a valid Redis URL in production")
    
    # Development fallbacks
    if settings.IS_PRODUCTION:
        if settings.PAYMENT_DEV_FALLBACK_ENABLED:
            errors.append("PAYMENT_DEV_FALLBACK_ENABLED must be False in production")
    
    return len(errors) == 0, errors


def validate_on_startup():
    """Run environment validation on application startup."""
    is_valid, errors = validate_environment()
    if not is_valid:
        error_msg = "Environment validation failed:\n" + "\n".join(f"  - {error}" for error in errors)
        raise ValueError(error_msg)
