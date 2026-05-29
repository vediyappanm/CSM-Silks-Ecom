from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Product, ProductVariant

from .models import Cart, CartItem, WishlistItem
from .serializers import (
    CartItemQuantitySerializer,
    CartItemWriteSerializer,
    CartSerializer,
    WishlistItemSerializer,
    WishlistWriteSerializer,
)


def get_user_cart(user) -> Cart:
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


class CartView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(CartSerializer(get_user_cart(request.user)).data)

    def post(self, request):
        serializer = CartItemWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        variant = get_object_or_404(ProductVariant.objects.select_related("product"), id=serializer.validated_data["variant_id"], is_active=True)
        quantity = serializer.validated_data["quantity"]
        if variant.available_qty < quantity:
            return Response({"detail": f"Only {variant.available_qty} units available"}, status=status.HTTP_400_BAD_REQUEST)
        cart = get_user_cart(request.user)
        item, created = CartItem.objects.get_or_create(
            cart=cart,
            variant=variant,
            defaults={"product": variant.product, "quantity": quantity},
        )
        if not created:
            item.quantity = min(item.quantity + quantity, 10)
            item.save(update_fields=["quantity", "updated_at"])
        return Response(CartSerializer(cart).data)

    def delete(self, request):
        get_user_cart(request.user).items.all().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CartItemView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, item_id: int):
        item = get_object_or_404(CartItem, id=item_id, cart__user=request.user)
        serializer = CartItemQuantitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quantity = serializer.validated_data["quantity"]
        if item.variant.available_qty < quantity:
            return Response({"detail": f"Only {item.variant.available_qty} units available"}, status=status.HTTP_400_BAD_REQUEST)
        item.quantity = quantity
        item.save(update_fields=["quantity", "updated_at"])
        return Response(CartSerializer(item.cart).data)

    def delete(self, request, item_id: int):
        item = get_object_or_404(CartItem, id=item_id, cart__user=request.user)
        cart = item.cart
        item.delete()
        return Response(CartSerializer(cart).data)


class CouponView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        cart = get_user_cart(request.user)
        cart.coupon_code = (request.data.get("coupon_code") or "").upper().strip()
        cart.save(update_fields=["coupon_code", "updated_at"])
        return Response(CartSerializer(cart).data)


class WishlistView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = WishlistItem.objects.filter(user=request.user).select_related("product", "product__category").prefetch_related("product__variants", "product__images")
        return Response(WishlistItemSerializer(items, many=True).data)

    def post(self, request):
        serializer = WishlistWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = get_object_or_404(Product, id=serializer.validated_data["product_id"], is_active=True)
        item, created = WishlistItem.objects.get_or_create(user=request.user, product=product)
        if not created:
            item.delete()
            return Response({"in_wishlist": False})
        return Response({"in_wishlist": True, "item": WishlistItemSerializer(item).data})
