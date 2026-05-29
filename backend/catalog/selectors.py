from __future__ import annotations

from decimal import Decimal

from django.db.models import F, Prefetch, Q, QuerySet

from .models import Product, ProductImage, ProductVariant


def product_base_queryset() -> QuerySet[Product]:
    return (
        Product.objects.select_related("category")
        .prefetch_related(
            Prefetch("variants", queryset=ProductVariant.objects.order_by("id")),
            Prefetch("images", queryset=ProductImage.objects.order_by("sort_order", "id")),
        )
    )


def public_products(params) -> QuerySet[Product]:
    qs = product_base_queryset().filter(is_active=True)
    gender = params.get("gender")
    category = params.get("category")
    search = params.get("search") or params.get("q")
    featured = params.get("featured")
    min_price = params.get("min_price")
    max_price = params.get("max_price")
    color = params.get("color")
    fabric = params.get("fabric")
    occasion = params.get("occasion")
    rating = params.get("rating")
    discount_min = params.get("discount_min")
    availability = params.get("availability")

    if gender:
        qs = qs.filter(gender=gender)
    if category:
        qs = qs.filter(Q(category__slug=category) | Q(tags__icontains=category))
    if featured is not None and featured != "":
        qs = qs.filter(is_featured=str(featured).lower() in {"1", "true", "yes"})
    if search:
        qs = qs.filter(
            Q(name__icontains=search)
            | Q(description__icontains=search)
            | Q(hook__icontains=search)
            | Q(category__name__icontains=search)
            | Q(variants__sku__icontains=search)
            | Q(variants__fabric__icontains=search)
        ).distinct()
    if min_price:
        qs = qs.filter(variants__price__gte=min_price).distinct()
    if max_price:
        qs = qs.filter(variants__price__lte=max_price).distinct()
    if color:
        qs = qs.filter(Q(variants__color_name__icontains=color) | Q(variants__color_hex__iexact=color)).distinct()
    if fabric:
        qs = qs.filter(variants__fabric__icontains=fabric).distinct()
    if occasion:
        qs = qs.filter(occasions__icontains=occasion)
    if rating:
        qs = qs.filter(avg_rating__gte=rating)
    if discount_min:
        multiplier = Decimal("1") - (Decimal(str(discount_min)) / Decimal("100"))
        qs = qs.filter(base_mrp__gt=0, base_price__lte=F("base_mrp") * multiplier)
    if availability == "in_stock":
        qs = qs.filter(variants__stock_qty__gt=F("variants__reserved_qty")).distinct()

    sort = params.get("sort")
    if sort == "price_asc":
        return qs.order_by("variants__price", "-is_featured").distinct()
    if sort == "price_desc":
        return qs.order_by("-variants__price", "-is_featured").distinct()
    if sort == "discount":
        return qs.order_by(F("base_mrp") - F("base_price")).reverse()
    if sort == "popularity":
        return qs.order_by("-total_sold", "-review_count", "-is_featured")
    if sort == "newest":
        return qs.order_by("-created_at")
    if sort == "rating":
        return qs.order_by("-avg_rating", "-review_count")
    return qs.order_by("-is_featured", "-created_at")
