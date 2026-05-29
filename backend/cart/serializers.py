from __future__ import annotations

from rest_framework import serializers

from catalog.models import Product, ProductVariant
from catalog.serializers import ProductListSerializer
from orders.pricing import calculate_coupon_discount, calculate_gst, shipping_amount

from .models import Cart, CartItem, WishlistItem


class CartItemWriteSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=False)
    variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1, max_value=10, default=1)


class CartItemQuantitySerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, max_value=10)


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)
    variant_id = serializers.IntegerField(source="variant.id", read_only=True)
    line_total = serializers.SerializerMethodField()
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_price = serializers.DecimalField(source="variant.price", max_digits=12, decimal_places=2, read_only=True)
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            "id",
            "product_id",
            "variant_id",
            "quantity",
            "product",
            "product_name",
            "product_price",
            "product_image",
            "line_total",
            "created_at",
            "updated_at",
        ]

    def get_line_total(self, obj: CartItem):
        return obj.variant.price * obj.quantity

    def get_product_image(self, obj: CartItem) -> str:
        image = obj.product.images.filter(is_primary=True).first() or obj.product.images.first()
        return image.image_url if image else ""


def cart_totals(cart: Cart) -> dict:
    items = list(cart.items.select_related("product", "variant").prefetch_related("product__variants", "product__images", "product__category"))
    subtotal = sum(item.variant.price * item.quantity for item in items)
    discount = calculate_coupon_discount(subtotal, cart.coupon_code)
    taxable = subtotal - discount
    cgst, sgst = calculate_gst(taxable)
    shipping = shipping_amount(taxable)
    total = taxable + cgst + sgst + shipping
    return {
        "items": items,
        "item_count": sum(item.quantity for item in items),
        "subtotal": subtotal,
        "discount": discount,
        "coupon_code": cart.coupon_code,
        "cgst": cgst,
        "sgst": sgst,
        "shipping": shipping,
        "total": total,
        "free_shipping": shipping == 0,
    }


class CartSerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    discount = serializers.SerializerMethodField()
    cgst = serializers.SerializerMethodField()
    sgst = serializers.SerializerMethodField()
    shipping = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    free_shipping = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = [
            "id",
            "items",
            "item_count",
            "subtotal",
            "discount",
            "coupon_code",
            "cgst",
            "sgst",
            "shipping",
            "total",
            "free_shipping",
        ]

    def _totals(self, obj: Cart) -> dict:
        if not hasattr(obj, "_summary"):
            obj._summary = cart_totals(obj)
        return obj._summary

    def get_items(self, obj: Cart):
        return CartItemSerializer(self._totals(obj)["items"], many=True).data

    def get_item_count(self, obj: Cart):
        return self._totals(obj)["item_count"]

    def get_subtotal(self, obj: Cart):
        return self._totals(obj)["subtotal"]

    def get_discount(self, obj: Cart):
        return self._totals(obj)["discount"]

    def get_cgst(self, obj: Cart):
        return self._totals(obj)["cgst"]

    def get_sgst(self, obj: Cart):
        return self._totals(obj)["sgst"]

    def get_shipping(self, obj: Cart):
        return self._totals(obj)["shipping"]

    def get_total(self, obj: Cart):
        return self._totals(obj)["total"]

    def get_free_shipping(self, obj: Cart):
        return self._totals(obj)["free_shipping"]


class WishlistItemSerializer(serializers.ModelSerializer):
    product = ProductListSerializer(read_only=True)

    class Meta:
        model = WishlistItem
        fields = ["id", "product", "created_at"]


class WishlistWriteSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
