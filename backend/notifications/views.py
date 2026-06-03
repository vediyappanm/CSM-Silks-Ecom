from math import ceil

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .serializers import NotificationSerializer


def _positive_int(value, default, maximum=None):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    parsed = max(1, parsed)
    if maximum is not None:
        parsed = min(parsed, maximum)
    return parsed


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        page = _positive_int(request.query_params.get("page"), 1)
        per_page = _positive_int(request.query_params.get("per_page"), 20, maximum=50)
        queryset = Notification.objects.filter(user=request.user)
        total = queryset.count()
        unread_count = queryset.filter(is_read=False).count()
        start = (page - 1) * per_page
        end = start + per_page
        items = NotificationSerializer(queryset[start:end], many=True).data
        return Response(
            {
                "items": items,
                "total": total,
                "page": page,
                "per_page": per_page,
                "pages": ceil(total / per_page) if total else 1,
                "unread_count": unread_count,
            }
        )

    def patch(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        from .realtime import publish_notifications_read

        publish_notifications_read(request.user.id)
        return Response({"message": "Notifications marked read"})


class NotificationUnreadCountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"unread_count": Notification.objects.filter(user=request.user, is_read=False).count()})
