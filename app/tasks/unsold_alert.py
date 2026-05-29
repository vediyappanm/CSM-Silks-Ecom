"""Unsold Alert Celery Task — checks products unsold for 20+ days."""
import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy import select
from app.tasks.celery_app import celery_app
from app.database import AsyncSessionLocal
from app.models.product import Product
from app.models.tryon import UnsoldAlert
from app.services.ai_service import ai_service
from app.utils.whatsapp import send_unsold_alert_admin
from app.config import settings

logger = logging.getLogger("csm_silks.tasks.unsold_alert")


@celery_app.task(name="app.tasks.unsold_alert.check_unsold_products", bind=True)
def check_unsold_products(self):
    asyncio.run(_async_check_unsold())


async def _async_check_unsold():
    cutoff = datetime.utcnow() - timedelta(days=settings.UNSOLD_ALERT_DAYS)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Product).where(
                Product.is_active == True,
                Product.stock_qty > 0,
                (Product.last_sold_at == None) | (Product.last_sold_at < cutoff),
            )
        )
        products = result.scalars().all()

        if not products:
            logger.info("No unsold products found")
            return

        alert_items = []
        total_capital = 0.0

        for p in products:
            if p.last_sold_at:
                days_unsold = (datetime.utcnow() - p.last_sold_at).days
            else:
                days_unsold = (datetime.utcnow() - p.created_at).days

            if days_unsold < settings.UNSOLD_ALERT_DAYS:
                continue

            capital = p.price * p.stock_qty
            total_capital += capital
            severity = "critical" if days_unsold >= 25 else "warning" if days_unsold >= 21 else "watch"

            alert = UnsoldAlert(
                product_id=p.id,
                days_unsold=days_unsold,
                stock_qty=p.stock_qty,
                capital_blocked=capital,
                severity=severity,
            )
            db.add(alert)
            alert_items.append({"name": p.name, "sku": p.sku, "days": days_unsold, "qty": p.stock_qty, "capital": capital})

        await db.commit()

        if alert_items:
            try:
                await ai_service.analyse_unsold_items(alert_items)
            except Exception as e:
                logger.warning("AI unsold analysis failed: %s", e)

            try:
                await send_unsold_alert_admin(
                    count=len(alert_items),
                    amount=total_capital,
                    dashboard_link="https://admin.csmsilks.com/alerts",
                )
            except Exception as e:
                logger.warning("WhatsApp unsold alert failed: %s", e)
        else:
            logger.info("No unsold products above threshold")