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
        shipment = serializer.save()
        order = shipment.order
        order.courier_name = shipment.provider
        order.tracking_number = shipment.awb_number
        order.courier_url = shipment.tracking_url
        order.save(update_fields=["courier_name", "tracking_number", "courier_url", "updated_at"])
        return Response(ShipmentSerializer(shipment).data, status=status.HTTP_201_CREATED)
