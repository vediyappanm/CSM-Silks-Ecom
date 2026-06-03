from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


def token_from_scope(scope) -> str:
    query = parse_qs(scope.get("query_string", b"").decode())
    token = (query.get("token") or [""])[0]
    if token:
        return token

    protocols = scope.get("subprotocols") or []
    if "csm-token" in protocols:
        token_index = protocols.index("csm-token") + 1
        if token_index < len(protocols):
            return protocols[token_index]
    return ""


@database_sync_to_async
def get_user_for_token(token: str):
    jwt_auth = JWTAuthentication()
    try:
        validated = jwt_auth.get_validated_token(token)
        return jwt_auth.get_user(validated)
    except (InvalidToken, TokenError):
        return AnonymousUser()


class JwtAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        token = token_from_scope(scope)
        scope["user"] = await get_user_for_token(token) if token else AnonymousUser()
        return await self.app(scope, receive, send)
