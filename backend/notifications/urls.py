from django.urls import path

from .views import NotificationListView, NotificationUnreadCountView

urlpatterns = [
    path("notifications/count", NotificationUnreadCountView.as_view()),
    path("notifications", NotificationListView.as_view()),
]
