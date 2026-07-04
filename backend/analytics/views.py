from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Count, Q, Sum
from django.utils import timezone
from accounts.permissions import IsStaffAdmin
from rest_framework.response import Response
from rest_framework.views import APIView

from ai.models import TryOnSession
from catalog.models import Product
from inventory.models import UnsoldAlert
from orders.models import Order, OrderItem, ReturnRequest
from payments.models import Payment

from .models import AdminAuditLog
from .serializers import AdminAuditLogSerializer

User = get_user_model()

PAID_PAYMENT_STATUSES = {
    Payment.Status.CAPTURED,
    Payment.Status.PARTIALLY_REFUNDED,
    Payment.Status.REFUNDED,
}


def zero_money() -> Decimal:
    return Decimal("0.00")


def payment_revenue(payments):
    gross = payments.aggregate(total=Sum("amount"))["total"] or zero_money()
    refunds = payments.aggregate(total=Sum("refunded_amount"))["total"] or zero_money()
    net = gross - refunds
    return {
        "gross": gross,
        "refunds": refunds,
        "net": net,
        "paid_orders": payments.count(),
        "refunded_orders": payments.filter(status=Payment.Status.REFUNDED).count(),
        "partially_refunded_orders": payments.filter(status=Payment.Status.PARTIALLY_REFUNDED).count(),
    }


def paid_payments():
    return Payment.objects.select_related("order", "order__user").filter(status__in=PAID_PAYMENT_STATUSES)


class AdminDashboardView(APIView):
    permission_classes = [IsStaffAdmin]

    def get(self, request):
        today = timezone.localdate()
        month_start = today.replace(day=1)
        payments = paid_payments()
        today_revenue = payment_revenue(payments.filter(order__created_at__date=today))
        month_revenue = payment_revenue(payments.filter(order__created_at__date__gte=month_start))
        orders_today = Order.objects.filter(created_at__date=today).count()
        returns_today = ReturnRequest.objects.filter(created_at__date=today).count()
        low_stock = Product.objects.filter(variants__stock_qty__lte=5, is_active=True).distinct().count()
        unsold = UnsoldAlert.objects.filter(resolved=False)
        recent_orders = Order.objects.order_by("-created_at")[:10]
        top = (
            OrderItem.objects.values("product_name")
            .annotate(units=Sum("quantity"))
            .order_by("-units")
            .first()
        )
        return Response(
            {
                "kpis": {
                    "revenue_today": today_revenue["net"],
                    "revenue_month": month_revenue["net"],
                    "gross_revenue_today": today_revenue["gross"],
                    "gross_revenue_month": month_revenue["gross"],
                    "refunds_today": today_revenue["refunds"],
                    "refunds_month": month_revenue["refunds"],
                    "net_revenue_today": today_revenue["net"],
                    "net_revenue_month": month_revenue["net"],
                    "orders_today": orders_today,
                    "paid_orders_today": today_revenue["paid_orders"],
                    "refunded_orders_today": today_revenue["refunded_orders"],
                    "partially_refunded_orders_today": today_revenue["partially_refunded_orders"],
                    "returns_today": returns_today,
                    "total_customers": User.objects.filter(role=User.Role.CUSTOMER).count(),
                    "tryon_sessions_today": TryOnSession.objects.filter(created_at__date=today).count(),
                    "low_stock_products": low_stock,
                    "unsold_alerts": unsold.count(),
                    "capital_blocked": unsold.aggregate(total=Sum("capital_blocked"))["total"] or 0,
                    "top_product": top or {},
                },
                "recent_orders": [
                    {
                        "id": order.id,
                        "order_number": order.order_number,
                        "customer": order.user.display_name,
                        "status": order.status,
                        "total": order.total_amount,
                        "created_at": order.created_at,
                    }
                    for order in recent_orders
                ],
            }
        )


class AdminCustomersView(APIView):
    permission_classes = [IsStaffAdmin]

    def get(self, request):
        users = User.objects.filter(role=User.Role.CUSTOMER).annotate(order_count=Count("orders"), total_spent=Sum("orders__total_amount")).order_by("-date_joined")[:100]
        return Response(
            [
                {
                    "id": user.id,
                    "name": user.display_name,
                    "email": user.email,
                    "phone": user.phone,
                    "orders": user.order_count,
                    "spent": user.total_spent or 0,
                    "tier": user.loyalty_tier,
                    "since": user.date_joined,
                }
                for user in users
            ]
        )


class AdminReportsView(APIView):
    permission_classes = [IsStaffAdmin]

    def get(self, request):
        payments = paid_payments()
        revenue = payment_revenue(payments)
        paid_order_ids = payments.values_list("order_id", flat=True)
        paid_orders = Order.objects.filter(id__in=paid_order_ids)
        taxable = paid_orders.aggregate(total=Sum("subtotal"))["total"] or zero_money()
        cgst = paid_orders.aggregate(total=Sum("cgst_amount"))["total"] or zero_money()
        sgst = paid_orders.aggregate(total=Sum("sgst_amount"))["total"] or zero_money()
        total_orders = Order.objects.count()
        return_orders = ReturnRequest.objects.filter(status=ReturnRequest.Status.REFUNDED).count()
        return_rate = zero_money()
        if revenue["paid_orders"]:
            return_rate = (Decimal(return_orders) / Decimal(revenue["paid_orders"]) * Decimal("100")).quantize(Decimal("0.01"))
        return Response(
            {
                "total_revenue": revenue["net"],
                "gross_revenue": revenue["gross"],
                "refunds": revenue["refunds"],
                "net_revenue": revenue["net"],
                "total_orders": total_orders,
                "paid_orders": revenue["paid_orders"],
                "refunded_orders": revenue["refunded_orders"],
                "partially_refunded_orders": revenue["partially_refunded_orders"],
                "return_orders": return_orders,
                "return_rate": return_rate,
                "taxable_sales": taxable,
                "cgst": cgst,
                "sgst": sgst,
                "gst_total": cgst + sgst,
            }
        )


class AdminAuditLogView(APIView):
    permission_classes = [IsStaffAdmin]

    def get(self, request):
        logs = AdminAuditLog.objects.select_related("user").order_by("-created_at")
        action = request.query_params.get("action", "").strip()
        entity_type = request.query_params.get("entity_type", "").strip()
        query = request.query_params.get("q", "").strip()
        if action:
            logs = logs.filter(action=action)
        if entity_type:
            logs = logs.filter(entity_type__iexact=entity_type)
        if query:
            logs = logs.filter(
                Q(action__icontains=query)
                | Q(entity_type__icontains=query)
                | Q(entity_id__icontains=query)
                | Q(summary__icontains=query)
            )
        logs = logs[:100]
        return Response(AdminAuditLogSerializer(logs, many=True).data)
