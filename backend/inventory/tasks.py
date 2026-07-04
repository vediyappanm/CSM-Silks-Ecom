from __future__ import annotations

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from .models import StockLedger, StockReservation


@transaction.atomic
def release_expired_stock_reservations(now=None) -> dict:
    now = now or timezone.now()
    reservations = (
        StockReservation.objects.select_for_update()
        .select_related("variant", "variant__product")
        .filter(released_at__isnull=True, expires_at__lt=now)
        .order_by("id")
    )
    released_count = 0
    released_units = 0
    order_numbers: set[str] = set()

    for reservation in reservations:
        variant = reservation.variant
        variant.reserved_qty = max(0, variant.reserved_qty - reservation.quantity)
        variant.save(update_fields=["reserved_qty", "updated_at"])
        reservation.released_at = now
        reservation.save(update_fields=["released_at"])
        StockLedger.objects.create(
            variant=variant,
            quantity_delta=reservation.quantity,
            reason=StockLedger.Reason.RELEASE,
            reference=reservation.order_number,
            note="Expired unpaid checkout reservation released automatically.",
        )
        from catalog.realtime import publish_product_update

        publish_product_update(variant.product, event_type="inventory.variant.updated", variant=variant, source="inventory.reservation_expired")
        released_count += 1
        released_units += reservation.quantity
        if reservation.order_number:
            order_numbers.add(reservation.order_number)

    if order_numbers:
        from orders.models import Order
        from orders.services import cancel_order

        expired_orders = (
            Order.objects.select_for_update()
            .filter(order_number__in=order_numbers, status=Order.Status.PAYMENT_PENDING)
            .order_by("id")
        )
        for order in expired_orders:
            cancel_order(order, note="Payment window expired.")

    return {"reservations": released_count, "units": released_units, "orders": len(order_numbers)}


@shared_task(name="inventory.release_expired_stock_reservations")
def release_expired_stock_reservations_task() -> dict:
    return release_expired_stock_reservations()
