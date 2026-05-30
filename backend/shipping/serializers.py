from rest_framework import serializers

from .models import Shipment, ShipmentEvent


class ShipmentEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShipmentEvent
        fields = ["id", "status", "title", "description", "location", "happened_at", "raw_payload", "created_at"]


class ShipmentSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    events = ShipmentEventSerializer(many=True, read_only=True)

    class Meta:
        model = Shipment
        fields = ["id", "order", "order_number", "provider", "awb_number", "tracking_url", "label_url", "manifest_url", "shipping_charge", "rto_reason", "status", "raw_payload", "events", "created_at", "updated_at"]


class ShipmentWriteSerializer(serializers.ModelSerializer):
    event_location = serializers.CharField(required=False, allow_blank=True, write_only=True)
    event_note = serializers.CharField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = Shipment
        fields = ["order", "provider", "awb_number", "tracking_url", "label_url", "manifest_url", "shipping_charge", "rto_reason", "status", "raw_payload", "event_location", "event_note"]
