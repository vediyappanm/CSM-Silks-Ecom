from django.conf import settings
from django.db import models


class Notification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="notifications", on_delete=models.CASCADE)
    title = models.CharField(max_length=120)
    body = models.TextField()
    notification_type = models.CharField(max_length=40)
    data = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    push_sent = models.BooleanField(default=False)
    wa_sent = models.BooleanField(default=False)
    email_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class MessageTemplate(models.Model):
    key = models.CharField(max_length=80, unique=True)
    channel = models.CharField(max_length=20)
    subject = models.CharField(max_length=160, blank=True)
    body = models.TextField()
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
