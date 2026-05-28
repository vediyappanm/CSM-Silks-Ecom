import uuid, math
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.schemas.order import OrderCreate, OrderResponse, OrderListResponse, OrderStatusUpdate
from app.services.order_service import create_order_from_cart, update_order_status
from app.utils.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderResponse)
async def place_order(
    body: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        order = await create_order_from_cart(
            user=current_user,
            address_id=body.address_id,
            coupon_code=body.coupon_code,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
    result = await db.execute(
        select(Order).where(Order.id == order.id).options(selectinload(Order.items))
    )
    return OrderResponse.model_validate(result.scalar_one())


@router.get("", response_model=OrderListResponse)
async def list_my_orders(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Order).where(Order.user_id == current_user.id).options(selectinload(Order.items))
    total = (await db.execute(select(func.count()).select_from(
        select(Order).where(Order.user_id == current_user.id).subquery()
    ))).scalar()
    orders = (await db.execute(
        q.order_by(Order.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    )).scalars().all()
    return OrderListResponse(
        items=[OrderResponse.model_validate(o) for o in orders],
        total=total, page=page, per_page=per_page,
    )


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id, Order.user_id == current_user.id)
        .options(selectinload(Order.items))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    return OrderResponse.model_validate(order)


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_status(
    order_id: uuid.UUID,
    body: OrderStatusUpdate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        order = await update_order_status(
            order_id=order_id,
            new_status=body.status,
            db=db,
            tracking_number=body.tracking_number,
            courier_name=body.courier_name,
        )
    except ValueError as e:
        raise HTTPException(404, str(e))
    result = await db.execute(
        select(Order).where(Order.id == order.id).options(selectinload(Order.items))
    )
    return OrderResponse.model_validate(result.scalar_one())


@router.post("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.user_id == current_user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status not in (OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PAYMENT_PENDING):
        raise HTTPException(400, f"Cannot cancel order in {order.status} status")
    order.status = OrderStatus.CANCELLED
    await db.commit()
    await db.refresh(order)
    result2 = await db.execute(
        select(Order).where(Order.id == order.id).options(selectinload(Order.items))
    )
    return OrderResponse.model_validate(result2.scalar_one())
