from django.urls import path

from .views import (
    AdminProductDetailView,
    AdminProductListCreateView,
    AdminVariantDetailView,
    AdminVariantListCreateView,
    CatalogFacetsView,
    CategoryListView,
    ProductDeliveryCheckView,
    ProductDetailView,
    ProductListView,
)

urlpatterns = [
    path("categories", CategoryListView.as_view()),
    path("catalog/facets", CatalogFacetsView.as_view()),
    path("products", ProductListView.as_view()),
    path("search", ProductListView.as_view()),
    path("products/<slug:slug>", ProductDetailView.as_view()),
    path("products/<slug:slug>/delivery", ProductDeliveryCheckView.as_view()),
    path("admin/products", AdminProductListCreateView.as_view()),
    path("admin/products/<int:product_id>", AdminProductDetailView.as_view()),
    path("admin/variants", AdminVariantListCreateView.as_view()),
    path("admin/variants/<int:variant_id>", AdminVariantDetailView.as_view()),
]
