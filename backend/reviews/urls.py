from django.urls import path

from .views import AdminReviewDetailView, AdminReviewListView, ProductReviewListCreateView

urlpatterns = [
    path("products/<slug:slug>/reviews", ProductReviewListCreateView.as_view()),
    path("admin/reviews", AdminReviewListView.as_view()),
    path("admin/reviews/<int:review_id>", AdminReviewDetailView.as_view()),
]
