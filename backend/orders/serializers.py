from __future__ import annotations

from rest_framework import serializers

from catalog.serializers import ProductListSerializer

from .models import Order, OrderItem, ReturnRequest


class OrderCreateSerializer(serializers.Serializer):
    address_id = serializers.IntegerField()
    coupon_code = serializers.CharField(required=False, allow_blank=True)
    loyalty_points_to_use = serializers.IntegerField(required=False, min_value=0, default=0)
    payment_method = serializers.ChoiceField(choices=Order.PaymentMethod.choices, default=Order.PaymentMethod.COD)


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    variant_id = serializers.IntegerField(source="variant.id", read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product_id",
            "variant_id",
            "product",
            "product_name",
            "product_sku",
            "variant_title",
            "unit_price",
            "quantity",
            "subtotal",
            "selected_colour",
            "is_reviewed",
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    gst_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    payment_status = serializers.SerializerMethodField()
    tracking_url = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "payment_method",
            "payment_status",
            "subtotal",
            "discount_amount",
            "coupon_code",
            "cgst_amount",
            "sgst_amount",
            "gst_total",
            "shipping_amount",
            "total_amount",
            "courier_name",
            "tracking_number",
            "courier_url",
            "tracking_url",
            "estimated_delivery",
            "shipping_address_snapshot",
            "loyalty_points_earned",
            "loyalty_points_used",
            "items",
            "created_at",
            "confirmed_at",
            "shipped_at",
            "delivered_at",
        ]

    def get_payment_status(self, obj: Order) -> str:
        payment = getattr(obj, "payment", None)
        return payment.status if payment else ""

    def get_tracking_url(self, obj: Order) -> str:
        return obj.courier_url


class AdminOrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices)
    tracking_number = serializers.CharField(required=False, allow_blank=True)
    courier_name = serializers.CharField(required=False, allow_blank=True)
    courier_url = serializers.URLField(required=False, allow_blank=True)


class ReturnCreateSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    reason = serializers.CharField(max_length=120)
    details = serializers.CharField(required=False, allow_blank=True)


class ReturnSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    customer = serializers.CharField(source="user.display_name", read_only=True)

    class Meta:
        model = ReturnRequest
        fields = ["id", "order", "order_number", "customer", "reason", "details", "status", "created_at", "updated_at"]
