from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

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
