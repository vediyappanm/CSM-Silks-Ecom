from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from catalog.models import Category, Product, ProductVariant

User = get_user_model()


class CartStockTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="+919811112222",
            phone="+919811112222",
            password="customer123",
            is_verified=True,
            role="customer",
        )
        category = Category.objects.create(name="Kanjivaram", slug="kanjivaram", gender="women")
        self.product = Product.objects.create(
            name="Cart Stock Saree",
            slug="cart-stock-saree",
            category=category,
            gender="women",
            base_price=2500,
            base_mrp=3000,
            is_active=True,
        )
        self.variant = ProductVariant.objects.create(
            product=self.product,
            sku="CART-STOCK-1",
            price=2500,
            mrp=3000,
            stock_qty=2,
            reserved_qty=0,
            is_active=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_existing_cart_line_cannot_exceed_available_stock(self):
        first = self.client.post("/api/cart", {"variant_id": self.variant.id, "quantity": 1}, format="json")
        self.assertEqual(first.status_code, 200)

        second = self.client.post("/api/cart", {"variant_id": self.variant.id, "quantity": 2}, format="json")

        self.assertEqual(second.status_code, 400)
        self.assertEqual(second.json()["detail"], "Only 2 units available")
        cart = self.client.get("/api/cart").json()
        self.assertEqual(cart["items"][0]["quantity"], 1)

    def test_cart_response_reports_live_stock_issues(self):
        self.client.post("/api/cart", {"variant_id": self.variant.id, "quantity": 2}, format="json")
        self.variant.stock_qty = 1
        self.variant.save(update_fields=["stock_qty", "updated_at"])

        response = self.client.get("/api/cart")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["has_stock_issues"])
        self.assertEqual(body["stock_issues"][0]["variant_id"], self.variant.id)
        self.assertEqual(body["stock_issues"][0]["available_qty"], 1)
        self.assertEqual(body["items"][0]["stock_status"], "insufficient")
        self.assertEqual(body["items"][0]["variant_available_qty"], 1)
