from django.urls import path

from .views import AdminShipmentListCreateView

urlpatterns = [
    path("admin/shipments", AdminShipmentListCreateView.as_view()),
]
