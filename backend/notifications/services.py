from __future__ import annotations

import html
import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings

from .models import Notification


class NotificationDeliveryError(RuntimeError):
    pass


def resend_configured() -> bool:
    return bool(settings.NOTIFICATION_EMAIL_ENABLED and settings.RESEND_API_KEY and settings.RESEND_FROM_EMAIL)


def gupshup_configured() -> bool:
    return bool(settings.WHATSAPP_ENABLED and settings.GUPSHUP_API_KEY and settings.GUPSHUP_SOURCE_PHONE and settings.GUPSHUP_APP_NAME)


def send_resend_email(*, to_email: str, subject: str, html_body: str, timeout: int = 15) -> dict:
    if not resend_configured():
        raise NotificationDeliveryError("Resend email delivery is not configured")
    request = Request(
        "https://api.resend.com/emails",
        data=json.dumps(
            {
                "from": settings.RESEND_FROM_EMAIL,
                "to": [to_email],
                "subject": subject,
                "html": html_body,
            }
        ).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
    except HTTPError as exc:
        details = exc.read().decode("utf-8", errors="ignore")
        raise NotificationDeliveryError(f"Resend HTTP {exc.code}: {details[:250]}") from exc
    except URLError as exc:
        raise NotificationDeliveryError(f"Resend connection failed: {exc.reason}") from exc
    except TimeoutError as exc:
        raise NotificationDeliveryError("Resend request timed out") from exc
    try:
        return json.loads(raw or "{}")
    except json.JSONDecodeError as exc:
        raise NotificationDeliveryError("Resend returned invalid JSON") from exc


def send_notification_email(notification: Notification) -> Notification:
    user_email = (notification.user.email or "").strip()
    if not user_email or not resend_configured():
        return notification
    html_body = (
        "<div style=\"font-family:Arial,sans-serif;color:#1f2937;line-height:1.5\">"
        f"<h2 style=\"margin:0 0 12px\">{html.escape(notification.title)}</h2>"
        f"<p>{html.escape(notification.body)}</p>"
        "<p style=\"color:#667085;font-size:13px\">CSM Silks</p>"
        "</div>"
    )
    try:
        result = send_resend_email(to_email=user_email, subject=notification.title, html_body=html_body)
    except NotificationDeliveryError as exc:
        notification.data = {**(notification.data or {}), "email_error": str(exc)}
        notification.save(update_fields=["data"])
        return notification
    notification.email_sent = True
    notification.data = {
        **(notification.data or {}),
        "email_provider": "resend",
        "email_id": result.get("id", ""),
    }
    notification.save(update_fields=["email_sent", "data"])
    return notification


def send_gupshup_whatsapp(*, to_phone: str, body: str, timeout: int = 15) -> dict:
    if not gupshup_configured():
        raise NotificationDeliveryError("Gupshup WhatsApp delivery is not configured")
    payload = {
        "channel": "whatsapp",
        "source": settings.GUPSHUP_SOURCE_PHONE,
        "destination": "".join(char for char in str(to_phone or "") if char.isdigit()),
        "src.name": settings.GUPSHUP_APP_NAME,
        "message": json.dumps({"type": "text", "text": body}),
    }
    request = Request(
        "https://api.gupshup.io/wa/api/v1/msg",
        data=urlencode(payload).encode("utf-8"),
        headers={
            "accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded",
            "apikey": settings.GUPSHUP_API_KEY,
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
    except HTTPError as exc:
        details = exc.read().decode("utf-8", errors="ignore")
        raise NotificationDeliveryError(f"Gupshup HTTP {exc.code}: {details[:250]}") from exc
    except URLError as exc:
        raise NotificationDeliveryError(f"Gupshup connection failed: {exc.reason}") from exc
    except TimeoutError as exc:
        raise NotificationDeliveryError("Gupshup request timed out") from exc
    try:
        return json.loads(raw or "{}")
    except json.JSONDecodeError as exc:
        raise NotificationDeliveryError("Gupshup returned invalid JSON") from exc


def send_notification_whatsapp(notification: Notification) -> Notification:
    user_phone = (notification.user.phone or "").strip()
    if not user_phone or not gupshup_configured():
        return notification
    try:
        result = send_gupshup_whatsapp(to_phone=user_phone, body=f"{notification.title}: {notification.body}")
    except NotificationDeliveryError as exc:
        notification.data = {**(notification.data or {}), "whatsapp_error": str(exc)}
        notification.save(update_fields=["data"])
        return notification
    notification.wa_sent = True
    notification.data = {
        **(notification.data or {}),
        "whatsapp_provider": "gupshup",
        "whatsapp_response": result,
    }
    notification.save(update_fields=["wa_sent", "data"])
    return notification


def create_notification(*, user, title: str, body: str, notification_type: str, data: dict | None = None) -> Notification:
    notification = Notification.objects.create(
        user=user,
        title=title,
        body=body,
        notification_type=notification_type,
        data=data or {},
    )
    send_notification_email(notification)
    send_notification_whatsapp(notification)
    return notification
