from __future__ import annotations

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.utils import timezone

from .models import Category, Collection, Product, ProductImage, ProductVariant

CATALOG_GROUP = "catalog_public"
ADMIN_CATALOG_GROUP = "catalog_admin"


def serialize_product(product: Product) -> dict:
    from .selectors import product_base_queryset
    from .serializers import ProductListSerializer

    fresh = product_base_queryset().get(id=product.id)
    data = dict(ProductListSerializer(fresh).data)
    data["is_active"] = fresh.is_active
    return data


def serialize_variant(variant: ProductVariant | None) -> dict | None:
    if not variant:
        return None
    fresh = ProductVariant.objects.select_related("product").get(id=variant.id)
    return {
        "id": fresh.id,
        "product_id": fresh.product_id,
        "sku": fresh.sku,
        "title": fresh.title,
        "stock_qty": fresh.stock_qty,
        "reserved_qty": fresh.reserved_qty,
        "available_qty": fresh.available_qty,
        "reorder_level": fresh.reorder_level,
        "is_active": fresh.is_active,
    }


def _send_catalog_payload(payload: dict, *, admin_only: bool = False) -> None:
    channel_layer = get_channel_layer()
    if not channel_layer:
        return

    message = {"type": "catalog.event", "payload": payload}
    groups = {ADMIN_CATALOG_GROUP} if admin_only else {CATALOG_GROUP, ADMIN_CATALOG_GROUP}
    for group in groups:
        async_to_sync(channel_layer.group_send)(group, message)


def publish_catalog_payload(payload: dict, *, admin_only: bool = False) -> None:
    payload.setdefault("timestamp", timezone.now().isoformat())
    transaction.on_commit(lambda: _send_catalog_payload(payload, admin_only=admin_only))


def publish_product_update(
    product: Product,
    *,
    event_type: str = "catalog.product.updated",
    variant: ProductVariant | None = None,
    source: str = "catalog",
) -> None:
    product_payload = serialize_product(product)
    publish_catalog_payload(
        {
            "type": event_type,
            "source": source,
            "product": product_payload,
            "product_id": product.id,
            "slug": product.slug,
            "gender": product.gender,
            "category_slug": product.category.slug if product.category_id else "",
            "is_active": product.is_active,
            "variant": serialize_variant(variant),
            "variant_id": variant.id if variant else None,
        }
    )


def publish_product_deleted(product: Product, *, source: str = "catalog") -> None:
    publish_catalog_payload(
        {
            "type": "catalog.product.deleted",
            "source": source,
            "product_id": product.id,
            "slug": product.slug,
            "gender": product.gender,
            "category_slug": product.category.slug if product.category_id else "",
            "is_active": False,
        }
    )


def publish_category_update(category: Category, *, event_type: str = "catalog.category.updated") -> None:
    publish_catalog_payload(
        {
            "type": event_type,
            "source": "catalog.category",
            "category": {
                "id": category.id,
                "name": category.name,
                "slug": category.slug,
                "gender": category.gender,
                "is_active": category.is_active,
            },
        }
    )


def publish_collection_update(collection: Collection, *, event_type: str = "catalog.collection.updated") -> None:
    publish_catalog_payload(
        {
            "type": event_type,
            "source": "catalog.collection",
            "collection": {
                "id": collection.id,
                "name": collection.name,
                "slug": collection.slug,
                "is_featured": collection.is_featured,
            },
        }
    )


def publish_image_update(image: ProductImage, *, event_type: str = "catalog.image.created") -> None:
    publish_product_update(image.product, event_type=event_type, variant=image.variant, source="catalog.image")
