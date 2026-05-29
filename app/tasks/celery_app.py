"""app/tasks/celery_app.py — Celery + APScheduler configuration"""
from celery import Celery
from celery.schedules import crontab
from app.config import settings

_broker = settings.CELERY_BROKER_URL or settings.REDIS_URL or "redis://localhost:6379/0"
_backend = settings.CELERY_RESULT_BACKEND or settings.REDIS_URL or "redis://localhost:6379/0"

celery_app = Celery(
    "csm_silks",
    broker=_broker,
    backend=_backend,
    include=["app.tasks.daily_report", "app.tasks.unsold_alert"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Kolkata",
    enable_utc=True,
    beat_schedule={
        "daily-report": {
            "task": "app.tasks.daily_report.generate_daily_report",
            "schedule": crontab(hour=9, minute=0),
        },
        "unsold-alert": {
            "task": "app.tasks.unsold_alert.check_unsold_products",
            "schedule": crontab(hour="*/6", minute=0),
        },
    },
)
