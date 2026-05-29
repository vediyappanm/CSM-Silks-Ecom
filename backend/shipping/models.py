from django.db import models

from orders.models import Order


class Shipment(models.Model):
    class Status(models.TextChoices):
        CREATED = "created", "Created"
        PICKED_UP = "picked_up", "Picked up"
        IN_TRANSIT = "in_transit", "In transit"
        OUT_FOR_DELIVERY = "out_for_delivery", "Out for delivery"
        DELIVERED = "delivered", "Delivered"
        FAILED = "failed", "Failed"

    order = models.OneToOneField(Order, related_name="shipment", on_delete=models.CASCADE)
    provider = models.CharField(max_length=60, default="manual")
    awb_number = models.CharField(max_length=100, blank=True)
    tracking_url = models.URLField(blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.CREATED)
    raw_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
