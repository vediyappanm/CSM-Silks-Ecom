from django.urls import path

from .views import RecommendView, TryOnView, VoiceSearchView

urlpatterns = [
    path("ai/tryon", TryOnView.as_view()),
    path("ai/voice-search", VoiceSearchView.as_view()),
    path("ai/recommend", RecommendView.as_view()),
]
