from django.urls import path

from .views import AdminCustomersView, AdminDashboardView, AdminReportsView

urlpatterns = [
    path("admin/dashboard", AdminDashboardView.as_view()),
    path("admin/customers", AdminCustomersView.as_view()),
    path("admin/reports", AdminReportsView.as_view()),
]
