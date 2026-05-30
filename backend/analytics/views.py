from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from ai.models import TryOnSession
from catalog.models import Product
from inventory.models import UnsoldAlert
from orders.models import Order, OrderItem

from .models import AdminAuditLog
from .serializers import AdminAuditLogSerializer

User = get_user_model()


class AdminDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        today = timezone.localdate()
        month_start = today.replace(day=1)
        revenue_today = Order.objects.filter(created_at__date=today).aggregate(total=Sum("total_amount"))["total"] or 0
        revenue_month = Order.objects.filter(created_at__date__gte=month_start).aggregate(total=Sum("total_amount"))["total"] or 0
        orders_today = Order.objects.filter(created_at__date=today).count()
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
                    "revenue_today": revenue_today,
                    "revenue_month": revenue_month,
                    "orders_today": orders_today,
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
    permission_classes = [IsAdminUser]

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
    permission_classes = [IsAdminUser]

    def get(self, request):
        taxable = Order.objects.aggregate(total=Sum("subtotal"))["total"] or 0
        cgst = Order.objects.aggregate(total=Sum("cgst_amount"))["total"] or 0
        sgst = Order.objects.aggregate(total=Sum("sgst_amount"))["total"] or 0
        revenue = Order.objects.aggregate(total=Sum("total_amount"))["total"] or 0
        orders = Order.objects.count()
        return Response({"total_revenue": revenue, "total_orders": orders, "taxable_sales": taxable, "cgst": cgst, "sgst": sgst, "gst_total": cgst + sgst})


class AdminAuditLogView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        logs = AdminAuditLog.objects.select_related("user").order_by("-created_at")[:100]
        return Response(AdminAuditLogSerializer(logs, many=True).data)
