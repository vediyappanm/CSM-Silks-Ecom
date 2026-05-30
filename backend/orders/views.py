from __future__ import annotations

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Order, ReturnRequest
from .serializers import AdminOrderStatusSerializer, AdminReturnStatusSerializer, OrderCreateSerializer, OrderSerializer, ReturnCreateSerializer, ReturnSerializer
from .services import create_order_from_cart
from shipping.services import record_order_status_event


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
        return Response(OrderSerializer(order_queryset().get(id=order.id)).data)


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
        return Response(ReturnSerializer(ret).data)
