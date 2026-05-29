"""WhatsApp Cloud API utilities — gracefully disabled when not configured."""
import logging
from app.config import settings

logger = logging.getLogger("csm_silks.utils.whatsapp")

WHATSAPP_ENABLED = bool(settings.WHATSAPP_API_KEY and settings.WHATSAPP_PHONE_NUMBER_ID)

_ADMIN_PHONE = settings.ADMIN_PHONE or "+919999999999"


async def send_whatsapp_template(to: str, template_name: str, components: list) -> dict:
    if not WHATSAPP_ENABLED:
        logger.debug("WhatsApp not configured — skipping %s to %s", template_name, to)
        return {"status": "skipped", "reason": "WhatsApp not configured"}
    import aiohttp
    url = f"https://graph.facebook.com/v21.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": to.replace("+", "").replace(" ", ""),
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": "en_IN"},
            "components": components,
        },
    }
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_API_KEY}",
        "Content-Type": "application/json",
    }
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload, headers=headers) as resp:
            return await resp.json()


async def send_order_confirmed(to: str, name: str, order_id: str, product_name: str, amount: float):
    return await send_whatsapp_template(to, "order_confirmed", [{
        "type": "body",
        "parameters": [
            {"type": "text", "text": name},
            {"type": "text", "text": order_id},
            {"type": "text", "text": product_name},
            {"type": "text", "text": f"₹{amount:,.0f}"},
        ],
    }])


async def send_order_shipped(to: str, name: str, order_id: str, courier: str, tracking: str, eta: str):
    return await send_whatsapp_template(to, "order_shipped", [{
        "type": "body",
        "parameters": [
            {"type": "text", "text": name},
            {"type": "text", "text": order_id},
            {"type": "text", "text": courier},
            {"type": "text", "text": tracking},
            {"type": "text", "text": eta},
        ],
    }])


async def send_order_delivered(to: str, name: str, review_link: str):
    return await send_whatsapp_template(to, "delivered", [{
        "type": "body",
        "parameters": [
            {"type": "text", "text": name},
            {"type": "text", "text": review_link},
        ],
    }])


async def send_cart_recovery(to: str, name: str, product_name: str, cart_link: str):
    return await send_whatsapp_template(to, "cart_recovery", [{
        "type": "body",
        "parameters": [
            {"type": "text", "text": name},
            {"type": "text", "text": product_name},
            {"type": "text", "text": cart_link},
        ],
    }])


async def send_daily_report_admin(revenue: float, orders: int, delivered: int, returns: int,
                                   top_product: str, report_link: str, date: str):
    return await send_whatsapp_template(
        _ADMIN_PHONE,
        "daily_report",
        [{
            "type": "body",
            "parameters": [
                {"type": "text", "text": date},
                {"type": "text", "text": f"₹{revenue:,.0f}"},
                {"type": "text", "text": str(orders)},
                {"type": "text", "text": str(delivered)},
                {"type": "text", "text": str(returns)},
                {"type": "text", "text": top_product},
                {"type": "text", "text": report_link},
            ],
        }]
    )


async def send_unsold_alert_admin(count: int, amount: float, dashboard_link: str):
    return await send_whatsapp_template(
        _ADMIN_PHONE,
        "unsold_alert",
        [{
            "type": "body",
            "parameters": [
                {"type": "text", "text": str(count)},
                {"type": "text", "text": f"₹{amount:,.0f}"},
                {"type": "text", "text": dashboard_link},
            ],
        }]
    )