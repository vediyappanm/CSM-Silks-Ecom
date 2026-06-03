from __future__ import annotations

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.utils import timezone

from .models import Notification


def user_notifications_group(user_id: int) -> str:
    return f"notifications_user_{user_id}"


def serialize_notification(notification: Notification) -> dict:
    from .serializers import NotificationSerializer

    fresh = Notification.objects.select_related("user").get(id=notification.id)
    return dict(NotificationSerializer(fresh).data)


def unread_count(user_id: int) -> int:
    return Notification.objects.filter(user_id=user_id, is_read=False).count()


def publish_notification(notification: Notification, *, event_type: str = "notification.created") -> None:
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    payload = {
        "type": event_type,
        "notification": serialize_notification(notification),
        "unread_count": unread_count(notification.user_id),
        "timestamp": timezone.now().isoformat(),
    }
    async_to_sync(channel_layer.group_send)(
        user_notifications_group(notification.user_id),
        {"type": "notification.event", "payload": payload},
    )


def publish_notifications_read(user_id: int) -> None:
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    payload = {
        "type": "notifications.read",
        "unread_count": unread_count(user_id),
        "timestamp": timezone.now().isoformat(),
    }
    async_to_sync(channel_layer.group_send)(
        user_notifications_group(user_id),
        {"type": "notification.event", "payload": payload},
    )
