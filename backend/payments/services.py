from __future__ import annotations

import hashlib
import hmac
import uuid

from django.conf import settings


def create_gateway_order(amount_paise: int, receipt: str, notes: dict | None = None) -> dict:
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        return {
            "id": f"order_dev_{uuid.uuid4().hex[:16]}",
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt,
            "notes": notes or {},
        }
    import razorpay

    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    return client.order.create({"amount": amount_paise, "currency": "INR", "receipt": receipt, "notes": notes or {}})


def verify_payment_signature(razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str) -> bool:
    if not settings.RAZORPAY_KEY_SECRET and razorpay_signature == "dev":
        return True
    message = f"{razorpay_order_id}|{razorpay_payment_id}"
    expected = hmac.new(settings.RAZORPAY_KEY_SECRET.encode("utf-8"), message.encode("utf-8"), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, razorpay_signature)


def verify_webhook_signature(payload_bytes: bytes, signature: str) -> bool:
    if not settings.RAZORPAY_WEBHOOK_SECRET and signature == "dev":
        return True
    expected = hmac.new(settings.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
