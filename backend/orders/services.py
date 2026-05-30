from __future__ import annotations

import uuid
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from accounts.models import Address
from cart.models import Cart
from inventory.models import StockLedger, StockReservation
from loyalty.models import LoyaltyTransaction
from notifications.services import create_notification
from payments.models import Payment

from .models import Order, OrderItem
from .pricing import calculate_coupon_discount, calculate_gst, calculate_loyalty_points, shipping_amount


def generate_order_number() -> str:
    return f"CSM-{timezone.now():%Y%m%d}-{str(uuid.uuid4().int)[:5]}"


def address_snapshot(address: Address) -> dict:
    return {
        "full_name": address.full_name,
        "phone": address.phone,
        "address_line_1": address.address_line_1,
        "address_line_2": address.address_line_2,
        "city": address.city,
        "state": address.state,
        "pin_code": address.pin_code,
        "country": address.country,
    }


@transaction.atomic
def create_order_from_cart(user, address_id: int, coupon_code: str = "", loyalty_points_to_use: int = 0, payment_method: str = Order.PaymentMethod.COD) -> Order:
    cart = Cart.objects.select_for_update().prefetch_related("items__variant", "items__product").get(user=user)
    items = list(cart.items.select_related("product", "variant"))
    if not items:
        raise ValueError("Cart is empty")
    address = Address.objects.get(id=address_id, user=user)

    for item in items:
        variant = item.variant
        if variant.available_qty < item.quantity:
            raise ValueError(f"Insufficient stock for {variant.product.name}")

    subtotal = sum(item.variant.price * item.quantity for item in items)
    coupon_discount = calculate_coupon_discount(subtotal, coupon_code or cart.coupon_code)
    loyalty_discount = Decimal(min(loyalty_points_to_use or 0, user.loyalty_points, int(subtotal - coupon_discount)))
    taxable = subtotal - coupon_discount - loyalty_discount
    cgst, sgst = calculate_gst(taxable)
    shipping = shipping_amount(taxable)
    total = taxable + cgst + sgst + shipping
    points_earned = calculate_loyalty_points(total)
    status = Order.Status.CONFIRMED if payment_method == Order.PaymentMethod.COD else Order.Status.PAYMENT_PENDING

    order = Order.objects.create(
        order_number=generate_order_number(),
        user=user,
        address=address,
        subtotal=subtotal,
        discount_amount=coupon_discount + loyalty_discount,
        coupon_code=coupon_code or cart.coupon_code,
        cgst_amount=cgst,
        sgst_amount=sgst,
        shipping_amount=shipping,
        total_amount=total,
        status=status,
        payment_method=payment_method,
        shipping_address_snapshot=address_snapshot(address),
        loyalty_points_earned=points_earned,
        loyalty_points_used=int(loyalty_discount),
        confirmed_at=timezone.now() if status == Order.Status.CONFIRMED else None,
    )

    for item in items:
        variant = item.variant
        OrderItem.objects.create(
            order=order,
            product=item.product,
            variant=variant,
            product_name=item.product.name,
            product_sku=variant.sku,
            variant_title=variant.title,
            unit_price=variant.price,
            quantity=item.quantity,
            subtotal=variant.price * item.quantity,
            selected_colour=variant.color_name,
        )
        if payment_method == Order.PaymentMethod.COD:
            variant.mark_sold(item.quantity)
            item.product.total_sold += item.quantity
            item.product.save(update_fields=["total_sold", "updated_at"])
            StockLedger.objects.create(variant=variant, quantity_delta=-item.quantity, reason=StockLedger.Reason.SALE, reference=order.order_number)
        else:
            variant.reserved_qty += item.quantity
            variant.save(update_fields=["reserved_qty", "updated_at"])
            StockReservation.objects.create(
                variant=variant,
                user=user,
                quantity=item.quantity,
                order_number=order.order_number,
                expires_at=timezone.now() + timedelta(minutes=20),
            )
            StockLedger.objects.create(variant=variant, quantity_delta=-item.quantity, reason=StockLedger.Reason.RESERVATION, reference=order.order_number)

    if loyalty_discount:
        user.loyalty_points -= int(loyalty_discount)
        LoyaltyTransaction.objects.create(
            user=user,
            order_id=order.id,
            transaction_type=LoyaltyTransaction.Type.REDEEM,
            points=-int(loyalty_discount),
            balance_after=user.loyalty_points,
            description=f"Points redeemed on {order.order_number}",
        )
    if status == Order.Status.CONFIRMED:
        user.loyalty_points += points_earned
        LoyaltyTransaction.objects.create(
            user=user,
            order_id=order.id,
            transaction_type=LoyaltyTransaction.Type.EARN,
            points=points_earned,
            balance_after=user.loyalty_points,
            description=f"Points earned from {order.order_number}",
        )
    user.save(update_fields=["loyalty_points"])

    Payment.objects.create(
        order=order,
        amount=total,
        method=Payment.Method.COD if payment_method == Order.PaymentMethod.COD else "",
        status=Payment.Status.CAPTURED if payment_method == Order.PaymentMethod.COD else Payment.Status.PENDING,
        paid_at=timezone.now() if payment_method == Order.PaymentMethod.COD else None,
    )
    create_notification(
        user=user,
        title="Order placed",
        body=f"Your CSM Silks order {order.order_number} has been placed.",
        notification_type="order",
        data={"order_id": order.id, "order_number": order.order_number},
    )
    from shipping.models import ShipmentEvent
    from shipping.services import record_tracking_event

    record_tracking_event(order, ShipmentEvent.Status.ORDER_PLACED)
    record_tracking_event(
        order,
        ShipmentEvent.Status.CONFIRMED if status == Order.Status.CONFIRMED else ShipmentEvent.Status.PAYMENT_PENDING,
    )
    cart.items.all().delete()
    cart.coupon_code = ""
    cart.save(update_fields=["coupon_code", "updated_at"])
    return order


@transaction.atomic
def confirm_paid_order(order: Order) -> Order:
    if order.status == Order.Status.CONFIRMED:
        return order
    reservations = StockReservation.objects.select_related("variant", "variant__product").filter(order_number=order.order_number, released_at__isnull=True)
    for reservation in reservations:
        variant = reservation.variant
        variant.reserved_qty = max(0, variant.reserved_qty - reservation.quantity)
        variant.stock_qty = max(0, variant.stock_qty - reservation.quantity)
        variant.last_sold_at = timezone.now()
        variant.save(update_fields=["reserved_qty", "stock_qty", "last_sold_at", "updated_at"])
        variant.product.total_sold += reservation.quantity
        variant.product.save(update_fields=["total_sold", "updated_at"])
        reservation.released_at = timezone.now()
        reservation.save(update_fields=["released_at"])
        StockLedger.objects.create(variant=variant, quantity_delta=-reservation.quantity, reason=StockLedger.Reason.SALE, reference=order.order_number)
    order.status = Order.Status.CONFIRMED
    order.confirmed_at = timezone.now()
    order.save(update_fields=["status", "confirmed_at", "updated_at"])
    from shipping.models import ShipmentEvent
    from shipping.services import record_tracking_event

    record_tracking_event(order, ShipmentEvent.Status.CONFIRMED, description="Payment captured and order confirmed.")
    user = order.user
    user.loyalty_points += order.loyalty_points_earned
    user.save(update_fields=["loyalty_points"])
    LoyaltyTransaction.objects.create(
        user=user,
        order_id=order.id,
        transaction_type=LoyaltyTransaction.Type.EARN,
        points=order.loyalty_points_earned,
        balance_after=user.loyalty_points,
        description=f"Points earned from {order.order_number}",
    )
    return order
