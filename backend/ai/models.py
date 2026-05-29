from django.conf import settings
from django.db import models

from catalog.models import Product


class TryOnSession(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="try_on_sessions", null=True, blank=True, on_delete=models.SET_NULL)
    product = models.ForeignKey(Product, related_name="try_on_sessions", null=True, blank=True, on_delete=models.SET_NULL)
    skin_tone = models.CharField(max_length=20)
    body_type = models.CharField(max_length=20)
    drape_style = models.CharField(max_length=50)
    occasion = models.CharField(max_length=80, blank=True)
    ai_result = models.JSONField(default=dict, blank=True)
    confidence_score = models.PositiveSmallIntegerField(default=0)
    added_to_cart = models.BooleanField(default=False)
    converted_to_order = models.BooleanField(default=False)
    model_used = models.CharField(max_length=80, default="rules-v1")
    tokens_used = models.PositiveIntegerField(default=0)
    latency_ms = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
