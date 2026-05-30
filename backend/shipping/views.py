from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Shipment
from .serializers import ShipmentSerializer, ShipmentWriteSerializer
from .services import apply_shipment_update


class AdminShipmentListCreateView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        shipments = Shipment.objects.select_related("order").order_by("-created_at")
        return Response(ShipmentSerializer(shipments, many=True).data)

    def post(self, request):
        serializer = ShipmentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        event_location = data.pop("event_location", "")
        event_note = data.pop("event_note", "")
        order = data.pop("order")
        shipment, _ = Shipment.objects.update_or_create(order=order, defaults=data)
        apply_shipment_update(shipment, event_location=event_location, event_note=event_note)
        return Response(ShipmentSerializer(shipment).data, status=status.HTTP_201_CREATED)
