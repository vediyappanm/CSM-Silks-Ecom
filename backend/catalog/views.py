from __future__ import annotations

from datetime import timedelta
from math import ceil

from django.db.models import Max, Min
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Collection, Product, ProductImage, ProductVariant
from .selectors import product_base_queryset, public_products
from .serializers import (
    AdminCategoryWriteSerializer,
    AdminCollectionWriteSerializer,
    AdminProductImageWriteSerializer,
    AdminProductQuickCreateSerializer,
    AdminProductWriteSerializer,
    AdminVariantWriteSerializer,
    CategorySerializer,
    CollectionSerializer,
    ProductDetailSerializer,
    ProductImageSerializer,
    ProductListSerializer,
    ProductVariantSerializer,
)


class ProductListView(APIView):
    def get(self, request):
        page = max(int(request.query_params.get("page", 1)), 1)
        per_page = min(max(int(request.query_params.get("per_page", 12)), 1), 48)
        qs = public_products(request.query_params)
        total = qs.count()
        items = qs[(page - 1) * per_page : page * per_page]
        return Response(
            {
                "items": ProductListSerializer(items, many=True).data,
                "total": total,
                "page": page,
                "per_page": per_page,
                "pages": ceil(total / per_page) if total else 0,
            }
        )


class ProductDetailView(APIView):
    def get(self, request, slug: str):
        product = get_object_or_404(product_base_queryset().filter(is_active=True), slug=slug)
        return Response(ProductDetailSerializer(product).data)


class CategoryListView(APIView):
    def get(self, request):
        categories = Category.objects.filter(is_active=True).order_by("sort_order", "name")
        return Response(CategorySerializer(categories, many=True).data)


class CollectionListView(APIView):
    def get(self, request):
        collections = Collection.objects.order_by("sort_order", "name")
        return Response(CollectionSerializer(collections, many=True).data)


class CatalogFacetsView(APIView):
    def get(self, request):
        products = public_products(request.query_params)
        variants = ProductVariant.objects.filter(product__in=products, is_active=True)
        price_bounds = variants.aggregate(min_price=Min("price"), max_price=Max("price"))
        colors = (
            variants.exclude(color_name="")
            .values("color_name", "color_hex")
            .order_by("color_name")
            .distinct()
        )
        fabrics = variants.exclude(fabric="").values_list("fabric", flat=True).order_by("fabric").distinct()
        occasions = sorted({occasion for product in products for occasion in (product.occasions or [])})
        return Response(
            {
                "categories": CategorySerializer(Category.objects.filter(is_active=True), many=True).data,
                "colors": list(colors),
                "fabrics": list(fabrics),
                "occasions": occasions,
                "price": price_bounds,
                "sorts": [
                    {"key": "popularity", "label": "Popularity"},
                    {"key": "price_asc", "label": "Price: Low to High"},
                    {"key": "price_desc", "label": "Price: High to Low"},
                    {"key": "discount", "label": "Biggest Discount"},
                    {"key": "rating", "label": "Customer Rating"},
                    {"key": "newest", "label": "Newest First"},
                ],
            }
        )


class ProductDeliveryCheckView(APIView):
    def get(self, request, slug: str):
        product = get_object_or_404(product_base_queryset().filter(is_active=True), slug=slug)
        pin_code = (request.query_params.get("pin_code") or "").strip()
        configured_pins = product.serviceable_pin_codes or []
        is_serviceable = bool(pin_code) and (not configured_pins or pin_code in configured_pins)
        today = timezone.localdate()
        min_date = today + timedelta(days=product.delivery_min_days)
        max_date = today + timedelta(days=product.delivery_max_days)
        return Response(
            {
                "pin_code": pin_code,
                "serviceable": is_serviceable,
                "message": "Delivery available" if is_serviceable else "Enter a valid serviceable Indian PIN code",
                "eta_min": min_date,
                "eta_max": max_date,
                "cod_available": is_serviceable and product.cod_available,
                "exchange_available": product.exchange_available,
                "return_days": product.return_days,
                "seller_name": product.seller_name,
                "assured": product.assured,
            }
        )


class AdminProductListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        page = max(int(request.query_params.get("page", 1)), 1)
        per_page = min(max(int(request.query_params.get("per_page", 20)), 1), 100)
        qs = product_base_queryset().all()
        total = qs.count()
        products = qs[(page - 1) * per_page : page * per_page]
        return Response(
            {
                "items": ProductListSerializer(products, many=True).data,
                "total": total,
                "page": page,
                "per_page": per_page,
                "pages": ceil(total / per_page) if total else 0,
            }
        )

    def post(self, request):
        serializer = AdminProductWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        return Response(ProductDetailSerializer(product_base_queryset().get(id=product.id)).data, status=status.HTTP_201_CREATED)


class AdminProductQuickCreateView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = AdminProductQuickCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        return Response(ProductDetailSerializer(product_base_queryset().get(id=product.id)).data, status=status.HTTP_201_CREATED)


class AdminProductDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, product_id: int):
        product = get_object_or_404(Product, id=product_id)
        serializer = AdminProductWriteSerializer(product, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        return Response(ProductDetailSerializer(product_base_queryset().get(id=product.id)).data)

    def delete(self, request, product_id: int):
        product = get_object_or_404(Product, id=product_id)
        product.is_active = False
        product.save(update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminVariantListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        variants = ProductVariant.objects.select_related("product").order_by("product__name", "sku")
        return Response(ProductVariantSerializer(variants, many=True).data)

    def post(self, request):
        serializer = AdminVariantWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        variant = serializer.save()
        return Response(ProductVariantSerializer(variant).data, status=status.HTTP_201_CREATED)


class AdminVariantDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, variant_id: int):
        variant = get_object_or_404(ProductVariant, id=variant_id)
        serializer = AdminVariantWriteSerializer(variant, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return Response(ProductVariantSerializer(serializer.save()).data)


class AdminCategoryListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        categories = Category.objects.order_by("sort_order", "name")
        return Response(CategorySerializer(categories, many=True).data)

    def post(self, request):
        serializer = AdminCategoryWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = serializer.save()
        return Response(CategorySerializer(category).data, status=status.HTTP_201_CREATED)


class AdminCollectionListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        collections = Collection.objects.order_by("sort_order", "name")
        return Response(CollectionSerializer(collections, many=True).data)

    def post(self, request):
        serializer = AdminCollectionWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        collection = serializer.save()
        return Response(CollectionSerializer(collection).data, status=status.HTTP_201_CREATED)


class AdminProductImageListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        images = ProductImage.objects.select_related("product", "variant").order_by("-id")[:200]
        return Response(ProductImageSerializer(images, many=True).data)

    def post(self, request):
        serializer = AdminProductImageWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        image = serializer.save()
        return Response(ProductImageSerializer(image).data, status=status.HTTP_201_CREATED)
