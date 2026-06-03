from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

from .models import Order
from .realtime import ADMIN_ORDERS_GROUP, order_group, user_orders_group


class OrderRealtimeConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user") or AnonymousUser()
        self.order_id = self.scope["url_route"]["kwargs"].get("order_id")
        self.groups_to_join: list[str] = []

        if not self.user.is_authenticated:
            await self.close(code=4401)
            return

        is_admin = await self.user_is_admin()
        if self.order_id and not await self.can_access_order(self.order_id, is_admin):
            await self.close(code=4403)
            return

        if is_admin:
            self.groups_to_join.append(ADMIN_ORDERS_GROUP)
        else:
            self.groups_to_join.append(user_orders_group(self.user.id))

        if self.order_id:
            self.groups_to_join.append(order_group(self.order_id))

        for group in self.groups_to_join:
            await self.channel_layer.group_add(group, self.channel_name)

        await self.accept(subprotocol="csm-token" if "csm-token" in (self.scope.get("subprotocols") or []) else None)
        await self.send_json(
            {
                "type": "connection",
                "status": "connected",
                "scope": "order" if self.order_id else "orders",
                "order_id": self.order_id,
            }
        )

    async def disconnect(self, _code):
        for group in getattr(self, "groups_to_join", []):
            await self.channel_layer.group_discard(group, self.channel_name)

    async def receive_json(self, content, **_kwargs):
        if content.get("type") == "ping":
            await self.send_json({"type": "pong"})

    async def order_event(self, event):
        await self.send_json(event["payload"])

    @database_sync_to_async
    def user_is_admin(self) -> bool:
        return bool(getattr(self.user, "is_staff_admin", False) or self.user.is_staff)

    @database_sync_to_async
    def can_access_order(self, order_id: int, is_admin: bool) -> bool:
        if is_admin:
            return Order.objects.filter(id=order_id).exists()
        return Order.objects.filter(id=order_id, user_id=self.user.id).exists()
