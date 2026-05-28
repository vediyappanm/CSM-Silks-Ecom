"""
Order Service — business logic for cart, orders, GST calculation.
GST: CGST 2.5% + SGST 2.5% = 5% total. HSN 5007.
"""
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.order import Order, OrderItem, OrderStatus
from app.models.cart import CartItem
from app.models.product import Product
from app.models.user import User
from app.models.loyalty import LoyaltyTransaction
from app.config import settings
from app.utils.whatsapp import send_order_confirmed


def calculate_gst(subtotal: float) -> tuple[float, float]:
    """Returns (cgst, sgst). Both 2.5% each = 5% total."""
    cgst = round(subtotal * 0.025, 2)
    sgst = round(subtotal * 0.025, 2)
    return cgst, sgst


def calculate_loyalty_points(order_total: float) -> int:
    """5 points per ₹100 spent."""
    return int((order_total / 100) * 5)


def generate_order_number() -> str:
    """CSM-YYYYMMDD-XXXX format."""
    ts = datetime.utcnow().strftime("%Y%m%d")
    suffix = str(uuid.uuid4().int)[:4].upper()
    return f"CSM-{ts}-{suffix}"


async def get_cart(user_id: uuid.UUID, db: AsyncSession) -> list[CartItem]:
    result = await db.execute(
        select(CartItem)
        .where(CartItem.user_id == user_id)
        .options()
    )
    return result.scalars().all()


async def add_to_cart(
    user_id: uuid.UUID,
    product_id: uuid.UUID,
    quantity: int,
    colour: str | None,
    db: AsyncSession,
) -> CartItem:
    # Check if already in cart
    result = await db.execute(
        select(CartItem).where(
            CartItem.user_id == user_id,
            CartItem.product_id == product_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.quantity += quantity
        await db.commit()
        return existing

    item = CartItem(
        user_id=user_id,
        product_id=product_id,
        quantity=quantity,
        selected_colour=colour,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def create_order_from_cart(
    user: User,
    address_id: uuid.UUID,
    coupon_code: str | None,
    db: AsyncSession,
) -> Order:
    # Load cart items with products
    cart_result = await db.execute(
        select(CartItem).where(CartItem.user_id == user.id)
    )
    cart_items = cart_result.scalars().all()
    if not cart_items:
        raise ValueError("Cart is empty")

    subtotal = 0.0
    order_items = []

    for ci in cart_items:
        prod_result = await db.execute(select(Product).where(Product.id == ci.product_id))
        product = prod_result.scalar_one_or_none()
        if not product or not product.is_active:
            raise ValueError(f"Product {ci.product_id} unavailable")
        if product.available_qty < ci.quantity:
            raise ValueError(f"Insufficient stock for {product.name}")

        line_total = product.price * ci.quantity
        subtotal += line_total
        order_items.append(OrderItem(
            product_id=product.id,
            product_name=product.name,
            product_sku=product.sku,
            unit_price=product.price,
            quantity=ci.quantity,
            subtotal=line_total,
            selected_colour=ci.selected_colour,
        ))

    # Coupon discount (simplified)
    discount = 0.0
    if coupon_code == "COMEBACK10":
        discount = round(subtotal * 0.10, 2)

    taxable_amount = subtotal - discount
    cgst, sgst = calculate_gst(taxable_amount)
    total = taxable_amount + cgst + sgst

    # Loyalty points
    points_earned = calculate_loyalty_points(total)

    order = Order(
        order_number=generate_order_number(),
        user_id=user.id,
        address_id=address_id,
        subtotal=subtotal,
        discount_amount=discount,
        coupon_code=coupon_code,
        cgst_amount=cgst,
        sgst_amount=sgst,
        total_amount=total,
        status=OrderStatus.CONFIRMED,
        loyalty_points_earned=points_earned,
        confirmed_at=datetime.utcnow(),
    )
    order.items = order_items
    db.add(order)

    # Decrement inventory and update last_sold_at
    for ci in cart_items:
        await db.execute(
            update(Product)
            .where(Product.id == ci.product_id)
            .values(
                stock_qty=Product.stock_qty - ci.quantity,
                total_sold=Product.total_sold + ci.quantity,
                last_sold_at=datetime.utcnow(),
            )
        )

    # Clear cart
    for ci in cart_items:
        await db.delete(ci)

    await db.commit()
    await db.refresh(order)

    # Queue loyalty points (via Celery in production)
    await credit_loyalty_points(user, order.id, points_earned, db)

    return order


async def credit_loyalty_points(
    user: User, order_id: uuid.UUID, points: int, db: AsyncSession
):
    user.loyalty_points += points
    txn = LoyaltyTransaction(
        user_id=user.id,
        order_id=order_id,
        transaction_type="earn",
        points=points,
        balance_after=user.loyalty_points,
        description=f"Points earned from order",
    )
    db.add(txn)
    await db.commit()


async def update_order_status(
    order_id: uuid.UUID,
    new_status: OrderStatus,
    db: AsyncSession,
    tracking_number: str | None = None,
    courier_name: str | None = None,
) -> Order:
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise ValueError("Order not found")

    order.status = new_status
    order.updated_at = datetime.utcnow()

    if new_status == OrderStatus.SHIPPED:
        order.shipped_at = datetime.utcnow()
        if tracking_number:
            order.tracking_number = tracking_number
        if courier_name:
            order.courier_name = courier_name

    if new_status == OrderStatus.DELIVERED:
        order.delivered_at = datetime.utcnow()

    await db.commit()
    await db.refresh(order)
    return order
