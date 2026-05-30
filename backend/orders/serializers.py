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
    tracking_events = serializers.SerializerMethodField()

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
            "tracking_events",
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

    def get_tracking_events(self, obj: Order) -> list[dict]:
        from shipping.models import ShipmentEvent
        from shipping.serializers import ShipmentEventSerializer

        events = list(obj.tracking_events.all())
        if events:
            return ShipmentEventSerializer(events, many=True).data

        fallback = [
            {
                "id": 0,
                "status": ShipmentEvent.Status.ORDER_PLACED,
                "title": "Order placed",
                "description": "Your order was created successfully.",
                "location": "",
                "happened_at": obj.created_at,
                "raw_payload": {},
                "created_at": obj.created_at,
            }
        ]
        if obj.confirmed_at:
            fallback.append(
                {
                    "id": 0,
                    "status": ShipmentEvent.Status.CONFIRMED,
                    "title": "Order confirmed",
                    "description": "Payment/order confirmation is complete.",
                    "location": "",
                    "happened_at": obj.confirmed_at,
                    "raw_payload": {},
                    "created_at": obj.confirmed_at,
                }
            )
        if obj.shipped_at:
            fallback.append(
                {
                    "id": 0,
                    "status": ShipmentEvent.Status.IN_TRANSIT,
                    "title": "In transit",
                    "description": "The package is moving through the courier network.",
                    "location": "",
                    "happened_at": obj.shipped_at,
                    "raw_payload": {},
                    "created_at": obj.shipped_at,
                }
            )
        if obj.delivered_at:
            fallback.append(
                {
                    "id": 0,
                    "status": ShipmentEvent.Status.DELIVERED,
                    "title": "Delivered",
                    "description": "The package has been delivered.",
                    "location": "",
                    "happened_at": obj.delivered_at,
                    "raw_payload": {},
                    "created_at": obj.delivered_at,
                }
            )
        return fallback


class AdminOrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices)
    tracking_number = serializers.CharField(required=False, allow_blank=True)
    courier_name = serializers.CharField(required=False, allow_blank=True)
    courier_url = serializers.URLField(required=False, allow_blank=True)


class AdminOrderWorkflowSerializer(serializers.Serializer):
    action = serializers.ChoiceField(
        choices=[
            "confirm",
            "quality_check",
            "pack",
            "create_label",
            "pickup",
            "in_transit",
            "out_for_delivery",
            "delivery_failed",
            "rto_initiated",
            "rto_delivered",
            "delivered",
            "cancel",
        ]
    )
    provider = serializers.CharField(required=False, allow_blank=True, default="manual")
    note = serializers.CharField(required=False, allow_blank=True, default="")
    location = serializers.CharField(required=False, allow_blank=True, default="")


class ReturnCreateSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    reason = serializers.CharField(max_length=120)
    details = serializers.CharField(required=False, allow_blank=True)


class AdminReturnStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ReturnRequest.Status.choices)


class ReturnSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    customer = serializers.CharField(source="user.display_name", read_only=True)

    class Meta:
        model = ReturnRequest
        fields = ["id", "order", "order_number", "customer", "reason", "details", "status", "created_at", "updated_at"]
