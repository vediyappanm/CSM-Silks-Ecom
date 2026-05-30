from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Address

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
