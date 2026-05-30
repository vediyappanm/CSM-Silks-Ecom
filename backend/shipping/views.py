from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import HttpResponse
from django.shortcuts import get_object_or_404

from .models import Shipment
from .serializers import ShipmentSerializer, ShipmentWriteSerializer
from .services import apply_shipment_update, render_label_text


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


class AdminShipmentLabelView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, shipment_id: int):
        shipment = get_object_or_404(Shipment.objects.select_related("order", "order__user").prefetch_related("order__items"), id=shipment_id)
        response = HttpResponse(render_label_text(shipment), content_type="text/plain")
        response["Content-Disposition"] = f'attachment; filename="shipping-label-{shipment.order.order_number}.txt"'
        return response


class AdminShipmentManifestView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, shipment_id: int):
        shipment = get_object_or_404(Shipment.objects.select_related("order"), id=shipment_id)
        content = "\n".join(
            [
                "CSM SILKS MANIFEST",
                f"Order: {shipment.order.order_number}",
                f"Courier: {shipment.provider}",
                f"AWB: {shipment.awb_number}",
                f"Status: {shipment.status}",
            ]
        )
        response = HttpResponse(content, content_type="text/plain")
        response["Content-Disposition"] = f'attachment; filename="manifest-{shipment.order.order_number}.txt"'
        return response
