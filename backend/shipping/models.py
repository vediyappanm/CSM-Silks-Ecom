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
        RTO_INITIATED = "rto_initiated", "RTO initiated"
        RTO_DELIVERED = "rto_delivered", "RTO delivered"

    order = models.OneToOneField(Order, related_name="shipment", on_delete=models.CASCADE)
    provider = models.CharField(max_length=60, default="manual")
    awb_number = models.CharField(max_length=100, blank=True)
    tracking_url = models.URLField(blank=True)
    label_url = models.URLField(blank=True)
    manifest_url = models.URLField(blank=True)
    shipping_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    rto_reason = models.CharField(max_length=160, blank=True)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.CREATED)
    raw_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class ShipmentEvent(models.Model):
    class Status(models.TextChoices):
        ORDER_PLACED = "order_placed", "Order placed"
        PAYMENT_PENDING = "payment_pending", "Payment pending"
        CONFIRMED = "confirmed", "Confirmed"
        QUALITY_CHECK = "quality_check", "Quality check"
        PACKED = "packed", "Packed"
        PICKED_UP = "picked_up", "Picked up"
        IN_TRANSIT = "in_transit", "In transit"
        ARRIVED_AT_HUB = "arrived_at_hub", "Arrived at hub"
        OUT_FOR_DELIVERY = "out_for_delivery", "Out for delivery"
        DELIVERED = "delivered", "Delivered"
        DELIVERY_ATTEMPTED = "delivery_attempted", "Delivery attempted"
        DELAYED = "delayed", "Delayed"
        RTO_INITIATED = "rto_initiated", "RTO initiated"
        RTO_DELIVERED = "rto_delivered", "RTO delivered"
        CANCELLED = "cancelled", "Cancelled"
        RETURN_REQUESTED = "return_requested", "Return requested"
        RETURNED = "returned", "Returned"
        REFUNDED = "refunded", "Refunded"

    order = models.ForeignKey(Order, related_name="tracking_events", on_delete=models.CASCADE)
    shipment = models.ForeignKey(Shipment, related_name="events", null=True, blank=True, on_delete=models.CASCADE)
    status = models.CharField(max_length=40, choices=Status.choices)
    title = models.CharField(max_length=120)
    description = models.CharField(max_length=255, blank=True)
    location = models.CharField(max_length=120, blank=True)
    happened_at = models.DateTimeField()
    raw_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["happened_at", "id"]

    def __str__(self) -> str:
        return f"{self.order.order_number} - {self.status}"
