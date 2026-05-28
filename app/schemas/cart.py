from __future__ import annotations
import uuid
from pydantic import BaseModel, field_validator


class CartItemCreate(BaseModel):
    product_id: uuid.UUID
    quantity: int = 1
    selected_colour: str | None = None

    @field_validator("quantity")
    @classmethod
    def qty_positive(cls, v):
        if v < 1:
            raise ValueError("Quantity must be at least 1")
        if v > 10:
            raise ValueError("Max 10 units per product")
        return v


class CartItemUpdate(BaseModel):
    quantity: int

    @field_validator("quantity")
    @classmethod
    def qty_valid(cls, v):
        if v < 1:
            raise ValueError("Quantity must be at least 1")
        return v


class CartItemResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    product_id: uuid.UUID
    quantity: int
    selected_colour: str | None
    # Populated from product join
    product_name: str | None = None
    product_price: float | None = None
    product_image: str | None = None
    line_total: float | None = None


class CartResponse(BaseModel):
    items: list[CartItemResponse]
    item_count: int
    subtotal: float
    cgst: float
    sgst: float
    total: float
    free_shipping: bool
