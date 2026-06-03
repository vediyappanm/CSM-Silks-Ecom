from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from inventory.models import StockLedger

from .models import Category, Product, ProductVariant

User = get_user_model()


class _FakeChannelLayer:
    def __init__(self):
        self.messages = []

    async def group_send(self, group, message):
        self.messages.append((group, message))


class CatalogRealtimeTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="catalog-admin",
            email="catalog-admin@csmsilks.com",
            password="admin123",
            is_staff=True,
            role="admin",
        )
        self.category = Category.objects.create(name="Kanjivaram", slug="kanjivaram", gender="women")
        self.product = Product.objects.create(
            name="Realtime Silk Saree",
            slug="realtime-silk-saree",
            category=self.category,
            gender="women",
            base_price=2500,
            base_mrp=3200,
            is_active=True,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="RT-SILK-1",
            price=2500,
            mrp=3200,
            stock_qty=4,
            reorder_level=2,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    @patch("catalog.realtime.get_channel_layer")
    def test_admin_inventory_adjustment_publishes_catalog_stock_event(self, get_channel_layer):
        channel_layer = _FakeChannelLayer()
        get_channel_layer.return_value = channel_layer

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                "/api/admin/inventory",
                {"variant_id": self.variant.id, "quantity_delta": 3, "note": "QA stock receipt"},
                format="json",
            )

        self.assertEqual(response.status_code, 200)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock_qty, 7)
        self.assertEqual(StockLedger.objects.filter(variant=self.variant).count(), 1)
        groups = [group for group, _message in channel_layer.messages]
        self.assertIn("catalog_public", groups)
        self.assertIn("catalog_admin", groups)
        payload = channel_layer.messages[0][1]["payload"]
        self.assertEqual(payload["type"], "inventory.variant.updated")
        self.assertEqual(payload["product_id"], self.product.id)
        self.assertEqual(payload["variant"]["available_qty"], 7)

    @patch("catalog.realtime.get_channel_layer")
    def test_quick_create_product_publishes_catalog_create_event(self, get_channel_layer):
        channel_layer = _FakeChannelLayer()
        get_channel_layer.return_value = channel_layer

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post(
                "/api/admin/products/quick-create",
                {
                    "name": "Live Published Saree",
                    "gender": "women",
                    "category_name": "Bridal",
                    "price": "4500.00",
                    "mrp": "5200.00",
                    "stock_qty": 6,
                    "color_name": "Maroon",
                    "fabric": "Pure silk",
                },
                format="json",
            )

        self.assertEqual(response.status_code, 201)
        payload = channel_layer.messages[0][1]["payload"]
        self.assertEqual(payload["type"], "catalog.product.created")
        self.assertEqual(payload["product"]["name"], "Live Published Saree")
        self.assertEqual(payload["product"]["available_qty"], 6)
