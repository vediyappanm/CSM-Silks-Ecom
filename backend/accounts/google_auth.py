from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass

from django.conf import settings
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token


class GoogleAuthError(Exception):
    pass


@dataclass(frozen=True)
class GoogleProfile:
    sub: str
    email: str
    email_verified: bool
    full_name: str
    avatar_url: str


def google_oauth_configured() -> bool:
    return bool(settings.GOOGLE_OAUTH_ENABLED and settings.GOOGLE_CLIENT_ID)


def google_redirect_oauth_configured() -> bool:
    return google_oauth_configured() and bool(settings.GOOGLE_CLIENT_SECRET)


def allowed_google_redirect_uris() -> list[str]:
    path = settings.GOOGLE_OAUTH_REDIRECT_PATH
    if not path.startswith("/"):
        path = f"/{path}"
    uris: list[str] = []
    for origin in settings.CORS_ALLOWED_ORIGINS:
        uris.append(f"{origin.rstrip('/')}{path}")
    if settings.GOOGLE_OAUTH_REDIRECT_URIS:
        uris.extend(item.strip() for item in settings.GOOGLE_OAUTH_REDIRECT_URIS.split(",") if item.strip())
    return list(dict.fromkeys(uris))


def default_google_redirect_uri() -> str:
    uris = allowed_google_redirect_uris()
    return uris[0] if uris else ""


def verify_google_id_token(token: str, *, expected_nonce: str | None = None) -> GoogleProfile:
    if not google_oauth_configured():
        raise GoogleAuthError("Google sign-in is not configured")
    try:
        payload = id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        raise GoogleAuthError("Invalid Google sign-in token") from exc

    if expected_nonce and str(payload.get("nonce") or "") != expected_nonce:
        raise GoogleAuthError("Invalid Google sign-in nonce")

    return _profile_from_token_payload(payload)


def exchange_google_authorization_code(*, code: str, redirect_uri: str) -> GoogleProfile:
    if not google_redirect_oauth_configured():
        raise GoogleAuthError("Google redirect sign-in is not configured")
    if redirect_uri not in allowed_google_redirect_uris():
        raise GoogleAuthError("Invalid Google redirect URI")

    payload = urllib.parse.urlencode(
        {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }
    ).encode()
    request = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=payload,
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            body = json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode()
        raise GoogleAuthError("Google authorization exchange failed") from exc
    except urllib.error.URLError as exc:
        raise GoogleAuthError("Unable to reach Google OAuth service") from exc

    id_token_value = str(body.get("id_token") or "").strip()
    if not id_token_value:
        raise GoogleAuthError("Google did not return an id token")
    return verify_google_id_token(id_token_value)


def _profile_from_token_payload(payload: dict) -> GoogleProfile:
    issuer = str(payload.get("iss") or "")
    if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        raise GoogleAuthError("Invalid Google token issuer")

    email = str(payload.get("email") or "").strip().lower()
    if not email or not payload.get("email_verified"):
        raise GoogleAuthError("Google account email is not verified")

    sub = str(payload.get("sub") or "").strip()
    if not sub:
        raise GoogleAuthError("Google account id missing")

    return GoogleProfile(
        sub=sub,
        email=email,
        email_verified=True,
        full_name=str(payload.get("name") or "").strip(),
        avatar_url=str(payload.get("picture") or "").strip(),
    )
