from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

from .realtime import user_notifications_group


class NotificationRealtimeConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user") or AnonymousUser()
        self.group_name = ""

        if not self.user.is_authenticated:
            await self.close(code=4401)
            return

        self.group_name = user_notifications_group(self.user.id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept(subprotocol="csm-token" if "csm-token" in (self.scope.get("subprotocols") or []) else None)
        await self.send_json({"type": "connection", "status": "connected", "scope": "notifications"})

    async def disconnect(self, _code):
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **_kwargs):
        if content.get("type") == "ping":
            await self.send_json({"type": "pong"})

    async def notification_event(self, event):
        await self.send_json(event["payload"])
