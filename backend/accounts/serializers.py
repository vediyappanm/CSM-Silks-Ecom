from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Address

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="display_name", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "phone",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "name",
            "role",
            "is_verified",
            "loyalty_points",
            "loyalty_tier",
            "skin_tone",
            "body_type",
            "city",
            "state",
            "wa_opted_in",
            "push_opted_in",
        ]
        read_only_fields = ["id", "username", "role", "is_verified", "loyalty_points", "loyalty_tier"]


class OTPRequestSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=15)


class OTPVerifySerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=15)
    otp = serializers.CharField(max_length=6)


class AdminLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class RefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class TokenResponseSerializer(serializers.Serializer):
    access_token = serializers.CharField()
    refresh_token = serializers.CharField()
    user = UserSerializer()


class AddressSerializer(serializers.ModelSerializer):
    address_line1 = serializers.CharField(source="address_line_1", required=False)
    address_line2 = serializers.CharField(source="address_line_2", required=False, allow_blank=True)
    pincode = serializers.CharField(source="pin_code", required=False)

    class Meta:
        model = Address
        fields = [
            "id",
            "label",
            "full_name",
            "phone",
            "address_line_1",
            "address_line_2",
            "address_line1",
            "address_line2",
            "city",
            "state",
            "pin_code",
            "pincode",
            "country",
            "is_default",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def create(self, validated_data):
        user = self.context["request"].user
        if validated_data.get("is_default"):
            Address.objects.filter(user=user, is_default=True).update(is_default=False)
        return Address.objects.create(user=user, **validated_data)

    def update(self, instance, validated_data):
        if validated_data.get("is_default"):
            Address.objects.filter(user=instance.user, is_default=True).exclude(id=instance.id).update(is_default=False)
        return super().update(instance, validated_data)
