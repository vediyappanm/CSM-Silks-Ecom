from rest_framework import serializers

from .models import AdminAuditLog


class AdminAuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = AdminAuditLog
        fields = [
            "id",
            "user",
            "user_name",
            "user_email",
            "action",
            "entity_type",
            "entity_id",
            "summary",
            "metadata",
            "ip_address",
            "created_at",
        ]

    def get_user_name(self, obj: AdminAuditLog) -> str:
        return obj.user.display_name if obj.user else "System"

    def get_user_email(self, obj: AdminAuditLog) -> str:
        return obj.user.email if obj.user and obj.user.email else ""
