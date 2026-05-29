from django.urls import path

from .views import AdminInventoryView, UnsoldAlertView

urlpatterns = [
    path("admin/inventory", AdminInventoryView.as_view()),
    path("admin/unsold-alerts", UnsoldAlertView.as_view()),
]
