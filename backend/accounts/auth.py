from __future__ import annotations

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken


class BlacklistJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        from .models import BlacklistedToken
        
        token_id = validated_token.get("jti")
        if token_id:
            if BlacklistedToken.objects.filter(token=token_id).exists():
                raise InvalidToken("Token has been blacklisted")
        
        return super().get_user(validated_token)
