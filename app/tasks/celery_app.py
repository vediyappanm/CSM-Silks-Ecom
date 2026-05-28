"""app/tasks/celery_app.py — Celery + APScheduler configuration"""
from celery import Celery
from app.config import settings

celery_app = Celery(
    "csm_silks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.daily_report", "app.tasks.unsold_alert"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Kolkata",
    enable_utc=True,
    beat_schedule={
        # Daily report: 9 AM IST every day
        "daily-report": {
            "task": "app.tasks.daily_report.generate_daily_report",
            "schedule": 32400.0,  # 9 * 3600 seconds from midnight
        },
        # Unsold alert: every 6 hours
        "unsold-alert": {
            "task": "app.tasks.unsold_alert.check_unsold_products",
            "schedule": 21600.0,  # 6 hours
        },
    },
)
