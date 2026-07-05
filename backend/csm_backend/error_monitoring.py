"""
Error monitoring integration for production.
Supports Sentry integration when configured.
"""
import logging
from typing import Any, Dict, Optional

from django.conf import settings

logger = logging.getLogger(__name__)


class ErrorMonitor:
    """Base error monitoring class with Sentry integration support."""
    
    def __init__(self):
        self._sentry_client = None
        self._init_sentry()
    
    def _init_sentry(self):
        """Initialize Sentry if configured."""
        sentry_dsn = getattr(settings, 'SENTRY_DSN', '')
        if sentry_dsn and settings.IS_PRODUCTION:
            try:
                import sentry_sdk
                from sentry_sdk.integrations.django import DjangoIntegration
                from sentry_sdk.integrations.celery import CeleryIntegration
                from sentry_sdk.integrations.logging import LoggingIntegration
                
                sentry_sdk.init(
                    dsn=sentry_dsn,
                    integrations=[
                        DjangoIntegration(),
                        CeleryIntegration(),
                        LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
                    ],
                    traces_sample_rate=getattr(settings, 'SENTRY_TRACES_SAMPLE_RATE', 0.1),
                    environment=settings.APP_ENV,
                    send_default_pii=False,
                )
                self._sentry_client = sentry_sdk
                logger.info("Sentry error monitoring initialized")
            except ImportError:
                logger.warning("sentry-sdk not installed, error monitoring disabled")
            except Exception as exc:
                logger.error("Failed to initialize Sentry: %s", exc)
    
    def capture_exception(self, exc: Exception, extra: Optional[Dict[str, Any]] = None):
        """Capture an exception for monitoring."""
        if self._sentry_client:
            self._sentry_client.capture_exception(exc, extra=extra or {})
        logger.error("Exception captured: %s", exc, exc_info=True, extra=extra or {})
    
    def capture_message(self, message: str, level: str = "info", extra: Optional[Dict[str, Any]] = None):
        """Capture a message for monitoring."""
        if self._sentry_client:
            self._sentry_client.capture_message(message, level=level, extra=extra or {})
        log_func = getattr(logger, level.lower(), logger.info)
        log_func(message, extra=extra or {})


# Global error monitor instance
error_monitor = ErrorMonitor()
