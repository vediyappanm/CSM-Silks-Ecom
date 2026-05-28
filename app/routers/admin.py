from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from app.database import get_db
from app.models.order import Order, OrderStatus
from app.models.product import Product
from app.models.user import User
from app.models.tryon import TryOnSession, UnsoldAlert
from app.config import settings
from app.utils.auth import get_current_admin

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard")
async def dashboard_kpis(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    today = datetime.utcnow().date()
    month_start = today.replace(day=1)

    # Revenue today
    rev_today = (await db.execute(
        select(func.sum(Order.total_amount)).where(func.date(Order.created_at) == today)
    )).scalar() or 0.0

    # Revenue this month
    rev_month = (await db.execute(
        select(func.sum(Order.total_amount)).where(func.date(Order.created_at) >= month_start)
    )).scalar() or 0.0

    # Orders today
    orders_today = (await db.execute(
        select(func.count()).select_from(Order).where(func.date(Order.created_at) == today)
    )).scalar() or 0

    # Total customers
    total_customers = (await db.execute(select(func.count()).select_from(User))).scalar() or 0

    # Products low stock
    low_stock = (await db.execute(
        select(func.count()).select_from(Product).where(
            Product.stock_qty <= Product.reorder_level, Product.is_active == True
        )
    )).scalar() or 0

    # Try-on sessions today
    tryon_today = (await db.execute(
        select(func.count()).select_from(TryOnSession).where(
            func.date(TryOnSession.created_at) == today
        )
    )).scalar() or 0

    # Unsold alerts
    unsold_count = (await db.execute(
        select(func.count()).select_from(UnsoldAlert).where(UnsoldAlert.resolved == False)
    )).scalar() or 0

    # Capital blocked
    capital_blocked = (await db.execute(
        select(func.sum(UnsoldAlert.capital_blocked)).where(UnsoldAlert.resolved == False)
    )).scalar() or 0.0

    # Recent orders
    recent_orders_result = await db.execute(
        select(Order).order_by(Order.created_at.desc()).limit(10)
    )
    recent_orders = recent_orders_result.scalars().all()

    return {
        "kpis": {
            "revenue_today": rev_today,
            "revenue_month": rev_month,
            "orders_today": orders_today,
            "total_customers": total_customers,
            "tryon_sessions_today": tryon_today,
            "low_stock_products": low_stock,
            "unsold_alerts": unsold_count,
            "capital_blocked": capital_blocked,
        },
        "recent_orders": [
            {
                "id": str(o.id),
                "order_number": o.order_number,
                "status": o.status.value,
                "total": o.total_amount,
                "created_at": o.created_at.isoformat(),
            }
            for o in recent_orders
        ],
    }


@router.get("/unsold-alerts")
async def unsold_alerts(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    cutoff = datetime.utcnow() - timedelta(days=settings.UNSOLD_ALERT_DAYS)
    result = await db.execute(
        select(Product).where(
            Product.is_active == True,
            Product.stock_qty > 0,
            (Product.last_sold_at == None) | (Product.last_sold_at < cutoff),
        ).order_by(Product.last_sold_at.asc().nullsfirst())
    )
    products = result.scalars().all()

    items = []
    for p in products:
        days_unsold = 0
        if p.last_sold_at:
            days_unsold = (datetime.utcnow() - p.last_sold_at).days
        else:
            days_unsold = (datetime.utcnow() - p.created_at).days

        capital = p.price * p.stock_qty
        severity = "critical" if days_unsold >= 25 else "warning" if days_unsold >= 21 else "watch"
        items.append({
            "product_id": str(p.id),
            "sku": p.sku,
            "name": p.name,
            "days_unsold": days_unsold,
            "stock_qty": p.stock_qty,
            "price": p.price,
            "capital_blocked": capital,
            "severity": severity,
            "last_sold_at": p.last_sold_at.isoformat() if p.last_sold_at else None,
        })

    return {"count": len(items), "total_capital_blocked": sum(i["capital_blocked"] for i in items), "items": items}


@router.get("/products")
async def admin_products(
    page: int = Query(1, ge=1),
    per_page: int = Query(20),
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    import math
    total = (await db.execute(select(func.count()).select_from(Product))).scalar()
    products = (await db.execute(
        select(Product).offset((page - 1) * per_page).limit(per_page)
    )).scalars().all()
    return {
        "total": total,
        "pages": math.ceil(total / per_page),
        "products": [
            {
                "id": str(p.id), "sku": p.sku, "name": p.name,
                "price": p.price, "stock_qty": p.stock_qty,
                "is_active": p.is_active, "total_sold": p.total_sold,
                "last_sold_at": p.last_sold_at.isoformat() if p.last_sold_at else None,
            }
            for p in products
        ],
    }


@router.get("/orders")
async def admin_orders(
    page: int = Query(1, ge=1),
    per_page: int = Query(20),
    status: OrderStatus | None = None,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    import math
    q = select(Order)
    if status:
        q = q.where(Order.status == status)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    orders = (await db.execute(
        q.order_by(Order.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    )).scalars().all()
    return {
        "total": total,
        "pages": math.ceil(total / per_page),
        "orders": [
            {
                "id": str(o.id), "order_number": o.order_number,
                "status": o.status.value, "total": o.total_amount,
                "created_at": o.created_at.isoformat(),
            }
            for o in orders
        ],
    }
