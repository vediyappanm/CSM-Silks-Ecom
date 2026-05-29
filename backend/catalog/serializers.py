from __future__ import annotations

from rest_framework import serializers

from .models import Category, Collection, Product, ProductImage, ProductVariant


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug", "gender", "parent_id", "sort_order"]


class CollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields = ["id", "name", "slug", "description", "is_featured", "sort_order"]


class ProductVariantSerializer(serializers.ModelSerializer):
    available_qty = serializers.IntegerField(read_only=True)

    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "sku",
            "title",
            "color_name",
            "color_hex",
            "size",
            "fabric",
            "zari_type",
            "blouse_included",
            "length_meters",
            "care_instructions",
            "price",
            "mrp",
            "stock_qty",
            "reserved_qty",
            "available_qty",
            "reorder_level",
            "last_sold_at",
            "is_active",
        ]


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ["id", "variant_id", "image_url", "alt_text", "sort_order", "is_primary"]


class ProductListSerializer(serializers.ModelSerializer):
    cat = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)
    price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    mrp = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    colors = serializers.SerializerMethodField()
    colours = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()
    default_variant_id = serializers.SerializerMethodField()
    variant_id = serializers.SerializerMethodField()
    available_qty = serializers.SerializerMethodField()
    discount_percent = serializers.IntegerField(read_only=True)
    badge = serializers.SerializerMethodField()
    badge_text = serializers.SerializerMethodField()
    bg = serializers.SerializerMethodField()
    emoji = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "slug",
            "name",
            "name_tamil",
            "cat",
            "category_slug",
            "gender",
            "hook",
            "description",
            "tags",
            "occasions",
            "brand",
            "seller_name",
            "price",
            "mrp",
            "deal_label",
            "badge",
            "badge_text",
            "emoji",
            "bg",
            "colors",
            "colours",
            "images",
            "default_variant_id",
            "variant_id",
            "available_qty",
            "is_featured",
            "is_gi_tagged",
            "assured",
            "cod_available",
            "exchange_available",
            "return_days",
            "delivery_min_days",
            "delivery_max_days",
            "discount_percent",
            "avg_rating",
            "review_count",
            "total_sold",
        ]

    def _default_variant(self, obj: Product):
        variants = list(obj.variants.all())
        return next((variant for variant in variants if variant.is_active), variants[0] if variants else None)

    def get_colors(self, obj: Product) -> list[str]:
        colors = [v.color_hex for v in obj.variants.all() if v.color_hex]
        return colors or ["#C4923A", "#8B1A1A"]

    def get_colours(self, obj: Product) -> list[str]:
        return self.get_colors(obj)

    def get_images(self, obj: Product) -> list[str]:
        images = [image.image_url for image in obj.images.all() if image.image_url]
        return images

    def get_default_variant_id(self, obj: Product) -> int | None:
        variant = self._default_variant(obj)
        return variant.id if variant else None

    def get_variant_id(self, obj: Product) -> int | None:
        return self.get_default_variant_id(obj)

    def get_available_qty(self, obj: Product) -> int:
        return sum(v.available_qty for v in obj.variants.all() if v.is_active)

    def get_badge(self, obj: Product) -> str:
        if obj.is_featured:
            return "pb-hot"
        if obj.gender == Product.Gender.MEN:
            return "pb-men"
        return "pb-new"

    def get_badge_text(self, obj: Product) -> str:
        if obj.is_featured:
            return "Bestseller"
        if obj.gender == Product.Gender.MEN:
            return "Men's"
        return "New"

    def get_bg(self, obj: Product) -> str:
        colors = self.get_colors(obj)
        first = colors[0]
        second = colors[1] if len(colors) > 1 else "#2A1808"
        return f"linear-gradient(145deg,#1A1208,{second},{first})"

    def get_emoji(self, obj: Product) -> str:
        return "CSM"

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["badge-text"] = data.pop("badge_text")
        return data


class ProductDetailSerializer(ProductListSerializer):
    variants = ProductVariantSerializer(many=True, read_only=True)
    image_records = ProductImageSerializer(source="images", many=True, read_only=True)
    reviews = serializers.SerializerMethodField()

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + [
            "hsn_code",
            "meta_title",
            "meta_description",
            "key_highlights",
            "specifications",
            "serviceable_pin_codes",
            "variants",
            "image_records",
            "reviews",
            "created_at",
            "updated_at",
        ]

    def get_reviews(self, obj: Product) -> list[dict]:
        reviews = obj.reviews.filter(is_published=True).select_related("user")[:10]
        return [
            {
                "id": review.id,
                "rating": review.rating,
                "title": review.title,
                "body": review.body,
                "customer": review.user.display_name,
                "is_verified_purchase": review.is_verified_purchase,
                "created_at": review.created_at,
            }
            for review in reviews
        ]


class AdminProductWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "name_tamil",
            "slug",
            "description",
            "hook",
            "category",
            "gender",
            "tags",
            "occasions",
            "brand",
            "seller_name",
            "hsn_code",
            "base_price",
            "base_mrp",
            "deal_label",
            "key_highlights",
            "specifications",
            "serviceable_pin_codes",
            "delivery_min_days",
            "delivery_max_days",
            "return_days",
            "cod_available",
            "exchange_available",
            "assured",
            "is_active",
            "is_featured",
            "is_gi_tagged",
        ]


class AdminVariantWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = [
            "id",
            "product",
            "sku",
            "title",
            "color_name",
            "color_hex",
            "size",
            "fabric",
            "zari_type",
            "blouse_included",
            "length_meters",
            "care_instructions",
            "price",
            "mrp",
            "cost_price",
            "stock_qty",
            "reserved_qty",
            "reorder_level",
            "is_active",
        ]
