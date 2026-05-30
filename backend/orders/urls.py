from django.urls import path

from .views import (
    AdminOrderListView,
    AdminOrderInvoiceView,
    AdminOrderStatusView,
    AdminOrderWorkflowView,
    AdminReturnDetailView,
    AdminReturnListView,
    OrderCancelView,
    OrderDetailView,
    OrderInvoiceView,
    OrderListCreateView,
    OrderTrackLookupView,
    ReturnListCreateView,
)

urlpatterns = [
    path("orders", OrderListCreateView.as_view()),
    path("orders/track", OrderTrackLookupView.as_view()),
    path("orders/<int:order_id>", OrderDetailView.as_view()),
    path("orders/<int:order_id>/invoice", OrderInvoiceView.as_view()),
    path("orders/<int:order_id>/cancel", OrderCancelView.as_view()),
    path("returns", ReturnListCreateView.as_view()),
    path("admin/orders", AdminOrderListView.as_view()),
    path("admin/orders/<int:order_id>/status", AdminOrderStatusView.as_view()),
    path("admin/orders/<int:order_id>/workflow", AdminOrderWorkflowView.as_view()),
    path("admin/orders/<int:order_id>/invoice", AdminOrderInvoiceView.as_view()),
    path("admin/returns", AdminReturnListView.as_view()),
    path("admin/returns/<int:return_id>", AdminReturnDetailView.as_view()),
]
