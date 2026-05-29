from rest_framework import serializers

from .models import ProductReview


class ProductReviewSerializer(serializers.ModelSerializer):
    customer = serializers.CharField(source="user.display_name", read_only=True)

    class Meta:
        model = ProductReview
        fields = ["id", "product", "rating", "title", "body", "customer", "is_verified_purchase", "created_at"]
        read_only_fields = ["customer", "is_verified_purchase", "created_at"]
