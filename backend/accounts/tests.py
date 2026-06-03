import json
import os
import subprocess
import sys
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.checks import run_checks
from django.test import SimpleTestCase, TestCase, override_settings
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
    def setUp(self):
        cache.clear()

    @override_settings(DEBUG=True, SMS_OTP_ENABLED=False)
    def test_send_otp_requires_real_delivery_even_in_debug(self):
        response = APIClient().post("/api/auth/otp/send", {"phone": "+91 98000 01111"}, format="json")
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("dev_otp", response.json())
        self.assertFalse(OTPChallenge.objects.filter(phone="+919800001111").exists())

    @override_settings(DEBUG=True, SMS_OTP_ENABLED=False, OTP_DEV_FALLBACK_ENABLED=True)
    def test_send_otp_dev_fallback_requires_explicit_opt_in(self):
        response = APIClient().post("/api/auth/otp/send", {"phone": "+91 98000 01111"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()["sms_sent"])
        self.assertIn("dev_otp", response.json())
        self.assertIn("development", response.json()["delivery_channels"])
        self.assertTrue(OTPChallenge.objects.filter(phone="+919800001111").exists())

    @override_settings(
        DEBUG=True,
        SMS_OTP_ENABLED=False,
        OTP_EMAIL_ENABLED=True,
        RESEND_API_KEY="test_resend_key",
        RESEND_FROM_EMAIL="onboarding@resend.dev",
    )
    def test_send_otp_can_send_realtime_email_with_resend(self):
        from unittest.mock import patch

        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self):
                return b'{"id":"email_otp_test"}'

        with patch("accounts.email.urlopen", return_value=FakeResponse()):
            response = APIClient().post(
                "/api/auth/otp/send",
                {"phone": "+91 98000 05555", "email": "customer@example.com"},
                format="json",
            )

        body = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertTrue(body["email_sent"])
        self.assertIn("email", body["delivery_channels"])
        self.assertNotIn("dev_otp", body)

    @override_settings(
        DEBUG=True,
        SMS_OTP_ENABLED=False,
        OTP_EMAIL_ENABLED=True,
        RESEND_API_KEY="test_resend_key",
        RESEND_FROM_EMAIL="onboarding@resend.dev",
    )
    def test_send_login_otp_uses_saved_customer_email(self):
        from unittest.mock import patch

        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self):
                return b'{"id":"email_saved_test"}'

        User.objects.create_user(username="+919800006666", phone="+919800006666", email="saved@example.com")
        with patch("accounts.email.urlopen", return_value=FakeResponse()):
            response = APIClient().post("/api/auth/otp/send", {"phone": "+91 98000 06666"}, format="json")

        body = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertTrue(body["email_sent"])
        self.assertEqual(body["email_masked"], "s***d@example.com")

    @override_settings(DEBUG=False, SMS_OTP_ENABLED=False, OTP_EMAIL_ENABLED=False)
    def test_send_otp_requires_real_delivery_outside_debug(self):
        response = APIClient().post("/api/auth/otp/send", {"phone": "+91 98000 07777"}, format="json")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["detail"], "OTP delivery is not configured. Enable SMS or email OTP before customer login.")

    @override_settings(
        DEBUG=True,
        SMS_OTP_ENABLED=False,
        OTP_EMAIL_ENABLED=True,
        RESEND_API_KEY="test_resend_key",
        RESEND_FROM_EMAIL="onboarding@resend.dev",
    )
    def test_verify_otp_can_complete_customer_signup_profile(self):
        from unittest.mock import patch

        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self):
                return b'{"id":"email_signup_test"}'

        client = APIClient()
        with patch("accounts.views.random.randint", return_value=123456), patch("accounts.email.urlopen", return_value=FakeResponse()):
            send_response = client.post(
                "/api/auth/otp/send",
                {"phone": "+91 98000 02222", "email": "priya@example.com"},
                format="json",
            )
        self.assertEqual(send_response.status_code, 200)

        response = client.post(
            "/api/auth/otp/verify",
            {
                "phone": "+91 98000 02222",
                "otp": "123456",
                "full_name": "Priya Customer",
                "email": "PRIYA@example.com",
                "wa_opted_in": True,
                "push_opted_in": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        user = User.objects.get(phone="+919800002222")
        self.assertEqual(user.full_name, "Priya Customer")
        self.assertEqual(user.email, "priya@example.com")
        self.assertTrue(user.wa_opted_in)
        self.assertFalse(user.push_opted_in)
        self.assertEqual(response.json()["user"]["full_name"], "Priya Customer")

    @override_settings(
        DEBUG=True,
        SMS_OTP_ENABLED=False,
        OTP_EMAIL_ENABLED=True,
        RESEND_API_KEY="test_resend_key",
        RESEND_FROM_EMAIL="onboarding@resend.dev",
    )
    def test_verify_otp_rejects_email_owned_by_another_customer(self):
        from unittest.mock import patch

        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self):
                return b'{"id":"email_conflict_test"}'

        User.objects.create_user(username="+919800003333", phone="+919800003333", email="taken@example.com")
        client = APIClient()
        with patch("accounts.views.random.randint", return_value=654321), patch("accounts.email.urlopen", return_value=FakeResponse()):
            send_response = client.post(
                "/api/auth/otp/send",
                {"phone": "+91 98000 04444", "email": "new@example.com"},
                format="json",
            )
        self.assertEqual(send_response.status_code, 200)

        response = client.post(
            "/api/auth/otp/verify",
            {
                "phone": "+91 98000 04444",
                "otp": "654321",
                "email": "taken@example.com",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Email already belongs to another account")

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
            response = APIClient().post("/api/auth/otp/send", {"phone": "9800001111"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["sms_sent"])
        self.assertNotIn("dev_otp", response.json())
        self.assertTrue(OTPChallenge.objects.filter(phone="+919800001111").exists())


class DeploymentFallbackCheckTests(SimpleTestCase):
    @override_settings(DEBUG=False, OTP_DEV_FALLBACK_ENABLED=True, PAYMENT_DEV_FALLBACK_ENABLED=False)
    def test_deploy_check_blocks_otp_dev_fallback(self):
        errors = run_checks(include_deployment_checks=True)

        self.assertTrue(any(error.id == "csm.E001" for error in errors))

    @override_settings(DEBUG=False, OTP_DEV_FALLBACK_ENABLED=False, PAYMENT_DEV_FALLBACK_ENABLED=True)
    def test_deploy_check_blocks_payment_dev_fallback(self):
        errors = run_checks(include_deployment_checks=True)

        self.assertTrue(any(error.id == "csm.E002" for error in errors))

    @override_settings(DEBUG=False, APP_ENV="production", DATABASES={"default": {"ENGINE": "django.db.backends.sqlite3"}})
    def test_deploy_check_blocks_sqlite_database_in_production(self):
        errors = run_checks(include_deployment_checks=True)

        self.assertTrue(any(error.id == "csm.E003" for error in errors))

    @override_settings(DEBUG=False, APP_ENV="production", CHANNEL_LAYER_BACKEND="memory", REDIS_URL="", CELERY_BROKER_URL="")
    def test_deploy_check_blocks_non_redis_realtime_in_production(self):
        errors = run_checks(include_deployment_checks=True)

        self.assertTrue(any(error.id == "csm.E004" for error in errors))

    @override_settings(
        DEBUG=False,
        APP_ENV="production",
        RAZORPAY_KEY_ID="",
        RAZORPAY_KEY_SECRET="",
        RAZORPAY_WEBHOOK_SECRET="",
    )
    def test_deploy_check_requires_razorpay_credentials_and_webhook_secret(self):
        errors = run_checks(include_deployment_checks=True)

        self.assertTrue(any(error.id == "csm.E005" for error in errors))

    @override_settings(
        DEBUG=False,
        APP_ENV="production",
        SMS_OTP_ENABLED=False,
        OTP_EMAIL_ENABLED=False,
        TWILIO_ACCOUNT_SID="",
        TWILIO_AUTH_TOKEN="",
        TWILIO_FROM_PHONE="",
        RESEND_API_KEY="",
        RESEND_FROM_EMAIL="",
    )
    def test_deploy_check_requires_at_least_one_live_otp_channel(self):
        errors = run_checks(include_deployment_checks=True)

        self.assertTrue(any(error.id == "csm.E006" for error in errors))

    @override_settings(
        DEBUG=False,
        APP_ENV="production",
        NOTIFICATION_EMAIL_ENABLED=False,
        WHATSAPP_ENABLED=False,
        RESEND_API_KEY="",
        GUPSHUP_API_KEY="",
        GUPSHUP_SOURCE_PHONE="",
        GUPSHUP_APP_NAME="",
    )
    def test_deploy_check_requires_customer_notification_channel(self):
        errors = run_checks(include_deployment_checks=True)

        self.assertTrue(any(error.id == "csm.E007" for error in errors))

    @override_settings(
        DEBUG=False,
        APP_ENV="production",
        DEFAULT_COURIER_PROVIDER="shiprocket",
        SHIPROCKET_EMAIL="",
        SHIPROCKET_PASSWORD="",
        SHIPROCKET_WEBHOOK_SECRET="",
    )
    def test_deploy_check_requires_shiprocket_credentials_when_enabled(self):
        errors = run_checks(include_deployment_checks=True)

        self.assertTrue(any(error.id == "csm.E008" for error in errors))


class ProductionSecuritySettingsTests(SimpleTestCase):
    def test_production_environment_defaults_to_https_security_settings(self):
        root = Path(__file__).resolve().parents[2]
        command = (
            "import json;"
            "from django.conf import settings;"
            "from django.core.checks import run_checks;"
            "print(json.dumps({"
            "'SECURE_SSL_REDIRECT': settings.SECURE_SSL_REDIRECT,"
            "'SESSION_COOKIE_SECURE': settings.SESSION_COOKIE_SECURE,"
            "'CSRF_COOKIE_SECURE': settings.CSRF_COOKIE_SECURE,"
            "'SECURE_HSTS_SECONDS': settings.SECURE_HSTS_SECONDS,"
            "'SECURE_HSTS_INCLUDE_SUBDOMAINS': settings.SECURE_HSTS_INCLUDE_SUBDOMAINS,"
            "'SECURE_HSTS_PRELOAD': settings.SECURE_HSTS_PRELOAD,"
            "'CSRF_TRUSTED_ORIGINS': settings.CSRF_TRUSTED_ORIGINS,"
            "'check_ids': [message.id for message in run_checks(include_deployment_checks=True)]"
            "}))"
        )
        env = os.environ.copy()
        env.update(
            {
                "APP_ENV": "production",
                "DEBUG": "False",
                "SECRET_KEY": "prod-test-secret-key-with-more-than-fifty-unique-characters-12345",
                "ALLOWED_HOSTS": "csmsilks.example.com",
                "CORS_ALLOWED_ORIGINS": "https://csmsilks.example.com",
                "DATABASE_URL": "postgres://csm:test@db:5432/csm_silks",
                "REDIS_URL": "redis://redis:6379/0",
                "CELERY_BROKER_URL": "redis://redis:6379/0",
                "CHANNEL_LAYER_BACKEND": "redis",
                "RAZORPAY_KEY_ID": "rzp_live_test",
                "RAZORPAY_KEY_SECRET": "razorpay-secret",
                "RAZORPAY_WEBHOOK_SECRET": "razorpay-webhook-secret",
                "OTP_EMAIL_ENABLED": "True",
                "RESEND_API_KEY": "resend-secret",
                "RESEND_FROM_EMAIL": "orders@csmsilks.example.com",
                "NOTIFICATION_EMAIL_ENABLED": "True",
                "DEFAULT_COURIER_PROVIDER": "manual",
                "OTP_DEV_FALLBACK_ENABLED": "False",
                "PAYMENT_DEV_FALLBACK_ENABLED": "False",
            }
        )

        result = subprocess.run(
            [sys.executable, str(root / "backend" / "manage.py"), "shell", "-c", command],
            cwd=root,
            env=env,
            capture_output=True,
            text=True,
            check=True,
        )
        settings_snapshot = json.loads(result.stdout.strip().splitlines()[-1])

        self.assertTrue(settings_snapshot["SECURE_SSL_REDIRECT"])
        self.assertTrue(settings_snapshot["SESSION_COOKIE_SECURE"])
        self.assertTrue(settings_snapshot["CSRF_COOKIE_SECURE"])
        self.assertGreaterEqual(settings_snapshot["SECURE_HSTS_SECONDS"], 31536000)
        self.assertTrue(settings_snapshot["SECURE_HSTS_INCLUDE_SUBDOMAINS"])
        self.assertTrue(settings_snapshot["SECURE_HSTS_PRELOAD"])
        self.assertEqual(settings_snapshot["CSRF_TRUSTED_ORIGINS"], ["https://csmsilks.example.com"])
        for warning_id in ["security.W004", "security.W008", "security.W009", "security.W012", "security.W016", "security.W018"]:
            self.assertNotIn(warning_id, settings_snapshot["check_ids"])
        self.assertEqual(
            {warning_id for warning_id in settings_snapshot["check_ids"] if warning_id.startswith("drf_spectacular.")},
            set(),
        )
