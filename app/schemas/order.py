from __future__ import annotations
import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.order import OrderStatus


# ── ORDER ─────────────────────────────────────────────────────────────────────
class OrderCreate(BaseModel):
    address_id: uuid.UUID
    coupon_code: str | None = None
    loyalty_points_to_use: int = 0


class OrderItemResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    product_sku: str
    unit_price: float
    quantity: int
    subtotal: float
    selected_colour: str | None


class OrderResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    order_number: str
    status: OrderStatus
    subtotal: float
    discount_amount: float
    coupon_code: str | None
    cgst_amount: float
    sgst_amount: float
    shipping_amount: float
    total_amount: float
    courier_name: str | None
    tracking_number: str | None
    estimated_delivery: datetime | None
    loyalty_points_earned: int
    items: list[OrderItemResponse]
    created_at: datetime
    shipped_at: datetime | None
    delivered_at: datetime | None


class OrderListResponse(BaseModel):
    items: list[OrderResponse]
    total: int
    page: int
    per_page: int


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    tracking_number: str | None = None
    courier_name: str | None = None
    notes: str | None = None
