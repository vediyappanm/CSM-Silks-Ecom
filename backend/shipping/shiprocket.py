from __future__ import annotations

import json
from decimal import Decimal
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.utils import timezone

from orders.models import Order


class ShiprocketError(RuntimeError):
    pass


def shiprocket_configured() -> bool:
    return bool(settings.SHIPROCKET_EMAIL and settings.SHIPROCKET_PASSWORD)


def _json_request(path: str, *, payload: dict | None = None, token: str = "", timeout: int = 18) -> dict:
    url = f"{settings.SHIPROCKET_BASE_URL.rstrip('/')}/{path.lstrip('/')}"
    body = json.dumps(payload or {}).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = Request(url, data=body, headers=headers, method="POST")
    try:
        with urlopen(request, timeout=timeout) as response:
            data = response.read().decode("utf-8")
    except HTTPError as exc:
        details = exc.read().decode("utf-8", errors="ignore")
        raise ShiprocketError(f"Shiprocket HTTP {exc.code}: {details[:300]}") from exc
    except URLError as exc:
        raise ShiprocketError(f"Shiprocket connection failed: {exc.reason}") from exc
    except TimeoutError as exc:
        raise ShiprocketError("Shiprocket request timed out") from exc
    try:
        return json.loads(data or "{}")
    except json.JSONDecodeError as exc:
        raise ShiprocketError("Shiprocket returned invalid JSON") from exc


class ShiprocketClient:
    def authenticate(self) -> str:
        if not shiprocket_configured():
            raise ShiprocketError("Shiprocket credentials are not configured")
        data = _json_request(
            "/auth/login",
            payload={"email": settings.SHIPROCKET_EMAIL, "password": settings.SHIPROCKET_PASSWORD},
        )
        token = data.get("token") or data.get("data", {}).get("token")
        if not token:
            raise ShiprocketError("Shiprocket did not return an auth token")
        return str(token)

    def create_order(self, order: Order) -> dict:
        token = self.authenticate()
        data = _json_request("/orders/create/adhoc", payload=build_order_payload(order), token=token)
        return normalize_order_response(data)


def _money(value) -> float:
    if isinstance(value, Decimal):
        return float(value)
    return float(value or 0)


def build_order_payload(order: Order) -> dict:
    address = order.shipping_address_snapshot or {}
    full_name = (address.get("full_name") or order.user.display_name or "CSM Customer").strip()
    first_name, _, last_name = full_name.partition(" ")
    order_items = [
        {
            "name": item.product_name,
            "sku": item.product_sku,
            "units": item.quantity,
            "selling_price": _money(item.unit_price),
            "discount": 0,
            "tax": _money(order.gst_total),
            "hsn": settings.HSN_CODE,
        }
        for item in order.items.all()
    ]
    return {
        "order_id": order.order_number,
        "order_date": timezone.localtime(order.created_at).strftime("%Y-%m-%d %H:%M"),
        "pickup_location": settings.SHIPROCKET_PICKUP_LOCATION,
        "channel_id": "",
        "comment": "CSM Silks ecommerce order",
        "billing_customer_name": first_name or full_name,
        "billing_last_name": last_name,
        "billing_address": address.get("address_line_1", ""),
        "billing_address_2": address.get("address_line_2", ""),
        "billing_city": address.get("city", ""),
        "billing_pincode": address.get("pin_code", ""),
        "billing_state": address.get("state", ""),
        "billing_country": address.get("country", "India"),
        "billing_email": order.user.email or "orders@csmsilks.local",
        "billing_phone": address.get("phone") or order.user.phone or "",
        "shipping_is_billing": True,
        "order_items": order_items,
        "payment_method": "COD" if order.payment_method == Order.PaymentMethod.COD else "Prepaid",
        "shipping_charges": _money(order.shipping_amount),
        "giftwrap_charges": 0,
        "transaction_charges": 0,
        "total_discount": _money(order.discount_amount),
        "sub_total": _money(order.subtotal),
        "length": settings.SHIPROCKET_PACKAGE_LENGTH_CM,
        "breadth": settings.SHIPROCKET_PACKAGE_BREADTH_CM,
        "height": settings.SHIPROCKET_PACKAGE_HEIGHT_CM,
        "weight": settings.SHIPROCKET_PACKAGE_WEIGHT_KG,
    }


def normalize_order_response(data: dict) -> dict:
    shipment_id = data.get("shipment_id") or data.get("shipment", {}).get("id") or data.get("data", {}).get("shipment_id")
    awb = (
        data.get("awb_code")
        or data.get("awb")
        or data.get("data", {}).get("awb_code")
        or data.get("data", {}).get("awb")
        or data.get("response", {}).get("data", {}).get("awb_code")
    )
    courier = data.get("courier_name") or data.get("data", {}).get("courier_name") or "shiprocket"
    label_url = data.get("label_url") or data.get("data", {}).get("label_url") or ""
    manifest_url = data.get("manifest_url") or data.get("data", {}).get("manifest_url") or ""
    tracking_url = data.get("tracking_url") or data.get("data", {}).get("tracking_url") or ""
    return {
        "shipment_id": shipment_id,
        "awb_number": str(awb or ""),
        "provider": str(courier or "shiprocket"),
        "label_url": str(label_url or ""),
        "manifest_url": str(manifest_url or ""),
        "tracking_url": str(tracking_url or ""),
        "raw_payload": data,
    }
