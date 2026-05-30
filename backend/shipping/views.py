from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from notifications.models import Notification
from orders.models import Order

from .models import Shipment
from .serializers import ShipmentSerializer, ShipmentWriteSerializer


class AdminShipmentListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        shipments = Shipment.objects.select_related("order").order_by("-created_at")
        return Response(ShipmentSerializer(shipments, many=True).data)

    def post(self, request):
        serializer = ShipmentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        order = data.pop("order")
        shipment, _ = Shipment.objects.update_or_create(order=order, defaults=data)
        order = shipment.order
        order.courier_name = shipment.provider
        order.tracking_number = shipment.awb_number
        order.courier_url = shipment.tracking_url
        if not order.estimated_delivery and shipment.status != Shipment.Status.DELIVERED:
            order.estimated_delivery = timezone.now() + timedelta(days=4)
        if shipment.status == Shipment.Status.DELIVERED:
            order.status = Order.Status.DELIVERED
            order.delivered_at = order.delivered_at or timezone.now()
        elif shipment.status == Shipment.Status.OUT_FOR_DELIVERY:
            order.status = Order.Status.OUT_FOR_DELIVERY
        elif shipment.status in {Shipment.Status.PICKED_UP, Shipment.Status.IN_TRANSIT}:
            order.status = Order.Status.SHIPPED
            order.shipped_at = order.shipped_at or timezone.now()
        elif order.status in {Order.Status.CONFIRMED, Order.Status.QUALITY_CHECK}:
            order.status = Order.Status.PACKED
        order.save()
        Notification.objects.create(
            user=order.user,
            title="Order tracking updated",
            body=f"{order.order_number} is now {order.status.replace('_', ' ')}.",
            notification_type="shipping",
            data={"order_id": order.id, "order_number": order.order_number, "tracking_number": order.tracking_number},
        )
        return Response(ShipmentSerializer(shipment).data, status=status.HTTP_201_CREATED)
