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
            "avatar_url",
        ]
        read_only_fields = ["id", "username", "role", "is_verified", "loyalty_points", "loyalty_tier"]

    def validate_email(self, value: str) -> str:
        email = (value or "").strip().lower()
        if not email:
            return email
        qs = User.objects.filter(email__iexact=email)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Email already belongs to another account")
        return email


class OTPRequestSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=15)
    email = serializers.EmailField(required=False, allow_blank=True)


class OTPVerifySerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=15)
    otp = serializers.CharField(max_length=6)
    full_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    wa_opted_in = serializers.BooleanField(required=False)
    push_opted_in = serializers.BooleanField(required=False)


class GoogleLoginSerializer(serializers.Serializer):
    id_token = serializers.CharField()
    nonce = serializers.CharField(required=False, allow_blank=True)


class GoogleCodeExchangeSerializer(serializers.Serializer):
    code = serializers.CharField()
    redirect_uri = serializers.CharField()


class AdminLoginSerializer(serializers.Serializer):
    email = serializers.CharField()
    password = serializers.CharField(write_only=True)


class RefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class TokenResponseSerializer(serializers.Serializer):
    access_token = serializers.CharField()
    refresh_token = serializers.CharField()
    user = UserSerializer()


class AddressSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    last_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    address_line_1 = serializers.CharField(required=False)
    address_line_2 = serializers.CharField(required=False, allow_blank=True)
    address_line1 = serializers.CharField(source="address_line_1", required=False)
    address_line2 = serializers.CharField(source="address_line_2", required=False, allow_blank=True)
    pin_code = serializers.CharField(required=False)
    pincode = serializers.CharField(source="pin_code", required=False)

    class Meta:
        model = Address
        fields = [
            "id",
            "label",
            "full_name",
            "first_name",
            "last_name",
            "email",
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

    def validate(self, attrs):
        errors = {}
        first_name = attrs.pop("first_name", "").strip()
        last_name = attrs.pop("last_name", "").strip()
        if not attrs.get("full_name") and (first_name or last_name):
            attrs["full_name"] = f"{first_name} {last_name}".strip()
        if not attrs.get("full_name") and not getattr(self.instance, "full_name", ""):
            errors["full_name"] = ["This field is required."]
        if not attrs.get("phone") and not getattr(self.instance, "phone", ""):
            errors["phone"] = ["This field is required."]
        if not attrs.get("address_line_1") and not getattr(self.instance, "address_line_1", ""):
            errors["address_line_1"] = ["This field is required."]
        if not attrs.get("city") and not getattr(self.instance, "city", ""):
            errors["city"] = ["This field is required."]
        if not attrs.get("state") and not getattr(self.instance, "state", ""):
            errors["state"] = ["This field is required."]
        if not attrs.get("pin_code") and not getattr(self.instance, "pin_code", ""):
            errors["pin_code"] = ["This field is required."]
        pin_code = attrs.get("pin_code") or getattr(self.instance, "pin_code", "")
        if pin_code and not str(pin_code).strip().isdigit():
            errors["pin_code"] = ["Enter a valid numeric PIN code."]
        elif pin_code and len(str(pin_code).strip()) != 6:
            errors["pin_code"] = ["PIN code must be 6 digits."]
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        if validated_data.get("is_default"):
            Address.objects.filter(user=user, is_default=True).update(is_default=False)
        return Address.objects.create(user=user, **validated_data)

    def update(self, instance, validated_data):
        if validated_data.get("is_default"):
            Address.objects.filter(user=instance.user, is_default=True).exclude(id=instance.id).update(is_default=False)
        return super().update(instance, validated_data)
