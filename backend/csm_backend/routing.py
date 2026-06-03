from django.urls import path

from catalog.consumers import CatalogRealtimeConsumer
from notifications.consumers import NotificationRealtimeConsumer
from orders.consumers import OrderRealtimeConsumer

websocket_urlpatterns = [
    path("ws/catalog/", CatalogRealtimeConsumer.as_asgi()),
    path("ws/notifications/", NotificationRealtimeConsumer.as_asgi()),
    path("ws/orders/", OrderRealtimeConsumer.as_asgi()),
    path("ws/orders/<int:order_id>/", OrderRealtimeConsumer.as_asgi()),
]
