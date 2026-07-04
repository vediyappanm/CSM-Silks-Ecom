from rest_framework import serializers

from .models import ProductReview


class ProductReviewSerializer(serializers.ModelSerializer):
    customer = serializers.CharField(source="user.display_name", read_only=True)

    class Meta:
        model = ProductReview
        fields = ["id", "product", "rating", "title", "body", "customer", "is_verified_purchase", "created_at"]
        read_only_fields = ["customer", "is_verified_purchase", "created_at"]


class AdminReviewSerializer(serializers.ModelSerializer):
    customer = serializers.CharField(source="user.display_name", read_only=True)
    customer_email = serializers.EmailField(source="user.email", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)

    class Meta:
        model = ProductReview
        fields = [
            "id",
            "product",
            "product_name",
            "product_slug",
            "rating",
            "title",
            "body",
            "customer",
            "customer_email",
            "is_verified_purchase",
            "is_published",
            "created_at",
        ]
        read_only_fields = ["product", "customer", "customer_email", "is_verified_purchase", "created_at"]
