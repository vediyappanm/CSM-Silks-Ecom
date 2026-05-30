from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

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
        if shipment.status == Shipment.Status.DELIVERED:
            order.status = order.Status.DELIVERED
            order.delivered_at = order.delivered_at or timezone.now()
        elif shipment.status == Shipment.Status.OUT_FOR_DELIVERY:
            order.status = order.Status.OUT_FOR_DELIVERY
        elif shipment.status in {Shipment.Status.PICKED_UP, Shipment.Status.IN_TRANSIT}:
            order.status = order.Status.SHIPPED
            order.shipped_at = order.shipped_at or timezone.now()
        elif order.status in {order.Status.CONFIRMED, order.Status.QUALITY_CHECK}:
            order.status = order.Status.PACKED
        order.save()
        return Response(ShipmentSerializer(shipment).data, status=status.HTTP_201_CREATED)
