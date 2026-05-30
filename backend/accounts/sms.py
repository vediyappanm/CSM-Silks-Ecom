from __future__ import annotations

from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
import base64
import json

from django.conf import settings


class SMSDeliveryError(RuntimeError):
    pass


def twilio_configured() -> bool:
    has_auth = bool(
        (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN)
        or (settings.TWILIO_API_KEY_SID and settings.TWILIO_API_KEY_SECRET and settings.TWILIO_ACCOUNT_SID)
    )
    has_sender = bool(settings.TWILIO_FROM_PHONE or settings.TWILIO_MESSAGING_SERVICE_SID)
    return bool(settings.SMS_OTP_ENABLED and has_auth and has_sender)


def _twilio_basic_auth() -> str:
    if settings.TWILIO_API_KEY_SID and settings.TWILIO_API_KEY_SECRET:
        username = settings.TWILIO_API_KEY_SID
        password = settings.TWILIO_API_KEY_SECRET
    else:
        username = settings.TWILIO_ACCOUNT_SID
        password = settings.TWILIO_AUTH_TOKEN
    return base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("ascii")


def send_twilio_sms(*, to_phone: str, body: str, timeout: int = 15) -> dict:
    if not twilio_configured():
        raise SMSDeliveryError("Twilio SMS delivery is not configured")
    payload = {"To": to_phone, "Body": body}
    if settings.TWILIO_MESSAGING_SERVICE_SID:
        payload["MessagingServiceSid"] = settings.TWILIO_MESSAGING_SERVICE_SID
    else:
        payload["From"] = settings.TWILIO_FROM_PHONE
    request = Request(
        f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json",
        data=urlencode(payload).encode("utf-8"),
        headers={
            "Authorization": f"Basic {_twilio_basic_auth()}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
    except HTTPError as exc:
        details = exc.read().decode("utf-8", errors="ignore")
        raise SMSDeliveryError(f"Twilio HTTP {exc.code}: {details[:250]}") from exc
    except URLError as exc:
        raise SMSDeliveryError(f"Twilio connection failed: {exc.reason}") from exc
    except TimeoutError as exc:
        raise SMSDeliveryError("Twilio request timed out") from exc
    try:
        return json.loads(raw or "{}")
    except json.JSONDecodeError as exc:
        raise SMSDeliveryError("Twilio returned invalid JSON") from exc


def send_otp_sms(*, phone: str, otp: str) -> dict:
    return send_twilio_sms(to_phone=phone, body=f"{otp} is your CSM Silks login OTP. It expires in {settings.OTP_TTL_MINUTES} minutes.")
