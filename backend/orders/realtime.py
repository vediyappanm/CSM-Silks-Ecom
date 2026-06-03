from __future__ import annotations

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone

from .models import Order


def user_orders_group(user_id: int) -> str:
    return f"orders_user_{user_id}"


def order_group(order_id: int) -> str:
    return f"orders_order_{order_id}"


ADMIN_ORDERS_GROUP = "orders_admin"


def serialize_order(order: Order) -> dict:
    from .serializers import OrderSerializer

    fresh = Order.objects.select_related("user", "address", "payment").prefetch_related(
        "items__product__category",
        "items__product__variants",
        "items__product__images",
        "items__variant",
        "tracking_events",
    ).get(id=order.id)
    return dict(OrderSerializer(fresh).data)


def serialize_tracking_event(event) -> dict | None:
    if not event:
        return None
    from shipping.serializers import ShipmentEventSerializer

    return dict(ShipmentEventSerializer(event).data)


def publish_order_update(order: Order, *, event=None, source: str = "order") -> None:
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    payload = {
        "type": "order.update",
        "source": source,
        "order": serialize_order(order),
        "event": serialize_tracking_event(event),
        "timestamp": timezone.now().isoformat(),
    }
    message = {"type": "order.event", "payload": payload}
    groups = {
        order_group(order.id),
        user_orders_group(order.user_id),
        ADMIN_ORDERS_GROUP,
    }
    for group in groups:
        async_to_sync(channel_layer.group_send)(group, message)
