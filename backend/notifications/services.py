from __future__ import annotations

import html
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings

from .models import Notification


class NotificationDeliveryError(RuntimeError):
    pass


def resend_configured() -> bool:
    return bool(settings.NOTIFICATION_EMAIL_ENABLED and settings.RESEND_API_KEY and settings.RESEND_FROM_EMAIL)


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


def create_notification(*, user, title: str, body: str, notification_type: str, data: dict | None = None) -> Notification:
    notification = Notification.objects.create(
        user=user,
        title=title,
        body=body,
        notification_type=notification_type,
        data=data or {},
    )
    send_notification_email(notification)
    return notification
