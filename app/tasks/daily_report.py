"""Daily Report Celery Task — runs at 9 AM IST via beat schedule."""
import asyncio
from datetime import datetime, timedelta
from sqlalchemy import select, func
from app.tasks.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models.order import Order, OrderStatus
from app.models.tryon import TryOnSession, DailyReport
from app.services.ai_service import ai_service
from app.utils.whatsapp import send_daily_report_admin


@celery_app.task(name="app.tasks.daily_report.generate_daily_report", bind=True, max_retries=3)
def generate_daily_report(self):
    """Generates daily business report with AI summary."""
    asyncio.get_event_loop().run_until_complete(_async_generate_report())


async def _async_generate_report():
    today = datetime.utcnow().date()
    yesterday = today - timedelta(days=1)

    async with AsyncSessionLocal() as db:
        # Revenue
        revenue = (await db.execute(
            select(func.sum(Order.total_amount)).where(func.date(Order.created_at) == yesterday)
        )).scalar() or 0.0

        # Orders
        orders = (await db.execute(
            select(func.count()).select_from(Order).where(func.date(Order.created_at) == yesterday)
        )).scalar() or 0

        # Delivered
        delivered = (await db.execute(
            select(func.count()).select_from(Order).where(
                func.date(Order.delivered_at) == yesterday,
                Order.status == OrderStatus.DELIVERED,
            )
        )).scalar() or 0

        # Returns
        returns = (await db.execute(
            select(func.count()).select_from(Order).where(
                func.date(Order.updated_at) == yesterday,
                Order.status == OrderStatus.RETURNED,
            )
        )).scalar() or 0

        return_rate = (returns / orders * 100) if orders > 0 else 0.0

        # Try-on sessions
        tryon_sessions = (await db.execute(
            select(func.count()).select_from(TryOnSession).where(
                func.date(TryOnSession.created_at) == yesterday
            )
        )).scalar() or 0

        report_data = {
            "revenue": revenue,
            "orders": orders,
            "delivered": delivered,
            "returns": returns,
            "return_rate": return_rate,
            "top_product": "Royal Kanjivaram Gold Zari",  # TODO: compute from order items
            "top_units": 5,
            "tryon_sessions": tryon_sessions,
            "unsold_count": 0,
            "capital_blocked": 0.0,
        }

        # Generate AI summary
        try:
            ai_summary = await ai_service.generate_report_summary(report_data)
        except Exception:
            ai_summary = f"Revenue: ₹{revenue:,.0f} | Orders: {orders} | Delivered: {delivered}"

        # Save report
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

        # Send WhatsApp to admin
        try:
            await send_daily_report_admin(
                revenue=revenue, orders=orders, delivered=delivered, returns=returns,
                top_product="Royal Kanjivaram Gold Zari",
                report_link="https://admin.csmsilks.com/reports",
                date=yesterday.strftime("%d %b %Y"),
            )
        except Exception:
            pass  # Non-critical — log in production
