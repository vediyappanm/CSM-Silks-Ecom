from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from notifications.models import Notification
from orders.models import Order

from .models import Shipment, ShipmentEvent


EVENT_COPY = {
    ShipmentEvent.Status.ORDER_PLACED: ("Order placed", "Your order was created successfully."),
    ShipmentEvent.Status.PAYMENT_PENDING: ("Payment pending", "Payment is being completed before fulfillment."),
    ShipmentEvent.Status.CONFIRMED: ("Order confirmed", "Payment/order confirmation is complete."),
    ShipmentEvent.Status.QUALITY_CHECK: ("Quality check", "The textile is being inspected before packing."),
    ShipmentEvent.Status.PACKED: ("Packed", "Your order is packed and ready for courier handover."),
    ShipmentEvent.Status.PICKED_UP: ("Picked up", "Courier has picked up the package."),
    ShipmentEvent.Status.IN_TRANSIT: ("In transit", "The package is moving through the courier network."),
    ShipmentEvent.Status.ARRIVED_AT_HUB: ("Arrived at hub", "The package reached a courier hub near the destination."),
    ShipmentEvent.Status.OUT_FOR_DELIVERY: ("Out for delivery", "The package is with the delivery partner."),
    ShipmentEvent.Status.DELIVERED: ("Delivered", "The package has been delivered."),
    ShipmentEvent.Status.DELIVERY_ATTEMPTED: ("Delivery attempted", "Courier attempted delivery and will retry or contact you."),
    ShipmentEvent.Status.DELAYED: ("Delayed", "Courier reported a delay. We are watching this order."),
    ShipmentEvent.Status.CANCELLED: ("Order cancelled", "The order was cancelled."),
    ShipmentEvent.Status.RETURN_REQUESTED: ("Return requested", "A return request was raised for this order."),
    ShipmentEvent.Status.RETURNED: ("Returned", "The returned item was received."),
    ShipmentEvent.Status.REFUNDED: ("Refunded", "Refund has been recorded for this order."),
}

SHIPMENT_TO_ORDER_STATUS = {
    Shipment.Status.CREATED: Order.Status.PACKED,
    Shipment.Status.PICKED_UP: Order.Status.SHIPPED,
    Shipment.Status.IN_TRANSIT: Order.Status.SHIPPED,
    Shipment.Status.OUT_FOR_DELIVERY: Order.Status.OUT_FOR_DELIVERY,
    Shipment.Status.DELIVERED: Order.Status.DELIVERED,
}

SHIPMENT_TO_EVENT_STATUS = {
    Shipment.Status.CREATED: ShipmentEvent.Status.PACKED,
    Shipment.Status.PICKED_UP: ShipmentEvent.Status.PICKED_UP,
    Shipment.Status.IN_TRANSIT: ShipmentEvent.Status.IN_TRANSIT,
    Shipment.Status.OUT_FOR_DELIVERY: ShipmentEvent.Status.OUT_FOR_DELIVERY,
    Shipment.Status.DELIVERED: ShipmentEvent.Status.DELIVERED,
    Shipment.Status.FAILED: ShipmentEvent.Status.DELIVERY_ATTEMPTED,
}

ORDER_TO_EVENT_STATUS = {
    Order.Status.PENDING: ShipmentEvent.Status.ORDER_PLACED,
    Order.Status.PAYMENT_PENDING: ShipmentEvent.Status.PAYMENT_PENDING,
    Order.Status.CONFIRMED: ShipmentEvent.Status.CONFIRMED,
    Order.Status.QUALITY_CHECK: ShipmentEvent.Status.QUALITY_CHECK,
    Order.Status.PACKED: ShipmentEvent.Status.PACKED,
    Order.Status.SHIPPED: ShipmentEvent.Status.IN_TRANSIT,
    Order.Status.OUT_FOR_DELIVERY: ShipmentEvent.Status.OUT_FOR_DELIVERY,
    Order.Status.DELIVERED: ShipmentEvent.Status.DELIVERED,
    Order.Status.CANCELLED: ShipmentEvent.Status.CANCELLED,
    Order.Status.RETURN_INITIATED: ShipmentEvent.Status.RETURN_REQUESTED,
    Order.Status.RETURNED: ShipmentEvent.Status.RETURNED,
    Order.Status.REFUNDED: ShipmentEvent.Status.REFUNDED,
}


def record_tracking_event(
    order: Order,
    status: str,
    *,
    title: str = "",
    description: str = "",
    location: str = "",
    shipment: Shipment | None = None,
    raw_payload: dict | None = None,
    happened_at=None,
) -> ShipmentEvent:
    default_title, default_description = EVENT_COPY.get(status, (status.replace("_", " ").title(), "Order tracking updated."))
    return ShipmentEvent.objects.create(
        order=order,
        shipment=shipment,
        status=status,
        title=title or default_title,
        description=description or default_description,
        location=location,
        happened_at=happened_at or timezone.now(),
        raw_payload=raw_payload or {},
    )


def record_order_status_event(order: Order, *, status: str | None = None, note: str = "", location: str = "") -> ShipmentEvent:
    event_status = ORDER_TO_EVENT_STATUS.get(status or order.status, ShipmentEvent.Status.ORDER_PLACED)
    return record_tracking_event(order, event_status, description=note, location=location)


def apply_shipment_update(shipment: Shipment, *, event_location: str = "", event_note: str = "") -> Order:
    order = shipment.order
    order.courier_name = shipment.provider
    order.tracking_number = shipment.awb_number
    order.courier_url = shipment.tracking_url
    if not order.estimated_delivery and shipment.status != Shipment.Status.DELIVERED:
        order.estimated_delivery = timezone.now() + timedelta(days=4)

    next_order_status = SHIPMENT_TO_ORDER_STATUS.get(shipment.status)
    if next_order_status:
        order.status = next_order_status
    if shipment.status in {Shipment.Status.PICKED_UP, Shipment.Status.IN_TRANSIT}:
        order.shipped_at = order.shipped_at or timezone.now()
    if shipment.status == Shipment.Status.OUT_FOR_DELIVERY:
        order.shipped_at = order.shipped_at or timezone.now()
    if shipment.status == Shipment.Status.DELIVERED:
        order.delivered_at = order.delivered_at or timezone.now()
        order.estimated_delivery = order.estimated_delivery or order.delivered_at
    order.save()

    event_status = SHIPMENT_TO_EVENT_STATUS.get(shipment.status, ShipmentEvent.Status.IN_TRANSIT)
    default_title, default_description = EVENT_COPY.get(event_status, ("Shipment updated", "Order tracking updated."))
    description = event_note or default_description
    if shipment.awb_number and shipment.awb_number not in description:
        description = f"{description} AWB: {shipment.awb_number}."
    record_tracking_event(
        order,
        event_status,
        title=default_title,
        description=description,
        location=event_location,
        shipment=shipment,
        raw_payload={
            "provider": shipment.provider,
            "awb_number": shipment.awb_number,
            "tracking_url": shipment.tracking_url,
            **(shipment.raw_payload or {}),
        },
    )
    Notification.objects.create(
        user=order.user,
        title="Order tracking updated",
        body=f"{order.order_number} is now {order.status.replace('_', ' ')}.",
        notification_type="shipping",
        data={"order_id": order.id, "order_number": order.order_number, "tracking_number": order.tracking_number},
    )
    return order
