from __future__ import annotations

from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from analytics.audit import record_admin_audit
from .models import Order, ReturnRequest
from .serializers import AdminOrderStatusSerializer, AdminOrderWorkflowSerializer, AdminReturnStatusSerializer, OrderCreateSerializer, OrderSerializer, ReturnCreateSerializer, ReturnSerializer
from .services import create_order_from_cart
from shipping.models import Shipment
from shipping.services import apply_shipment_update, create_shipping_label, record_order_status_event


def order_queryset():
    return Order.objects.select_related("user", "address", "payment").prefetch_related(
        "items__product__category",
        "items__product__variants",
        "items__product__images",
        "items__variant",
        "tracking_events",
    )


def normalize_phone(phone: str) -> str:
    return "".join(char for char in str(phone or "") if char.isdigit())


def order_matches_phone(order: Order, phone: str) -> bool:
    normalized = normalize_phone(phone)
    snapshot_phone = normalize_phone((order.shipping_address_snapshot or {}).get("phone", ""))
    user_phone = normalize_phone(getattr(order.user, "phone", ""))
    return normalized and normalized in {snapshot_phone, user_phone}


class OrderTrackLookupView(APIView):
    authentication_classes = []
    permission_classes = []
    throttle_scope = "tracking"

    def get(self, request):
        identifier = (request.query_params.get("identifier") or "").strip()
        phone = normalize_phone(request.query_params.get("phone", ""))
        if not identifier or not phone:
            return Response({"detail": "Order number/AWB and phone are required"}, status=status.HTTP_400_BAD_REQUEST)
        candidates = order_queryset().filter(Q(order_number__iexact=identifier) | Q(tracking_number__iexact=identifier))[:20]
        for order in candidates:
            if order_matches_phone(order, phone):
                return Response(OrderSerializer(order).data)
        return Response({"detail": "No matching order found"}, status=status.HTTP_404_NOT_FOUND)


class OrderListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        orders = order_queryset().filter(user=request.user)
        return Response({"items": OrderSerializer(orders, many=True).data, "total": orders.count(), "page": 1, "per_page": orders.count()})

    def post(self, request):
        serializer = OrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            order = create_order_from_cart(user=request.user, **serializer.validated_data)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(OrderSerializer(order_queryset().get(id=order.id)).data, status=status.HTTP_201_CREATED)


class OrderDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id: int):
        order = get_object_or_404(order_queryset(), id=order_id, user=request.user)
        return Response(OrderSerializer(order).data)


def render_invoice_html(order: Order) -> str:
    address = order.shipping_address_snapshot or {}
    item_rows = "".join(
        f"<tr><td>{item.product_name}<br><small>{item.product_sku}</small></td><td>{item.quantity}</td><td>Rs {item.unit_price}</td><td>Rs {item.subtotal}</td></tr>"
        for item in order.items.all()
    )
    return f"""<!doctype html>
<html>
<head><meta charset="utf-8"><title>Invoice {order.order_number}</title></head>
<body style="font-family:Arial,sans-serif;color:#1f1a14">
  <h1>CSM Silks Tax Invoice</h1>
  <p><strong>Invoice:</strong> INV-{order.order_number}</p>
  <p><strong>Order:</strong> {order.order_number}</p>
  <p><strong>Date:</strong> {order.created_at:%d %b %Y}</p>
  <hr>
  <h3>Bill / Ship To</h3>
  <p>{address.get('full_name', order.user.display_name)}<br>
  {address.get('phone', order.user.phone)}<br>
  {address.get('address_line_1', '')} {address.get('address_line_2', '')}<br>
  {address.get('city', '')}, {address.get('state', '')} - {address.get('pin_code', '')}</p>
  <table width="100%" cellspacing="0" cellpadding="8" border="1" style="border-collapse:collapse">
    <thead><tr><th align="left">Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
    <tbody>{item_rows}</tbody>
  </table>
  <p><strong>Subtotal:</strong> Rs {order.subtotal}</p>
  <p><strong>Discount:</strong> Rs {order.discount_amount}</p>
  <p><strong>CGST:</strong> Rs {order.cgst_amount}</p>
  <p><strong>SGST:</strong> Rs {order.sgst_amount}</p>
  <p><strong>Shipping:</strong> Rs {order.shipping_amount}</p>
  <h2>Total: Rs {order.total_amount}</h2>
  <p>CSM Silks, Kanchipuram. GST invoice generated by CSM Commerce.</p>
</body>
</html>"""


class OrderInvoiceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id: int):
        order = get_object_or_404(order_queryset(), id=order_id, user=request.user)
        response = HttpResponse(render_invoice_html(order), content_type="text/html")
        response["Content-Disposition"] = f'attachment; filename="invoice-{order.order_number}.html"'
        return response


class OrderCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id: int):
        order = get_object_or_404(Order, id=order_id, user=request.user)
        if order.status not in {Order.Status.PENDING, Order.Status.PAYMENT_PENDING, Order.Status.CONFIRMED}:
            return Response({"detail": f"Cannot cancel order in {order.status} status"}, status=status.HTTP_400_BAD_REQUEST)
        order.status = Order.Status.CANCELLED
        order.save(update_fields=["status", "updated_at"])
        record_order_status_event(order, note="The order was cancelled before fulfillment.")
        return Response(OrderSerializer(order_queryset().get(id=order.id)).data)


class AdminOrderListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        status_filter = request.query_params.get("status")
        orders = order_queryset().all()
        if status_filter:
            orders = orders.filter(status=status_filter)
        return Response({"items": OrderSerializer(orders[:100], many=True).data, "total": orders.count()})


class AdminOrderStatusView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, order_id: int):
        order = get_object_or_404(Order, id=order_id)
        serializer = AdminOrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        old_status = order.status
        for key, value in serializer.validated_data.items():
            setattr(order, key, value)
        if order.status == Order.Status.SHIPPED and old_status != Order.Status.SHIPPED:
            order.shipped_at = timezone.now()
        if order.status == Order.Status.DELIVERED and old_status != Order.Status.DELIVERED:
            order.delivered_at = timezone.now()
        order.save()
        if old_status != order.status:
            record_order_status_event(order)
        record_admin_audit(
            request,
            action="order.status_update",
            entity=order,
            summary=f"{order.order_number} moved from {old_status} to {order.status}.",
            metadata={"old_status": old_status, "new_status": order.status},
        )
        return Response(OrderSerializer(order_queryset().get(id=order.id)).data)


class AdminOrderWorkflowView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, order_id: int):
        order = get_object_or_404(order_queryset(), id=order_id)
        serializer = AdminOrderWorkflowSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = serializer.validated_data["action"]
        note = serializer.validated_data.get("note", "")
        location = serializer.validated_data.get("location", "")
        provider = serializer.validated_data.get("provider", "manual")

        if action == "create_label":
            shipment = create_shipping_label(order, provider=provider)
            record_admin_audit(
                request,
                action="order.create_label",
                entity=order,
                summary=f"Shipping label created for {order.order_number}.",
                metadata={"provider": shipment.provider, "awb_number": shipment.awb_number},
            )
        elif action == "confirm":
            order.status = Order.Status.CONFIRMED
            order.confirmed_at = order.confirmed_at or timezone.now()
            order.save(update_fields=["status", "confirmed_at", "updated_at"])
            record_order_status_event(order, note=note, location=location)
        elif action == "quality_check":
            order.status = Order.Status.QUALITY_CHECK
            order.save(update_fields=["status", "updated_at"])
            record_order_status_event(order, note=note or "Quality check started.", location=location)
        elif action == "pack":
            order.status = Order.Status.PACKED
            order.save(update_fields=["status", "updated_at"])
            record_order_status_event(order, note=note or "Order packed and ready for courier.", location=location)
        elif action == "cancel":
            order.status = Order.Status.CANCELLED
            order.save(update_fields=["status", "updated_at"])
            record_order_status_event(order, note=note or "Order cancelled by admin.", location=location)
        else:
            shipment = getattr(order, "shipment", None)
            if not shipment:
                shipment = create_shipping_label(order, provider=provider)
            shipment_status = {
                "pickup": Shipment.Status.PICKED_UP,
                "in_transit": Shipment.Status.IN_TRANSIT,
                "out_for_delivery": Shipment.Status.OUT_FOR_DELIVERY,
                "delivery_failed": Shipment.Status.FAILED,
                "rto_initiated": Shipment.Status.RTO_INITIATED,
                "rto_delivered": Shipment.Status.RTO_DELIVERED,
                "delivered": Shipment.Status.DELIVERED,
            }[action]
            shipment.status = shipment_status
            if action == "delivery_failed":
                shipment.rto_reason = note or "Delivery attempt failed."
            shipment.save(update_fields=["status", "rto_reason", "updated_at"])
            apply_shipment_update(shipment, event_location=location, event_note=note)
        if action != "create_label":
            record_admin_audit(
                request,
                action=f"order.workflow.{action}",
                entity=order,
                summary=f"Workflow action {action} applied to {order.order_number}.",
                metadata={"note": note, "location": location, "provider": provider},
            )
        return Response(OrderSerializer(order_queryset().get(id=order.id)).data)


class AdminOrderInvoiceView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, order_id: int):
        order = get_object_or_404(order_queryset(), id=order_id)
        response = HttpResponse(render_invoice_html(order), content_type="text/html")
        response["Content-Disposition"] = f'attachment; filename="invoice-{order.order_number}.html"'
        return response


class ReturnListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        returns = ReturnRequest.objects.filter(user=request.user).select_related("order", "user")
        return Response(ReturnSerializer(returns, many=True).data)

    def post(self, request):
        serializer = ReturnCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = get_object_or_404(Order, id=serializer.validated_data["order_id"], user=request.user)
        ret = ReturnRequest.objects.create(
            order=order,
            user=request.user,
            reason=serializer.validated_data["reason"],
            details=serializer.validated_data.get("details", ""),
        )
        order.status = Order.Status.RETURN_INITIATED
        order.save(update_fields=["status", "updated_at"])
        record_order_status_event(order, note="Return request raised from customer orders page.")
        return Response(ReturnSerializer(ret).data, status=status.HTTP_201_CREATED)


class AdminReturnListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        returns = ReturnRequest.objects.select_related("order", "user").order_by("-created_at")
        return Response(ReturnSerializer(returns, many=True).data)


class AdminReturnDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, return_id: int):
        ret = get_object_or_404(ReturnRequest.objects.select_related("order", "user"), id=return_id)
        serializer = AdminReturnStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ret.status = serializer.validated_data["status"]
        ret.save(update_fields=["status", "updated_at"])
        if ret.status == ReturnRequest.Status.REFUNDED:
            ret.order.status = Order.Status.REFUNDED
            ret.order.save(update_fields=["status", "updated_at"])
            record_order_status_event(ret.order, note="Refund has been recorded by admin.")
        elif ret.status == ReturnRequest.Status.APPROVED:
            ret.order.status = Order.Status.RETURN_INITIATED
            ret.order.save(update_fields=["status", "updated_at"])
            record_order_status_event(ret.order, note="Return request approved by admin.")
        elif ret.status == ReturnRequest.Status.REJECTED and ret.order.status == Order.Status.RETURN_INITIATED:
            ret.order.status = Order.Status.DELIVERED
            ret.order.save(update_fields=["status", "updated_at"])
            record_order_status_event(ret.order, note="Return request rejected; order remains delivered.")
        record_admin_audit(
            request,
            action="return.status_update",
            entity=ret,
            summary=f"Return {ret.id} for {ret.order.order_number} marked {ret.status}.",
            metadata={"order_id": ret.order_id, "status": ret.status},
        )
        return Response(ReturnSerializer(ret).data)
