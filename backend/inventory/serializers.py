from rest_framework import serializers

from catalog.serializers import ProductVariantSerializer

from .models import StockLedger, UnsoldAlert


class StockLedgerSerializer(serializers.ModelSerializer):
    variant = ProductVariantSerializer(read_only=True)

    class Meta:
        model = StockLedger
        fields = ["id", "variant", "quantity_delta", "reason", "reference", "note", "created_at"]


class StockAdjustmentSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    quantity_delta = serializers.IntegerField()
    note = serializers.CharField(required=False, allow_blank=True)


class UnsoldAlertSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    sku = serializers.CharField(source="variant.sku", read_only=True)

    class Meta:
        model = UnsoldAlert
        fields = ["id", "product", "product_name", "variant", "sku", "days_unsold", "stock_qty", "capital_blocked", "severity", "discount_applied", "discount_percent", "resolved", "alerted_at"]
