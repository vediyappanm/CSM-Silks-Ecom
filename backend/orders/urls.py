from django.urls import path

from .views import (
    AdminOrderListView,
    AdminOrderStatusView,
    AdminReturnListView,
    OrderCancelView,
    OrderDetailView,
    OrderListCreateView,
    ReturnListCreateView,
)

urlpatterns = [
    path("orders", OrderListCreateView.as_view()),
    path("orders/<int:order_id>", OrderDetailView.as_view()),
    path("orders/<int:order_id>/cancel", OrderCancelView.as_view()),
    path("returns", ReturnListCreateView.as_view()),
    path("admin/orders", AdminOrderListView.as_view()),
    path("admin/orders/<int:order_id>/status", AdminOrderStatusView.as_view()),
    path("admin/returns", AdminReturnListView.as_view()),
]
