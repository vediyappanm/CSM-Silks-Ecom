from __future__ import annotations
import uuid
from pydantic import BaseModel


class PaymentCreateOrder(BaseModel):
    order_id: uuid.UUID


class PaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    order_id: uuid.UUID


class PaymentWebhook(BaseModel):
    entity: str
    account_id: str | None = None
    event: str
    contains: list[str] = []
    payload: dict = {}


class RefundRequest(BaseModel):
    order_id: uuid.UUID
    amount: float | None = None   # None = full refund
    reason: str | None = None
