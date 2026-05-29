from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Product

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
        review = serializer.save(user=request.user, is_verified_purchase=False)
        return Response(ProductReviewSerializer(review).data, status=status.HTTP_201_CREATED)
