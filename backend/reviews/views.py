from django.shortcuts import get_object_or_404
from django.db.models import Avg
from rest_framework import status
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Product
from orders.models import Order, OrderItem

from .models import ProductReview
from .serializers import ProductReviewSerializer


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
