import uuid
from datetime import datetime
from sqlalchemy import String, Float, DateTime, ForeignKey, Enum as PgEnum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid
import enum
from app.database import Base


class PaymentMethod(str, enum.Enum):
    UPI = "upi"
    CARD = "card"
    NET_BANKING = "net_banking"
    COD = "cod"
    WALLET = "wallet"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("orders.id"), nullable=False, unique=True, index=True)

    # Razorpay IDs
    razorpay_order_id: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True, index=True)
    razorpay_payment_id: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True, index=True)
    razorpay_signature: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Details
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(5), default="INR")
    method: Mapped[PaymentMethod | None] = mapped_column(PgEnum(PaymentMethod), nullable=True)
    status: Mapped[PaymentStatus] = mapped_column(PgEnum(PaymentStatus), default=PaymentStatus.PENDING, index=True)
    is_hmac_verified: Mapped[bool] = mapped_column(default=False)

    # Refund
    refund_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    refunded_amount: Mapped[float] = mapped_column(Float, default=0.0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    order = relationship("Order", back_populates="payment")
