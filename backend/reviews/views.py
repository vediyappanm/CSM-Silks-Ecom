from django.db.models import Avg, Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsStaffAdmin
from catalog.models import Product
from orders.models import Order, OrderItem

from .models import ProductReview
from .serializers import AdminReviewSerializer, ProductReviewSerializer


class ProductReviewListCreateView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request, slug: str):
        product = get_object_or_404(Product, slug=slug, is_active=True)
        reviews = ProductReview.objects.filter(product=product, is_published=True).select_related("user")
        return Response(ProductReviewSerializer(reviews, many=True).data)

    def post(self, request, slug: str):
        product = get_object_or_404(Product, slug=slug, is_active=True)
        serializer = ProductReviewSerializer(data={**request.data, "product": product.id})
        serializer.is_valid(raise_exception=True)
        order_item = (
            OrderItem.objects.filter(
                order__user=request.user,
                order__status=Order.Status.DELIVERED,
                product=product,
                is_reviewed=False,
            )
            .order_by("-order__delivered_at", "-order__created_at")
            .first()
        )
        if not order_item:
            return Response({"detail": "Only verified purchasers can review this product"}, status=status.HTTP_400_BAD_REQUEST)
        if ProductReview.objects.filter(user=request.user, product=product).exists():
            return Response({"detail": "You have already reviewed this product"}, status=status.HTTP_400_BAD_REQUEST)
        review = serializer.save(
            user=request.user,
            order_item=order_item,
            is_verified_purchase=order_item is not None,
        )
        if order_item:
            order_item.is_reviewed = True
            order_item.save(update_fields=["is_reviewed"])
        aggregates = ProductReview.objects.filter(product=product, is_published=True).aggregate(avg=Avg("rating"))
        product.avg_rating = aggregates["avg"] or 0
        product.review_count = ProductReview.objects.filter(product=product, is_published=True).count()
        product.save(update_fields=["avg_rating", "review_count", "updated_at"])
        return Response(ProductReviewSerializer(review).data, status=status.HTTP_201_CREATED)


def _refresh_product_review_stats(product: Product) -> None:
    aggregates = ProductReview.objects.filter(product=product, is_published=True).aggregate(avg=Avg("rating"))
    product.avg_rating = aggregates["avg"] or 0
    product.review_count = ProductReview.objects.filter(product=product, is_published=True).count()
    product.save(update_fields=["avg_rating", "review_count", "updated_at"])


class AdminReviewListView(APIView):
    permission_classes = [IsStaffAdmin]

    def get(self, request):
        qs = ProductReview.objects.select_related("product", "user").order_by("-created_at")
        published = request.query_params.get("published")
        if published == "true":
            qs = qs.filter(is_published=True)
        elif published == "false":
            qs = qs.filter(is_published=False)
        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(Q(product__name__icontains=q) | Q(title__icontains=q) | Q(body__icontains=q))
        limit = min(max(int(request.query_params.get("limit", 100)), 1), 200)
        return Response(AdminReviewSerializer(qs[:limit], many=True).data)


class AdminReviewDetailView(APIView):
    permission_classes = [IsStaffAdmin]

    def patch(self, request, review_id: int):
        review = get_object_or_404(ProductReview.objects.select_related("product"), id=review_id)
        serializer = AdminReviewSerializer(review, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        review = serializer.save()
        _refresh_product_review_stats(review.product)
        return Response(AdminReviewSerializer(review).data)
