from django.urls import path

from .views import CartItemView, CartView, CouponView, WishlistView

urlpatterns = [
    path("cart", CartView.as_view()),
    path("cart/items/<int:item_id>", CartItemView.as_view()),
    path("cart/coupon", CouponView.as_view()),
    path("checkout/summary", CartView.as_view()),
    path("wishlist", WishlistView.as_view()),
]
