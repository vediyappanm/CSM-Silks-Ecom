from django.db import models
from django.conf import settings

from catalog.models import Product


class DailyReport(models.Model):
    report_date = models.DateField(unique=True, db_index=True)
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_orders = models.PositiveIntegerField(default=0)
    delivered_orders = models.PositiveIntegerField(default=0)
    return_orders = models.PositiveIntegerField(default=0)
    return_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tryon_sessions = models.PositiveIntegerField(default=0)
    cart_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    whatsapp_sent = models.PositiveIntegerField(default=0)
    unsold_alerts = models.PositiveIntegerField(default=0)
    capital_blocked = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    top_product = models.ForeignKey(Product, null=True, blank=True, on_delete=models.SET_NULL)
    top_product_units = models.PositiveIntegerField(default=0)
    ai_summary = models.TextField(blank=True)
    email_sent = models.BooleanField(default=False)
    whatsapp_sent_flag = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)


class AdminAuditLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=80, db_index=True)
    entity_type = models.CharField(max_length=80, db_index=True)
    entity_id = models.CharField(max_length=80, blank=True, db_index=True)
    summary = models.CharField(max_length=255)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.action} - {self.entity_type}:{self.entity_id}"
