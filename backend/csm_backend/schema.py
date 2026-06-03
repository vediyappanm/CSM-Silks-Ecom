from __future__ import annotations

from drf_spectacular.openapi import AutoSchema
from rest_framework import serializers
from rest_framework.views import APIView


class OpenApiFallbackSerializer(serializers.Serializer):
    detail = serializers.CharField(required=False)


class CSMAutoSchema(AutoSchema):
    def _get_serializer(self):
        view = self.view
        has_explicit_serializer = any(
            callable(getattr(view, name, None))
            for name in ("get_serializer", "get_serializer_class")
        ) or hasattr(view, "serializer_class")
        if isinstance(view, APIView) and not has_explicit_serializer:
            return OpenApiFallbackSerializer
        return super()._get_serializer()

    def get_operation_id(self) -> str:
        operation_id = super().get_operation_id()
        path_variables = [part.strip("{}") for part in self.path.split("/") if part.startswith("{") and part.endswith("}")]
        if not path_variables:
            return operation_id
        base, _, action = operation_id.rpartition("_")
        if not base:
            return operation_id
        return f"{base}_by_{path_variables[-1]}_{action}"
