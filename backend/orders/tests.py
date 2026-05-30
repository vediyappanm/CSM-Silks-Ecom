from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Address
from analytics.models import AdminAuditLog
from catalog.models import Category, Product, ProductVariant
from inventory.models import StockReservation
from notifications.models import Notification
from orders.pricing import calculate_gst, calculate_loyalty_points
from orders.models import Order
from shipping.models import ShipmentEvent

User = get_user_model()


@override_settings(RAZORPAY_KEY_ID="", RAZORPAY_KEY_SECRET="", RAZORPAY_WEBHOOK_SECRET="")
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
        self.assertTrue(ShipmentEvent.objects.filter(order_id=body["id"], status=ShipmentEvent.Status.ORDER_PLACED).exists())

        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock_qty, 1)

        cart_resp = self.client.get("/api/cart")
        self.assertEqual(cart_resp.json()["item_count"], 0)

    def test_prepaid_payment_confirms_order_and_releases_stock_reservation(self):
        self.client.post("/api/cart", {"variant_id": self.variant.id, "quantity": 1}, format="json")
        order_resp = self.client.post(
            "/api/orders",
            {"address_id": self.address.id, "payment_method": "razorpay"},
            format="json",
        )
        self.assertEqual(order_resp.status_code, 201)
        order_id = order_resp.json()["id"]
        self.assertEqual(order_resp.json()["status"], "payment_pending")
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.reserved_qty, 1)

        gateway_resp = self.client.post("/api/payments/razorpay/order", {"order_id": order_id}, format="json")
        self.assertEqual(gateway_resp.status_code, 200)
        verify_resp = self.client.post(
            "/api/payments/razorpay/verify",
            {
                "razorpay_order_id": gateway_resp.json()["razorpay_order_id"],
                "razorpay_payment_id": "pay_test_123",
                "razorpay_signature": "dev",
            },
            format="json",
        )
        self.assertEqual(verify_resp.status_code, 200)

        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock_qty, 1)
        self.assertEqual(self.variant.reserved_qty, 0)
        self.assertFalse(StockReservation.objects.filter(order_number=Order.objects.get(id=order_id).order_number, released_at__isnull=True).exists())

    def test_admin_shipment_marks_order_delivered_and_notifies_customer(self):
        self.client.post("/api/cart", {"variant_id": self.variant.id, "quantity": 1}, format="json")
        order_resp = self.client.post("/api/orders", {"address_id": self.address.id, "payment_method": "cod"}, format="json")
        order_id = order_resp.json()["id"]
        admin = User.objects.create_user(username="admin", email="admin@example.com", password="admin123", is_staff=True)
        self.client.force_authenticate(admin)

        shipment_resp = self.client.post(
            "/api/admin/shipments",
            {
                "order": order_id,
                "provider": "manual",
                "awb_number": "AWB123",
                "tracking_url": "https://track.example.com/AWB123",
                "status": "delivered",
                "event_location": "Kanchipuram hub",
                "event_note": "Delivered to customer.",
            },
            format="json",
        )
        self.assertEqual(shipment_resp.status_code, 201)
        order = Order.objects.get(id=order_id)
        self.assertEqual(order.status, Order.Status.DELIVERED)
        self.assertEqual(order.tracking_number, "AWB123")
        self.assertTrue(ShipmentEvent.objects.filter(order=order, status=ShipmentEvent.Status.DELIVERED, location="Kanchipuram hub").exists())
        self.assertTrue(Notification.objects.filter(user=self.user, notification_type="shipping").exists())

        detail_resp = self.client.get(f"/api/admin/orders?status={Order.Status.DELIVERED}")
        tracking_events = detail_resp.json()["items"][0]["tracking_events"]
        self.assertTrue(any(event["status"] == ShipmentEvent.Status.DELIVERED for event in tracking_events))

    def test_public_tracking_lookup_requires_order_or_awb_and_phone_match(self):
        self.client.post("/api/cart", {"variant_id": self.variant.id, "quantity": 1}, format="json")
        order_resp = self.client.post("/api/orders", {"address_id": self.address.id, "payment_method": "cod"}, format="json")
        order_id = order_resp.json()["id"]
        admin = User.objects.create_user(username="shipment-admin", email="ship@example.com", password="admin123", is_staff=True)
        self.client.force_authenticate(admin)
        self.client.post(
            "/api/admin/shipments",
            {
                "order": order_id,
                "provider": "manual",
                "awb_number": "AWB-PUBLIC-1",
                "tracking_url": "https://track.example.com/AWB-PUBLIC-1",
                "status": "in_transit",
            },
            format="json",
        )

        public_client = APIClient()
        by_order = public_client.get(f"/api/orders/track?identifier={order_resp.json()['order_number']}&phone=+918888888888")
        self.assertEqual(by_order.status_code, 200)
        self.assertEqual(by_order.json()["tracking_number"], "AWB-PUBLIC-1")
        self.assertTrue(any(event["status"] == ShipmentEvent.Status.IN_TRANSIT for event in by_order.json()["tracking_events"]))

        wrong_phone = public_client.get(f"/api/orders/track?identifier=AWB-PUBLIC-1&phone=+919999999999")
        self.assertEqual(wrong_phone.status_code, 404)

    def test_admin_workflow_creates_label_and_handles_rto(self):
        self.client.post("/api/cart", {"variant_id": self.variant.id, "quantity": 1}, format="json")
        order_resp = self.client.post("/api/orders", {"address_id": self.address.id, "payment_method": "cod"}, format="json")
        order_id = order_resp.json()["id"]
        admin = User.objects.create_user(username="workflow-admin", email="workflow@example.com", password="admin123", is_staff=True)
        self.client.force_authenticate(admin)

        label_resp = self.client.post(
            f"/api/admin/orders/{order_id}/workflow",
            {"action": "create_label", "provider": "manual"},
            format="json",
        )
        self.assertEqual(label_resp.status_code, 200)
        self.assertEqual(label_resp.json()["status"], Order.Status.PACKED)
        order = Order.objects.get(id=order_id)
        self.assertTrue(order.tracking_number.startswith("CSM"))
        self.assertTrue(order.shipment.label_url)
        self.assertTrue(AdminAuditLog.objects.filter(action="order.create_label", entity_id=str(order.id)).exists())

        rto_resp = self.client.post(
            f"/api/admin/orders/{order_id}/workflow",
            {"action": "rto_initiated", "note": "Customer refused delivery", "location": "Chennai hub"},
            format="json",
        )
        self.assertEqual(rto_resp.status_code, 200)
        self.assertEqual(rto_resp.json()["status"], Order.Status.RTO_INITIATED)
        self.assertTrue(ShipmentEvent.objects.filter(order_id=order_id, status=ShipmentEvent.Status.RTO_INITIATED, location="Chennai hub").exists())

        label_download = self.client.get(f"/api/admin/shipments/{order.shipment.id}/label")
        self.assertEqual(label_download.status_code, 200)
        self.assertIn(order.order_number, label_download.content.decode())

    @override_settings(SHIPROCKET_WEBHOOK_SECRET="testsecret")
    def test_courier_webhook_updates_tracking_and_ignores_duplicate_event(self):
        self.client.post("/api/cart", {"variant_id": self.variant.id, "quantity": 1}, format="json")
        order_resp = self.client.post("/api/orders", {"address_id": self.address.id, "payment_method": "cod"}, format="json")
        order_id = order_resp.json()["id"]
        admin = User.objects.create_user(username="webhook-admin", email="webhook@example.com", password="admin123", is_staff=True)
        self.client.force_authenticate(admin)
        self.client.post(
            f"/api/admin/orders/{order_id}/workflow",
            {"action": "create_label", "provider": "manual"},
            format="json",
        )
        order = Order.objects.get(id=order_id)
        awb = order.shipment.awb_number

        public_client = APIClient()
        payload = {
            "awb_code": awb,
            "current_status": "Out For Delivery",
            "location": "Chennai last-mile hub",
            "remarks": "Package is with delivery partner.",
        }
        webhook_resp = public_client.post("/api/shipping/webhook", payload, format="json", HTTP_X_SHIPROCKET_WEBHOOK_SECRET="testsecret")
        self.assertEqual(webhook_resp.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.OUT_FOR_DELIVERY)
        self.assertTrue(ShipmentEvent.objects.filter(order=order, status=ShipmentEvent.Status.OUT_FOR_DELIVERY, location="Chennai last-mile hub").exists())
        event_count = ShipmentEvent.objects.filter(order=order).count()

        duplicate_resp = public_client.post("/api/shipping/webhook", payload, format="json", HTTP_X_SHIPROCKET_WEBHOOK_SECRET="testsecret")
        self.assertEqual(duplicate_resp.status_code, 200)
        self.assertEqual(ShipmentEvent.objects.filter(order=order).count(), event_count)
        self.assertTrue(AdminAuditLog.objects.filter(action="shipping.webhook", entity_id=str(order.shipment.id)).exists())
        audit_resp = self.client.get("/api/admin/audit-logs")
        self.assertEqual(audit_resp.status_code, 200)
        self.assertTrue(any(log["action"] == "shipping.webhook" for log in audit_resp.json()))

    def test_customer_can_download_invoice(self):
        self.client.post("/api/cart", {"variant_id": self.variant.id, "quantity": 1}, format="json")
        order_resp = self.client.post("/api/orders", {"address_id": self.address.id, "payment_method": "cod"}, format="json")
        invoice_resp = self.client.get(f"/api/orders/{order_resp.json()['id']}/invoice")
        self.assertEqual(invoice_resp.status_code, 200)
        self.assertIn("CSM Silks Tax Invoice", invoice_resp.content.decode())


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

    def test_admin_can_upload_product_image_for_quick_create(self):
        admin = User.objects.create_user(username="admin-upload", email="upload@example.com", password="admin123", is_staff=True)
        client = APIClient()
        client.force_authenticate(admin)
        image = SimpleUploadedFile("saree.jpg", b"\xff\xd8\xff\xe0test-image", content_type="image/jpeg")
        resp = client.post("/api/admin/product-images", {"image": image}, format="multipart")
        self.assertEqual(resp.status_code, 201)
        self.assertIn("/media/product-images/", resp.json()["image_url"])
