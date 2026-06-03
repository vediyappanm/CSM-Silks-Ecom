import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "csm_backend.settings")

app = Celery("csm_backend")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.beat_schedule = {
    "release-expired-stock-reservations": {
        "task": "inventory.release_expired_stock_reservations",
        "schedule": crontab(minute="*/5"),  # every 5 minutes
    },
}
