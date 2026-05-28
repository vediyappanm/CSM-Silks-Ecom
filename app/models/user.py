import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Text, Float, Integer, Enum as PgEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


class LoyaltyTier(str, enum.Enum):
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"
    ELITE = "elite"


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    phone: Mapped[str] = mapped_column(String(15), unique=True, nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    full_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(PgEnum(UserRole), default=UserRole.CUSTOMER, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Profile
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    skin_tone: Mapped[str | None] = mapped_column(String(20), nullable=True)   # for AI try-on
    body_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    city: Mapped[str | None] = mapped_column(String(80), nullable=True)
    state: Mapped[str | None] = mapped_column(String(80), nullable=True)

    # Loyalty
    loyalty_points: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    loyalty_tier: Mapped[LoyaltyTier] = mapped_column(PgEnum(LoyaltyTier), default=LoyaltyTier.BRONZE)

    # WhatsApp opt-in
    wa_opted_in: Mapped[bool] = mapped_column(Boolean, default=True)
    push_opted_in: Mapped[bool] = mapped_column(Boolean, default=True)
    fcm_token: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    orders = relationship("Order", back_populates="user", lazy="select")
    cart_items = relationship("CartItem", back_populates="user", lazy="select")
    addresses = relationship("Address", back_populates="user", lazy="select")
    try_on_sessions = relationship("TryOnSession", back_populates="user", lazy="select")
    loyalty_transactions = relationship("LoyaltyTransaction", back_populates="user", lazy="select")

    def __repr__(self):
        return f"<User {self.phone} — {self.role}>"
