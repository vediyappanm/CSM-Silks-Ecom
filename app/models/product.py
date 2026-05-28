import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Text, Float, Integer, JSON, Enum as PgEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid
import enum
from app.database import Base


class ProductCategory(str, enum.Enum):
    KANJIVARAM = "kanjivaram"
    BANARASI = "banarasi"
    PATOLA = "patola"
    CHANDERI = "chanderi"
    MYSORE = "mysore"
    TUSSAR = "tussar"
    POCHAMPALLY = "pochampally"
    MENS_DHOTI = "mens_dhoti"
    MENS_VESHTI = "mens_veshti"
    MENS_SHIRT = "mens_shirt"
    MENS_SET = "mens_set"
    OTHER = "other"


class ProductGender(str, enum.Enum):
    WOMEN = "women"
    MEN = "men"
    UNISEX = "unisex"


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    sku: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    name_tamil: Mapped[str | None] = mapped_column(String(255), nullable=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    hook: Mapped[str | None] = mapped_column(String(255), nullable=True)  # marketing one-liner

    # Categorisation
    category: Mapped[ProductCategory] = mapped_column(PgEnum(ProductCategory), nullable=False, index=True)
    gender: Mapped[ProductGender] = mapped_column(PgEnum(ProductGender), default=ProductGender.WOMEN, index=True)
    tags: Mapped[list] = mapped_column(JSON, default=list)           # ["bridal","kanjivaram","bestseller"]
    occasion: Mapped[list] = mapped_column(JSON, default=list)       # ["wedding","festive"]

    # Pricing (in paisa stored as float for display)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    mrp: Mapped[float] = mapped_column(Float, nullable=False)
    cost_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    hsn_code: Mapped[str] = mapped_column(String(10), default="5007")

    # Inventory — CRITICAL: last_sold_at drives the 20-day unsold alert
    stock_qty: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reserved_qty: Mapped[int] = mapped_column(Integer, default=0)  # in carts / pending orders
    last_sold_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    reorder_level: Mapped[int] = mapped_column(Integer, default=5)

    # Attributes
    fabric: Mapped[str | None] = mapped_column(String(100), nullable=True)  # "Pure Kanjivaram Silk"
    zari_type: Mapped[str | None] = mapped_column(String(80), nullable=True) # "Real Gold Zari"
    colours: Mapped[list] = mapped_column(JSON, default=list)               # ["#C4923A","#8B1A1A"]
    length_meters: Mapped[float | None] = mapped_column(Float, nullable=True)
    blouse_included: Mapped[bool] = mapped_column(Boolean, default=True)    # women's sarees
    care_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Media
    images: Mapped[list] = mapped_column(JSON, default=list)   # S3 URLs
    video_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # SEO
    meta_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    meta_description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    is_gi_tagged: Mapped[bool] = mapped_column(Boolean, default=True)

    # Stats
    total_sold: Mapped[int] = mapped_column(Integer, default=0)
    avg_rating: Mapped[float] = mapped_column(Float, default=0.0)
    review_count: Mapped[int] = mapped_column(Integer, default=0)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    order_items = relationship("OrderItem", back_populates="product")
    cart_items = relationship("CartItem", back_populates="product")

    @property
    def discount_percent(self) -> int:
        if self.mrp > 0:
            return round((1 - self.price / self.mrp) * 100)
        return 0

    @property
    def available_qty(self) -> int:
        return max(0, self.stock_qty - self.reserved_qty)

    def __repr__(self):
        return f"<Product {self.sku} — {self.name}>"
