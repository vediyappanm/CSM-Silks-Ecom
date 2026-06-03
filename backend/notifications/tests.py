from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from .models import Notification
from .services import create_notification

User = get_user_model()


class _FakeResendResponse:
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        return b'{"id":"email_test_123"}'


class NotificationEmailTests(TestCase):
    @override_settings(
        NOTIFICATION_EMAIL_ENABLED=True,
        RESEND_API_KEY="test_resend_key",
        RESEND_FROM_EMAIL="onboarding@resend.dev",
    )
    @patch("notifications.services.urlopen", return_value=_FakeResendResponse())
    def test_notification_email_is_sent_through_resend(self, _urlopen):
        user = User.objects.create_user(
            username="email-customer",
            email="customer@example.com",
            password="customer123",
            is_verified=True,
        )

        notification = create_notification(
            user=user,
            title="Order placed",
            body="Your order was placed.",
            notification_type="order",
            data={"order_number": "CSM-TEST"},
        )

        notification.refresh_from_db()
        self.assertTrue(notification.email_sent)
        self.assertEqual(notification.data["email_provider"], "resend")
        self.assertEqual(notification.data["email_id"], "email_test_123")

    @override_settings(NOTIFICATION_EMAIL_ENABLED=False, RESEND_API_KEY="", RESEND_FROM_EMAIL="")
    def test_notification_email_stays_off_without_resend_config(self):
        user = User.objects.create_user(username="sms-only", password="customer123", is_verified=True)
        notification = create_notification(
            user=user,
            title="Order placed",
            body="Your order was placed.",
            notification_type="order",
        )
        self.assertFalse(Notification.objects.get(id=notification.id).email_sent)

    @override_settings(
        WHATSAPP_ENABLED=True,
        GUPSHUP_API_KEY="test_gupshup_key",
        GUPSHUP_SOURCE_PHONE="917000000000",
        GUPSHUP_APP_NAME="CSMSilks",
    )
    @patch("notifications.services.urlopen", return_value=_FakeResendResponse())
    def test_notification_whatsapp_is_sent_through_gupshup(self, _urlopen):
        user = User.objects.create_user(
            username="+919800001111",
            phone="+919800001111",
            password="customer123",
            is_verified=True,
        )

        notification = create_notification(
            user=user,
            title="Tracking update",
            body="Your package is out for delivery.",
            notification_type="shipping",
        )

        notification.refresh_from_db()
        self.assertTrue(notification.wa_sent)
        self.assertEqual(notification.data["whatsapp_provider"], "gupshup")


class _FakeChannelLayer:
    def __init__(self):
        self.messages = []

    async def group_send(self, group, message):
        self.messages.append((group, message))


class NotificationRealtimeTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="+919800002222",
            phone="+919800002222",
            password="customer123",
            is_verified=True,
        )

    @override_settings(NOTIFICATION_EMAIL_ENABLED=False, WHATSAPP_ENABLED=False)
    @patch("notifications.realtime.get_channel_layer")
    def test_create_notification_publishes_realtime_event(self, get_channel_layer):
        channel_layer = _FakeChannelLayer()
        get_channel_layer.return_value = channel_layer

        notification = create_notification(
            user=self.user,
            title="Order packed",
            body="Your order is packed.",
            notification_type="shipping",
            data={"order_number": "CSM-REALTIME"},
        )

        self.assertEqual(len(channel_layer.messages), 1)
        group, message = channel_layer.messages[0]
        self.assertEqual(group, f"notifications_user_{self.user.id}")
        self.assertEqual(message["payload"]["type"], "notification.created")
        self.assertEqual(message["payload"]["notification"]["id"], notification.id)
        self.assertEqual(message["payload"]["unread_count"], 1)

    @patch("notifications.realtime.get_channel_layer")
    def test_mark_read_publishes_zero_unread_count(self, get_channel_layer):
        channel_layer = _FakeChannelLayer()
        get_channel_layer.return_value = channel_layer
        Notification.objects.create(user=self.user, title="One", body="Body", notification_type="order")
        Notification.objects.create(user=self.user, title="Two", body="Body", notification_type="shipping")
        client = APIClient()
        client.force_authenticate(self.user)

        response = client.patch("/api/notifications")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(Notification.objects.filter(user=self.user, is_read=False).exists())
        self.assertEqual(len(channel_layer.messages), 1)
        group, message = channel_layer.messages[0]
        self.assertEqual(group, f"notifications_user_{self.user.id}")
        self.assertEqual(message["payload"]["type"], "notifications.read")
        self.assertEqual(message["payload"]["unread_count"], 0)

    def test_notification_list_is_paginated_and_returns_unread_count(self):
        for index in range(5):
            Notification.objects.create(
                user=self.user,
                title=f"Notification {index}",
                body="Body",
                notification_type="order",
                is_read=index < 2,
            )
        client = APIClient()
        client.force_authenticate(self.user)

        response = client.get("/api/notifications?page=2&per_page=2")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(len(body["items"]), 2)
        self.assertEqual(body["total"], 5)
        self.assertEqual(body["page"], 2)
        self.assertEqual(body["per_page"], 2)
        self.assertEqual(body["pages"], 3)
        self.assertEqual(body["unread_count"], 3)
