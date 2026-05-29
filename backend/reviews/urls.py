from django.urls import path

from .views import ProductReviewListCreateView

urlpatterns = [
    path("products/<slug:slug>/reviews", ProductReviewListCreateView.as_view()),
]
