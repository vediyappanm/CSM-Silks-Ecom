from __future__ import annotations

from django.db import models

from .models import AdminAuditLog


def _client_ip(request) -> str | None:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip() or None
    return request.META.get("REMOTE_ADDR")


def record_admin_audit(
    request,
    *,
    action: str,
    entity: models.Model | None = None,
    entity_type: str = "",
    entity_id: str | int = "",
    summary: str = "",
    metadata: dict | None = None,
) -> AdminAuditLog:
    user = getattr(request, "user", None)
    if not getattr(user, "is_authenticated", False):
        user = None
    resolved_type = entity_type or (entity.__class__.__name__ if entity is not None else "system")
    resolved_id = entity_id or (getattr(entity, "pk", "") if entity is not None else "")
    return AdminAuditLog.objects.create(
        user=user,
        action=action,
        entity_type=resolved_type,
        entity_id=str(resolved_id or ""),
        summary=summary or action.replace(".", " ").title(),
        metadata=metadata or {},
        ip_address=_client_ip(request),
    )
