from django.conf import settings
from django.db import models
from django.utils import timezone

from catalog.models import Product, ProductVariant


class StockLedger(models.Model):
    class Reason(models.TextChoices):
        SEED = "seed", "Seed"
        ADJUSTMENT = "adjustment", "Adjustment"
        SALE = "sale", "Sale"
        RETURN = "return", "Return"
        RESERVATION = "reservation", "Reservation"
        RELEASE = "release", "Release"

    variant = models.ForeignKey(ProductVariant, related_name="stock_ledger", on_delete=models.CASCADE)
    quantity_delta = models.IntegerField()
    reason = models.CharField(max_length=20, choices=Reason.choices)
    reference = models.CharField(max_length=120, blank=True)
    note = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class StockReservation(models.Model):
    variant = models.ForeignKey(ProductVariant, related_name="reservations", on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    quantity = models.PositiveIntegerField()
    order_number = models.CharField(max_length=40, blank=True)
    expires_at = models.DateTimeField()
    released_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def is_active(self) -> bool:
        return self.released_at is None and self.expires_at > timezone.now()


class UnsoldAlert(models.Model):
    class Severity(models.TextChoices):
        WATCH = "watch", "Watch"
        WARNING = "warning", "Warning"
        CRITICAL = "critical", "Critical"

    product = models.ForeignKey(Product, related_name="unsold_alerts", on_delete=models.CASCADE)
    variant = models.ForeignKey(ProductVariant, related_name="unsold_alerts", null=True, blank=True, on_delete=models.CASCADE)
    days_unsold = models.PositiveIntegerField()
    stock_qty = models.PositiveIntegerField()
    capital_blocked = models.DecimalField(max_digits=12, decimal_places=2)
    severity = models.CharField(max_length=20, choices=Severity.choices)
    discount_applied = models.BooleanField(default=False)
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    alerted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-alerted_at"]
