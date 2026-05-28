import hmac
import hashlib
import razorpay
from app.config import settings


def get_razorpay_client() -> razorpay.Client:
    return razorpay.Client(
        auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    )


def create_razorpay_order(amount_paise: int, receipt: str, notes: dict = None) -> dict:
    """Create Razorpay order. amount_paise = amount * 100."""
    client = get_razorpay_client()
    return client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": receipt,
        "notes": notes or {},
    })


def verify_payment_signature(
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
) -> bool:
    """
    CRITICAL: Always verify HMAC before marking an order as paid.
    Never skip this step.
    """
    message = f"{razorpay_order_id}|{razorpay_payment_id}"
    expected = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, razorpay_signature)


def verify_webhook_signature(payload_bytes: bytes, signature: str) -> bool:
    """Verify Razorpay webhook signature."""
    expected = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


def create_refund(payment_id: str, amount_paise: int | None = None) -> dict:
    """Full or partial refund."""
    client = get_razorpay_client()
    data = {}
    if amount_paise:
        data["amount"] = amount_paise
    return client.payment.refund(payment_id, data)
