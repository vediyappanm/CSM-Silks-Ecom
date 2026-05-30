from __future__ import annotations

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Order
from orders.services import confirm_paid_order
from shipping.models import ShipmentEvent
from shipping.services import record_tracking_event

from .models import Payment, RazorpayWebhookEvent
from .serializers import RazorpayOrderCreateSerializer, RazorpayVerifySerializer, RefundSerializer
from .services import create_gateway_order, verify_payment_signature, verify_webhook_signature


class RazorpayOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RazorpayOrderCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = Order.objects.get(id=serializer.validated_data["order_id"], user=request.user)
        amount_paise = int(order.total_amount * 100)
        gateway_order = create_gateway_order(amount_paise, order.order_number, {"order_id": str(order.id), "user_id": str(request.user.id)})
        payment, _ = Payment.objects.get_or_create(order=order, defaults={"amount": order.total_amount})
        payment.razorpay_order_id = gateway_order["id"]
        payment.amount = order.total_amount
        payment.status = Payment.Status.PENDING
        payment.save(update_fields=["razorpay_order_id", "amount", "status", "updated_at"])
        order.status = Order.Status.PAYMENT_PENDING
        order.save(update_fields=["status", "updated_at"])
        return Response(
            {
                "razorpay_order_id": gateway_order["id"],
                "amount": amount_paise,
                "currency": "INR",
                "order_id": order.id,
                "key": settings.RAZORPAY_KEY_ID,
            }
        )


class RazorpayVerifyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RazorpayVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if not verify_payment_signature(data["razorpay_order_id"], data["razorpay_payment_id"], data["razorpay_signature"]):
            return Response({"detail": "Payment signature verification failed"}, status=status.HTTP_400_BAD_REQUEST)
        payment = Payment.objects.select_related("order", "order__user").get(razorpay_order_id=data["razorpay_order_id"], order__user=request.user)
        payment.razorpay_payment_id = data["razorpay_payment_id"]
        payment.razorpay_signature = data["razorpay_signature"]
        payment.status = Payment.Status.CAPTURED
        payment.is_hmac_verified = True
        payment.paid_at = timezone.now()
        payment.save()
        order = confirm_paid_order(payment.order)
        return Response({"message": "Payment verified", "order_number": order.order_number, "order_id": order.id})


class RazorpayWebhookView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        body = request.body
        signature = request.headers.get("X-Razorpay-Signature", "")
        if not verify_webhook_signature(body, signature):
            return Response({"detail": "Invalid webhook signature"}, status=status.HTTP_400_BAD_REQUEST)
        payload = request.data
        event_id = payload.get("id") or f"{payload.get('event', 'event')}-{payload.get('created_at', timezone.now().timestamp())}"
        event, created = RazorpayWebhookEvent.objects.get_or_create(
            event_id=event_id,
            defaults={"event_type": payload.get("event", ""), "payload": payload},
        )
        if not created and event.processed_at:
            return Response({"status": "duplicate"})

        event_type = payload.get("event", "")
        entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        rz_order_id = entity.get("order_id")
        payment = Payment.objects.filter(razorpay_order_id=rz_order_id).select_related("order").first()
        if payment and event_type == "payment.captured":
            payment.status = Payment.Status.CAPTURED
            payment.razorpay_payment_id = entity.get("id", payment.razorpay_payment_id)
            payment.paid_at = timezone.now()
            payment.save()
            confirm_paid_order(payment.order)
        elif payment and event_type == "payment.failed":
            payment.status = Payment.Status.FAILED
            payment.save(update_fields=["status", "updated_at"])
            record_tracking_event(payment.order, ShipmentEvent.Status.PAYMENT_PENDING, description="Payment failed. Customer can retry checkout.")

        event.processed_at = timezone.now()
        event.save(update_fields=["processed_at"])
        return Response({"status": "ok"})


class RefundView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = RefundSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = Payment.objects.select_related("order").get(order_id=serializer.validated_data["order_id"])
        amount = serializer.validated_data.get("amount") or payment.amount
        payment.refunded_amount = amount
        payment.status = Payment.Status.REFUNDED
        payment.refund_id = f"refund_dev_{payment.id}"
        payment.order.status = Order.Status.REFUNDED
        payment.order.save(update_fields=["status", "updated_at"])
        record_tracking_event(payment.order, ShipmentEvent.Status.REFUNDED, description="Refund has been recorded by admin.")
        payment.save()
        return Response({"message": "Refund recorded", "refund_id": payment.refund_id})
