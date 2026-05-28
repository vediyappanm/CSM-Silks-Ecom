from __future__ import annotations
import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.product import ProductCategory, ProductGender


class ProductCreate(BaseModel):
    sku: str
    name: str
    name_tamil: str | None = None
    slug: str
    description: str | None = None
    hook: str | None = None
    category: ProductCategory
    gender: ProductGender = ProductGender.WOMEN
    tags: list[str] = []
    occasion: list[str] = []
    price: float
    mrp: float
    cost_price: float | None = None
    hsn_code: str = "5007"
    stock_qty: int = 0
    fabric: str | None = None
    zari_type: str | None = None
    colours: list[str] = []
    length_meters: float | None = None
    blouse_included: bool = True
    care_instructions: str | None = None
    images: list[str] = []
    is_gi_tagged: bool = True
    is_featured: bool = False


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    hook: str | None = None
    price: float | None = None
    mrp: float | None = None
    stock_qty: int | None = None
    is_active: bool | None = None
    is_featured: bool | None = None
    images: list[str] | None = None
    tags: list[str] | None = None


class ProductResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    sku: str
    name: str
    name_tamil: str | None
    slug: str
    hook: str | None
    category: ProductCategory
    gender: ProductGender
    tags: list
    price: float
    mrp: float
    hsn_code: str
    stock_qty: int
    available_qty: int
    colours: list
    images: list
    blouse_included: bool
    is_active: bool
    is_featured: bool
    is_gi_tagged: bool
    discount_percent: int
    avg_rating: float
    review_count: int
    total_sold: int
    last_sold_at: datetime | None
    created_at: datetime


class ProductListResponse(BaseModel):
    items: list[ProductResponse]
    total: int
    page: int
    per_page: int
    pages: int
