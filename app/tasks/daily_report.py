"""Daily Report Celery Task — runs at 9 AM IST via beat schedule."""
import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy import select, func
from app.tasks.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models.order import Order, OrderItem, OrderStatus
from app.models.tryon import TryOnSession, DailyReport
from app.services.ai_service import ai_service
from app.utils.whatsapp import send_daily_report_admin

logger = logging.getLogger("csm_silks.tasks.daily_report")


@celery_app.task(name="app.tasks.daily_report.generate_daily_report", bind=True, max_retries=3)
def generate_daily_report(self):
    asyncio.run(_async_generate_report())


async def _async_generate_report():
    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)

    async with AsyncSessionLocal() as db:
        revenue = (await db.execute(
            select(func.sum(Order.total_amount)).where(func.date(Order.created_at) == yesterday)
        )).scalar() or 0.0

        orders = (await db.execute(
            select(func.count()).select_from(Order).where(func.date(Order.created_at) == yesterday)
        )).scalar() or 0

        delivered = (await db.execute(
            select(func.count()).select_from(Order).where(
                func.date(Order.delivered_at) == yesterday,
                Order.status == OrderStatus.DELIVERED,
            )
        )).scalar() or 0

        returns = (await db.execute(
            select(func.count()).select_from(Order).where(
                func.date(Order.updated_at) == yesterday,
                Order.status == OrderStatus.RETURNED,
            )
        )).scalar() or 0

        return_rate = (returns / orders * 100) if orders > 0 else 0.0

        tryon_sessions = (await db.execute(
            select(func.count()).select_from(TryOnSession).where(
                func.date(TryOnSession.created_at) == yesterday
            )
        )).scalar() or 0

        top_product = "N/A"
        top_units = 0
        if orders > 0:
            top_row = (await db.execute(
                select(OrderItem.product_name, func.sum(OrderItem.quantity))
                .join(Order, OrderItem.order_id == Order.id)
                .where(func.date(Order.created_at) == yesterday)
                .group_by(OrderItem.product_name)
                .order_by(func.sum(OrderItem.quantity).desc())
                .limit(1)
            )).first()
            if top_row:
                top_product, top_units = top_row

        unsold_count = (await db.execute(
            select(func.count()).select_from(OrderItem)  # placeholder — proper unsold query uses Product
        )).scalar() or 0

        capital_blocked = 0.0

        report_data = {
            "revenue": revenue,
            "orders": orders,
            "delivered": delivered,
            "returns": returns,
            "return_rate": return_rate,
            "top_product": top_product,
            "top_units": top_units,
            "tryon_sessions": tryon_sessions,
            "unsold_count": unsold_count,
            "capital_blocked": capital_blocked,
        }

        try:
            ai_summary = await ai_service.generate_report_summary(report_data)
        except Exception as e:
            logger.warning("AI summary failed, using fallback: %s", e)
            ai_summary = f"Revenue: ₹{revenue:,.0f} | Orders: {orders} | Delivered: {delivered}"

        report = DailyReport(
            report_date=datetime(yesterday.year, yesterday.month, yesterday.day),
            total_revenue=revenue,
            total_orders=orders,
            delivered_orders=delivered,
            return_orders=returns,
            return_rate=return_rate,
            tryon_sessions=tryon_sessions,
            ai_summary=ai_summary,
        )
        db.add(report)
        await db.commit()

        try:
            await send_daily_report_admin(
                revenue=revenue, orders=orders, delivered=delivered, returns=returns,
                top_product=top_product,
                report_link="https://admin.csmsilks.com/reports",
                date=yesterday.strftime("%d %b %Y"),
            )
        except Exception as e:
            logger.warning("WhatsApp notification failed: %s", e)