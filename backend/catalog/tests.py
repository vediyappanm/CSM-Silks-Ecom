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


class AdminCatalogCrudTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin",
            email="admin@csmsilks.com",
            password="admin123",
            is_staff=True,
            role="admin",
        )
        self.category = Category.objects.create(name="Kurta", slug="kurta", gender="men")
        self.product = Product.objects.create(
            name="Ivory Silk Kurta Wedding Set",
            slug="ivory-silk-kurta-wedding-set",
            category=self.category,
            gender="men",
            hook="Handwoven silk kurta for wedding celebrations",
            deal_label="Wedding special",
            base_price=8990,
            base_mrp=12990,
            is_active=True,
            is_featured=True,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="KURTA-IVORY-1",
            price=8990,
            mrp=12990,
            stock_qty=12,
            reorder_level=2,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_admin_product_detail_returns_existing_fields(self):
        response = self.client.get(f"/api/admin/products/{self.product.id}")

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["name"], "Ivory Silk Kurta Wedding Set")
        self.assertEqual(data["hook"], "Handwoven silk kurta for wedding celebrations")
        self.assertEqual(data["deal_label"], "Wedding special")
        self.assertEqual(data["is_featured"], True)
        self.assertEqual(data["is_active"], True)
        self.assertEqual(str(data["price"]), "8990.00")
        self.assertEqual(str(data["mrp"]), "12990.00")
        self.assertEqual(len(data["variants"]), 1)
        self.assertEqual(data["variants"][0]["id"], self.variant.id)
        self.assertEqual(data["variants"][0]["stock_qty"], 12)
        self.assertEqual(data["variant_id"], self.variant.id)

    def test_admin_product_detail_requires_staff(self):
        guest = APIClient()
        response = guest.get(f"/api/admin/products/{self.product.id}")
        self.assertEqual(response.status_code, 401)

    def test_admin_patch_product_and_variant_round_trip(self):
        product_response = self.client.patch(
            f"/api/admin/products/{self.product.id}",
            {
                "name": "Ivory Silk Kurta Updated",
                "hook": "Updated selling line",
                "deal_label": "Festive offer",
                "is_featured": False,
                "is_active": True,
                "base_price": "9490.00",
                "base_mrp": "13490.00",
            },
            format="json",
        )
        self.assertEqual(product_response.status_code, 200)
        variant_response = self.client.patch(
            f"/api/admin/variants/{self.variant.id}",
            {"price": "9490.00", "mrp": "13490.00", "stock_qty": 18},
            format="json",
        )
        self.assertEqual(variant_response.status_code, 200)

        detail = self.client.get(f"/api/admin/products/{self.product.id}").json()
        self.assertEqual(detail["name"], "Ivory Silk Kurta Updated")
        self.assertEqual(detail["hook"], "Updated selling line")
        self.assertEqual(detail["deal_label"], "Festive offer")
        self.assertEqual(detail["is_featured"], False)
        self.assertEqual(str(detail["price"]), "9490.00")
        self.assertEqual(str(detail["mrp"]), "13490.00")
        self.assertEqual(detail["variants"][0]["stock_qty"], 18)

    def test_admin_product_list_includes_active_flag(self):
        response = self.client.get("/api/admin/products")

        self.assertEqual(response.status_code, 200)
        items = response.json()["items"]
        row = next(item for item in items if item["id"] == self.product.id)
        self.assertEqual(row["name"], "Ivory Silk Kurta Wedding Set")
        self.assertEqual(row["is_active"], True)
        self.assertEqual(row["variant_id"], self.variant.id)
