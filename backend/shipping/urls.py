from django.urls import path

from .views import AdminShipmentLabelView, AdminShipmentListCreateView, AdminShipmentManifestView, CourierWebhookView

urlpatterns = [
    path("admin/shipments", AdminShipmentListCreateView.as_view()),
    path("admin/shipments/<int:shipment_id>/label", AdminShipmentLabelView.as_view()),
    path("admin/shipments/<int:shipment_id>/manifest", AdminShipmentManifestView.as_view()),
    path("shipping/webhook", CourierWebhookView.as_view()),
]
