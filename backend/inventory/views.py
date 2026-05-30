from __future__ import annotations

from datetime import timedelta

from django.conf import settings
from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from analytics.audit import record_admin_audit
from catalog.models import ProductVariant

from .models import StockLedger, UnsoldAlert
from .serializers import StockAdjustmentSerializer, StockLedgerSerializer, UnsoldAlertSerializer


class AdminInventoryView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        variants = ProductVariant.objects.select_related("product", "product__category").order_by("stock_qty", "sku")
        return Response(
            [
                {
                    "variant_id": variant.id,
                    "product_id": variant.product_id,
                    "product_name": variant.product.name,
                    "sku": variant.sku,
                    "stock_qty": variant.stock_qty,
                    "reserved_qty": variant.reserved_qty,
                    "available_qty": variant.available_qty,
                    "reorder_level": variant.reorder_level,
                    "low_stock": variant.available_qty <= variant.reorder_level,
                }
                for variant in variants
            ]
        )

    def post(self, request):
        serializer = StockAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        variant = get_object_or_404(ProductVariant, id=serializer.validated_data["variant_id"])
        delta = serializer.validated_data["quantity_delta"]
        variant.stock_qty = max(0, variant.stock_qty + delta)
        variant.save(update_fields=["stock_qty", "updated_at"])
        ledger = StockLedger.objects.create(
            variant=variant,
            quantity_delta=delta,
            reason=StockLedger.Reason.ADJUSTMENT,
            note=serializer.validated_data.get("note", ""),
            created_by=request.user,
        )
        record_admin_audit(
            request,
            action="inventory.adjust",
            entity=variant,
            summary=f"{variant.sku} stock adjusted by {delta}.",
            metadata={"ledger_id": ledger.id, "quantity_delta": delta, "stock_qty": variant.stock_qty},
        )
        return Response(StockLedgerSerializer(ledger).data)


class UnsoldAlertView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        cutoff = timezone.now() - timedelta(days=settings.UNSOLD_ALERT_DAYS)
        variants = ProductVariant.objects.select_related("product").filter(is_active=True, stock_qty__gt=0).filter(
            last_sold_at__isnull=True
        ) | ProductVariant.objects.select_related("product").filter(is_active=True, stock_qty__gt=0, last_sold_at__lt=cutoff)
        alerts = []
        for variant in variants.distinct():
            base_date = variant.last_sold_at or variant.created_at
            days = (timezone.now() - base_date).days
            capital = (variant.cost_price or variant.price) * variant.stock_qty
            severity = "critical" if days >= 45 else "warning" if days >= 30 else "watch"
            alert, _ = UnsoldAlert.objects.get_or_create(
                product=variant.product,
                variant=variant,
                resolved=False,
                defaults={"days_unsold": days, "stock_qty": variant.stock_qty, "capital_blocked": capital, "severity": severity},
            )
            if alert.days_unsold != days or alert.stock_qty != variant.stock_qty:
                alert.days_unsold = days
                alert.stock_qty = variant.stock_qty
                alert.capital_blocked = capital
                alert.severity = severity
                alert.save(update_fields=["days_unsold", "stock_qty", "capital_blocked", "severity"])
            alerts.append(alert)
        return Response({"count": len(alerts), "total_capital_blocked": sum(a.capital_blocked for a in alerts), "items": UnsoldAlertSerializer(alerts, many=True).data})
