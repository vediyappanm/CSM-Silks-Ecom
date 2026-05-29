from django.db import models

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
