from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Address
from catalog.models import Category, Product, ProductVariant
from orders.pricing import calculate_gst, calculate_loyalty_points

User = get_user_model()


class CheckoutFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="+918888888888", phone="+918888888888", password="customer123", is_verified=True)
        self.client.force_authenticate(self.user)
        self.address = Address.objects.create(
            user=self.user,
            full_name="Test Customer",
            phone="+918888888888",
            address_line_1="12 Silk Street",
            city="Kanchipuram",
            state="Tamil Nadu",
            pin_code="631501",
        )
        category = Category.objects.create(name="Kanjivaram", slug="kanjivaram", gender="women")
        self.product = Product.objects.create(name="Royal Kanjivaram", slug="royal-kanjivaram", category=category, gender="women", base_price=Decimal("1000"), base_mrp=Decimal("1200"))
        self.variant = ProductVariant.objects.create(product=self.product, sku="CSM-KJ-TEST", color_name="Gold", color_hex="#C4923A", price=Decimal("1000"), mrp=Decimal("1200"), stock_qty=2)

    def test_gst_and_loyalty_math(self):
        cgst, sgst = calculate_gst(Decimal("10000"))
        self.assertEqual(cgst, Decimal("250.00"))
        self.assertEqual(sgst, Decimal("250.00"))
        self.assertEqual(calculate_loyalty_points(Decimal("1000")), 50)

    def test_cod_checkout_reduces_stock_and_creates_order(self):
        add_resp = self.client.post("/api/cart", {"variant_id": self.variant.id, "quantity": 1}, format="json")
        self.assertEqual(add_resp.status_code, 200)

        order_resp = self.client.post(
            "/api/orders",
            {"address_id": self.address.id, "payment_method": "cod"},
            format="json",
        )
        self.assertEqual(order_resp.status_code, 201)
        body = order_resp.json()
        self.assertEqual(body["status"], "confirmed")
        self.assertEqual(len(body["items"]), 1)

        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock_qty, 1)

        cart_resp = self.client.get("/api/cart")
        self.assertEqual(cart_resp.json()["item_count"], 0)


class ProductApiTests(TestCase):
    def test_product_listing_shape_matches_frontend(self):
        category = Category.objects.create(name="Silk Dhoti", slug="mens-dhoti", gender="men")
        product = Product.objects.create(name="Pure Silk Dhoti", slug="pure-silk-dhoti", category=category, gender="men", base_price=Decimal("4999"), base_mrp=Decimal("6499"))
        ProductVariant.objects.create(product=product, sku="CSM-MD-001", color_name="Cream", color_hex="#F5E4B8", price=Decimal("4999"), mrp=Decimal("6499"), stock_qty=4)

        resp = APIClient().get("/api/products?gender=men")
        self.assertEqual(resp.status_code, 200)
        item = resp.json()["items"][0]
        self.assertEqual(item["slug"], "pure-silk-dhoti")
        self.assertIn("badge-text", item)
        self.assertIn("variant_id", item)
