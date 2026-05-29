from rest_framework import serializers

from .models import Shipment


class ShipmentSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)

    class Meta:
        model = Shipment
        fields = ["id", "order", "order_number", "provider", "awb_number", "tracking_url", "status", "raw_payload", "created_at", "updated_at"]


class ShipmentWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shipment
        fields = ["order", "provider", "awb_number", "tracking_url", "status", "raw_payload"]
