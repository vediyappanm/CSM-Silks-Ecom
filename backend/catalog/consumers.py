from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

from .realtime import ADMIN_CATALOG_GROUP, CATALOG_GROUP


class CatalogRealtimeConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user") or AnonymousUser()
        self.groups_to_join: list[str] = []

        if not self.user.is_authenticated:
            await self.close(code=4401)
            return

        self.groups_to_join.append(CATALOG_GROUP)
        if await self.user_is_admin():
            self.groups_to_join.append(ADMIN_CATALOG_GROUP)

        for group in self.groups_to_join:
            await self.channel_layer.group_add(group, self.channel_name)

        await self.accept(subprotocol="csm-token" if "csm-token" in (self.scope.get("subprotocols") or []) else None)
        await self.send_json({"type": "connection", "status": "connected", "scope": "catalog"})

    async def disconnect(self, _code):
        for group in getattr(self, "groups_to_join", []):
            await self.channel_layer.group_discard(group, self.channel_name)

    async def receive_json(self, content, **_kwargs):
        if content.get("type") == "ping":
            await self.send_json({"type": "pong"})

    async def catalog_event(self, event):
        await self.send_json(event["payload"])

    @database_sync_to_async
    def user_is_admin(self) -> bool:
        return bool(getattr(self.user, "is_staff_admin", False) or self.user.is_staff)
