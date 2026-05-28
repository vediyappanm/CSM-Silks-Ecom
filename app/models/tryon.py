import uuid
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, Text, ForeignKey, JSON, Boolean, Enum as PgEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Uuid
import enum
from app.database import Base


class TryOnSession(Base):
    __tablename__ = "try_on_sessions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    product_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)

    # Input parameters
    skin_tone: Mapped[str] = mapped_column(String(20))  # fair|wheatish|medium|dusky|deep
    body_type: Mapped[str] = mapped_column(String(20))  # petite|regular|tall|plus
    drape_style: Mapped[str] = mapped_column(String(50))
    occasion: Mapped[str | None] = mapped_column(String(80), nullable=True)

    # AI Output (Claude response)
    ai_result: Mapped[dict] = mapped_column(JSON, default=dict)
    confidence_score: Mapped[int] = mapped_column(Integer, default=0)

    # Conversion
    added_to_cart: Mapped[bool] = mapped_column(Boolean, default=False)
    converted_to_order: Mapped[bool] = mapped_column(Boolean, default=False)

    # AI metadata
    model_used: Mapped[str] = mapped_column(String(80), default="claude-sonnet-4-20250514")
    tokens_used: Mapped[int] = mapped_column(Integer, default=0)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="try_on_sessions")


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("orders.id"), unique=True, nullable=False)
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)

    # GST breakdown
    subtotal: Mapped[float] = mapped_column(Float)
    cgst_rate: Mapped[float] = mapped_column(Float, default=2.5)
    sgst_rate: Mapped[float] = mapped_column(Float, default=2.5)
    cgst_amount: Mapped[float] = mapped_column(Float)
    sgst_amount: Mapped[float] = mapped_column(Float)
    total_amount: Mapped[float] = mapped_column(Float)
    hsn_code: Mapped[str] = mapped_column(String(10), default="5007")

    # Storage
    pdf_url: Mapped[str | None] = mapped_column(Text, nullable=True)  # S3 URL
    is_emailed: Mapped[bool] = mapped_column(Boolean, default=False)
    is_whatsapped: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="invoice")


class LoyaltyTransaction(Base):
    __tablename__ = "loyalty_transactions"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    order_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)

    transaction_type: Mapped[str] = mapped_column(String(20))  # earn|redeem|expire|bonus
    points: Mapped[int] = mapped_column(Integer)               # positive=earn, negative=redeem
    balance_after: Mapped[int] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(String(255))

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="loyalty_transactions")


class LoyaltyReward(Base):
    __tablename__ = "loyalty_rewards"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text)
    points_required: Mapped[int] = mapped_column(Integer)
    reward_type: Mapped[str] = mapped_column(String(40))   # discount|free_product|service|experience
    reward_value: Mapped[float] = mapped_column(Float)     # ₹ value or percentage
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DailyReport(Base):
    __tablename__ = "daily_reports"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    report_date: Mapped[datetime] = mapped_column(DateTime, unique=True, nullable=False, index=True)

    # KPIs
    total_revenue: Mapped[float] = mapped_column(Float, default=0.0)
    total_orders: Mapped[int] = mapped_column(Integer, default=0)
    delivered_orders: Mapped[int] = mapped_column(Integer, default=0)
    return_orders: Mapped[int] = mapped_column(Integer, default=0)
    return_rate: Mapped[float] = mapped_column(Float, default=0.0)
    tryon_sessions: Mapped[int] = mapped_column(Integer, default=0)
    cart_rate: Mapped[float] = mapped_column(Float, default=0.0)
    whatsapp_sent: Mapped[int] = mapped_column(Integer, default=0)
    unsold_alerts: Mapped[int] = mapped_column(Integer, default=0)
    capital_blocked: Mapped[float] = mapped_column(Float, default=0.0)
    top_product_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    top_product_units: Mapped[int] = mapped_column(Integer, default=0)

    # AI summary generated by Claude
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Delivery
    email_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    whatsapp_sent_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class UnsoldAlert(Base):
    __tablename__ = "unsold_alerts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("products.id"), nullable=False, index=True)

    days_unsold: Mapped[int] = mapped_column(Integer)
    stock_qty: Mapped[int] = mapped_column(Integer)
    capital_blocked: Mapped[float] = mapped_column(Float)
    severity: Mapped[str] = mapped_column(String(20))     # critical|warning|watch

    # Admin actions
    discount_applied: Mapped[bool] = mapped_column(Boolean, default=False)
    discount_percent: Mapped[float] = mapped_column(Float, default=0.0)
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    alerted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    title: Mapped[str] = mapped_column(String(120))
    body: Mapped[str] = mapped_column(Text)
    notification_type: Mapped[str] = mapped_column(String(40))   # order|loyalty|promo|tryon|system
    data: Mapped[dict] = mapped_column(JSON, default=dict)

    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    push_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    wa_sent: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
