from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import Address, OTPChallenge

User = get_user_model()


class AddressApiTests(TestCase):
    def test_customer_can_create_address_with_frontend_alias_fields(self):
        user = User.objects.create_user(username="+919800001111", phone="+919800001111")
        client = APIClient()
        client.force_authenticate(user)

        response = client.post(
            "/api/addresses",
            {
                "label": "Home",
                "full_name": "Alias Customer",
                "phone": "+919800001111",
                "address_line1": "14 Silk Bazaar",
                "address_line2": "Near Temple Road",
                "city": "Kanchipuram",
                "state": "Tamil Nadu",
                "pincode": "631501",
                "country": "India",
                "is_default": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        address = Address.objects.get(user=user)
        self.assertEqual(address.address_line_1, "14 Silk Bazaar")
        self.assertEqual(address.pin_code, "631501")
        self.assertEqual(response.json()["address_line_1"], "14 Silk Bazaar")


class OTPApiTests(TestCase):
    @override_settings(DEBUG=True, SMS_OTP_ENABLED=False)
    def test_send_otp_returns_dev_otp_without_sms_in_debug(self):
        response = APIClient().post("/api/auth/otp/send", {"phone": "+91 98000 01111"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["sms_sent"])
        self.assertIn("dev_otp", response.json())
        self.assertTrue(OTPChallenge.objects.filter(phone="+919800001111").exists())

    @override_settings(
        DEBUG=True,
        SMS_OTP_ENABLED=True,
        TWILIO_ACCOUNT_SID="ACtest",
        TWILIO_AUTH_TOKEN="token",
        TWILIO_FROM_PHONE="+15005550006",
    )
    def test_send_otp_uses_twilio_when_configured(self):
        from unittest.mock import patch

        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self):
                return b'{"sid":"SMtest123"}'

        with patch("accounts.sms.urlopen", return_value=FakeResponse()):
            response = APIClient().post("/api/auth/otp/send", {"phone": "+919800001111"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["sms_sent"])
        self.assertEqual(response.json()["sms_id"], "SMtest123")
