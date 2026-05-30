import secrets

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import HttpResponse
from django.shortcuts import get_object_or_404

from analytics.audit import record_admin_audit

from .models import Shipment
from .serializers import ShipmentSerializer, ShipmentWriteSerializer
from .services import apply_shipment_update, render_label_text


def _extract_value(data, keys: set[str]):
    if isinstance(data, dict):
        lower_map = {str(key).lower(): value for key, value in data.items()}
        for key in keys:
            if key in lower_map and lower_map[key] not in {"", None}:
                return lower_map[key]
        for value in data.values():
            found = _extract_value(value, keys)
            if found not in {"", None}:
                return found
    if isinstance(data, list):
        for item in data:
            found = _extract_value(item, keys)
            if found not in {"", None}:
                return found
    return ""


def _normalize_courier_status(value: str) -> str:
    text = str(value or "").strip().lower().replace("-", " ").replace("_", " ")
    if "rto" in text and "deliver" in text:
        return Shipment.Status.RTO_DELIVERED
    if "rto" in text or "return to origin" in text:
        return Shipment.Status.RTO_INITIATED
    if "out for delivery" in text or text == "ofd":
        return Shipment.Status.OUT_FOR_DELIVERY
    if "deliver" in text:
        return Shipment.Status.DELIVERED
    if "fail" in text or "undeliver" in text or "attempt" in text or "exception" in text:
        return Shipment.Status.FAILED
    if "pick" in text:
        return Shipment.Status.PICKED_UP
    if "transit" in text or "ship" in text or "hub" in text or "manifest" in text:
        return Shipment.Status.IN_TRANSIT
    return Shipment.Status.CREATED


def _verify_webhook_secret(request) -> bool:
    expected = settings.SHIPROCKET_WEBHOOK_SECRET
    if not expected:
        return settings.DEBUG
    provided = (
        request.headers.get("X-Shiprocket-Webhook-Secret")
        or request.headers.get("X-Webhook-Secret")
        or request.headers.get("X-Shiprocket-Token")
        or request.query_params.get("secret")
        or ""
    )
    return secrets.compare_digest(str(expected), str(provided))


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
        record_admin_audit(
            request,
            action="shipping.upsert",
            entity=shipment,
            summary=f"Shipment updated for {shipment.order.order_number}.",
            metadata={"status": shipment.status, "provider": shipment.provider, "awb_number": shipment.awb_number},
        )
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


class CourierWebhookView(APIView):
    authentication_classes = []
    permission_classes = []
    throttle_scope = "courier_webhook"

    def post(self, request):
        if not _verify_webhook_secret(request):
            return Response({"detail": "Invalid courier webhook secret"}, status=status.HTTP_403_FORBIDDEN)

        payload = request.data if isinstance(request.data, (dict, list)) else {}
        awb = str(_extract_value(payload, {"awb", "awb_code", "awb_number", "tracking_number"})).strip()
        order_number = str(_extract_value(payload, {"order_id", "order_number", "channel_order_id"})).strip()
        raw_status = _extract_value(payload, {"current_status", "shipment_status", "status", "activity"})
        event_note = str(_extract_value(payload, {"remarks", "remark", "message", "activity"})).strip()
        event_location = str(_extract_value(payload, {"location", "current_location", "scan_location", "city"})).strip()
        tracking_url = str(_extract_value(payload, {"tracking_url", "track_url"})).strip()

        shipment = None
        if awb:
            shipment = Shipment.objects.select_related("order", "order__user").filter(awb_number__iexact=awb).first()
        if shipment is None and order_number:
            shipment = Shipment.objects.select_related("order", "order__user").filter(order__order_number__iexact=order_number).first()
        if shipment is None:
            return Response({"detail": "No shipment matched this courier webhook"}, status=status.HTTP_404_NOT_FOUND)

        shipment.status = _normalize_courier_status(str(raw_status))
        if tracking_url:
            shipment.tracking_url = tracking_url
        if shipment.status in {Shipment.Status.FAILED, Shipment.Status.RTO_INITIATED, Shipment.Status.RTO_DELIVERED} and event_note:
            shipment.rto_reason = event_note[:160]
        shipment.raw_payload = {"source": "courier_webhook", "payload": payload}
        shipment.save(update_fields=["status", "tracking_url", "rto_reason", "raw_payload", "updated_at"])
        apply_shipment_update(shipment, event_location=event_location, event_note=event_note)
        record_admin_audit(
            request,
            action="shipping.webhook",
            entity=shipment,
            summary=f"Courier webhook updated {shipment.order.order_number} to {shipment.status}.",
            metadata={"awb_number": shipment.awb_number, "status": shipment.status, "location": event_location},
        )
        return Response(ShipmentSerializer(shipment).data)
