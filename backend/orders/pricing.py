from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings


def money(value: Decimal | int | float | str) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_gst(subtotal: Decimal) -> tuple[Decimal, Decimal]:
    cgst = money(subtotal * Decimal(str(settings.CGST_RATE)))
    sgst = money(subtotal * Decimal(str(settings.SGST_RATE)))
    return cgst, sgst


def calculate_loyalty_points(order_total: Decimal) -> int:
    return int(order_total * Decimal(str(settings.LOYALTY_POINTS_PER_RUPEE)))


def calculate_coupon_discount(subtotal: Decimal, coupon_code: str = "") -> Decimal:
    code = coupon_code.upper().strip()
    if code in {"CSM10", "COMEBACK10"}:
        return money(subtotal * Decimal("0.10"))
    return Decimal("0.00")


def shipping_amount(subtotal: Decimal) -> Decimal:
    if subtotal >= Decimal(str(settings.FREE_SHIPPING_THRESHOLD)):
        return Decimal("0.00")
    return Decimal("99.00")
