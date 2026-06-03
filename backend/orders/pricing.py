from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db.models import F, Q
from django.utils import timezone


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
    if not code:
        return Decimal("0.00")

    from .models import Coupon

    now = timezone.now()
    coupon = (
        Coupon.objects.filter(code=code, is_active=True)
        .filter(Q(starts_at__isnull=True) | Q(starts_at__lte=now))
        .filter(Q(expires_at__isnull=True) | Q(expires_at__gte=now))
        .first()
    )
    if coupon:
        if subtotal < coupon.min_order_value:
            return Decimal("0.00")
        if coupon.usage_limit is not None and coupon.used_count >= coupon.usage_limit:
            return Decimal("0.00")
        if coupon.discount_type == Coupon.DiscountType.PERCENT:
            return min(money(subtotal * (coupon.value / Decimal("100"))), money(subtotal))
        return min(money(coupon.value), money(subtotal))

    if code in {"CSM10", "COMEBACK10"}:
        return money(subtotal * Decimal("0.10"))
    return Decimal("0.00")


def mark_coupon_used(coupon_code: str) -> None:
    code = coupon_code.upper().strip()
    if not code:
        return
    from .models import Coupon

    Coupon.objects.filter(code=code, is_active=True).update(used_count=F("used_count") + 1)


def unmark_coupon_used(coupon_code: str) -> None:
    code = coupon_code.upper().strip()
    if not code:
        return
    from .models import Coupon

    Coupon.objects.filter(code=code, used_count__gt=0).update(used_count=F("used_count") - 1)


def shipping_amount(subtotal: Decimal) -> Decimal:
    if subtotal >= Decimal(str(settings.FREE_SHIPPING_THRESHOLD)):
        return Decimal("0.00")
    return Decimal("99.00")
