from __future__ import annotations

import html
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings


class OTPEmailDeliveryError(RuntimeError):
    pass


def otp_email_configured() -> bool:
    return bool(settings.OTP_EMAIL_ENABLED and settings.RESEND_API_KEY and settings.RESEND_FROM_EMAIL)


def mask_email(email: str) -> str:
    local, _, domain = str(email or "").strip().partition("@")
    if not local or not domain:
        return ""
    if len(local) <= 2:
        masked_local = local[0] + "*"
    else:
        masked_local = f"{local[0]}{'*' * min(len(local) - 2, 5)}{local[-1]}"
    return f"{masked_local}@{domain}"


def send_otp_email(*, to_email: str, otp: str, timeout: int = 15) -> dict:
    if not otp_email_configured():
        raise OTPEmailDeliveryError("Resend OTP email delivery is not configured")
    safe_otp = html.escape(otp)
    html_body = (
        "<div style=\"font-family:Arial,sans-serif;color:#1f2937;line-height:1.55;max-width:520px\">"
        "<h2 style=\"margin:0 0 12px;color:#14100d\">Your CSM Silks OTP</h2>"
        "<p style=\"margin:0 0 16px\">Use this one-time password to continue your secure login.</p>"
        "<div style=\"font-size:28px;font-weight:800;letter-spacing:8px;color:#7a1b2d;"
        "background:#f9f6f0;border:1px solid #e3d7c5;border-radius:12px;padding:18px 22px;text-align:center\">"
        f"{safe_otp}</div>"
        f"<p style=\"margin:16px 0 0;color:#667085;font-size:13px\">This code expires in {settings.OTP_TTL_MINUTES} minutes. "
        "If you did not request it, you can safely ignore this email.</p>"
        "<p style=\"margin:18px 0 0;color:#b37e28;font-size:13px;font-weight:700\">CSM Silks</p>"
        "</div>"
    )
    request = Request(
        "https://api.resend.com/emails",
        data=json.dumps(
            {
                "from": settings.RESEND_FROM_EMAIL,
                "to": [to_email],
                "subject": "Your CSM Silks login OTP",
                "html": html_body,
            }
        ).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "CSM-Silks-Django/1.0",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
    except HTTPError as exc:
        details = exc.read().decode("utf-8", errors="ignore")
        raise OTPEmailDeliveryError(f"Resend HTTP {exc.code}: {details[:250]}") from exc
    except URLError as exc:
        raise OTPEmailDeliveryError(f"Resend connection failed: {exc.reason}") from exc
    except TimeoutError as exc:
        raise OTPEmailDeliveryError("Resend request timed out") from exc
    try:
        return json.loads(raw or "{}")
    except json.JSONDecodeError as exc:
        raise OTPEmailDeliveryError("Resend returned invalid JSON") from exc
