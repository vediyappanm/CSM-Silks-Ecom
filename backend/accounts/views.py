from __future__ import annotations

import random

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Address, OTPChallenge
from .serializers import (
    AddressSerializer,
    AdminLoginSerializer,
    OTPRequestSerializer,
    OTPVerifySerializer,
    UserSerializer,
)

User = get_user_model()


def normalize_phone(phone: str) -> str:
    raw = str(phone or "").strip()
    digits = "".join(char for char in raw if char.isdigit())
    return f"+{digits}" if raw.startswith("+") and digits else digits


def token_payload(user) -> dict:
    refresh = RefreshToken.for_user(user)
    return {
        "access_token": str(refresh.access_token),
        "refresh_token": str(refresh),
        "user": UserSerializer(user).data,
    }


class SendOTPView(APIView):
    authentication_classes = []
    permission_classes = []
    throttle_scope = "otp"

    def post(self, request):
        serializer = OTPRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = normalize_phone(serializer.validated_data["phone"])
        otp = f"{random.randint(100000, 999999)}"
        OTPChallenge.objects.create(phone=phone, otp_hash=make_password(otp), expires_at=OTPChallenge.expiry_time())
        return Response({"message": "OTP sent", "dev_otp": otp})


class VerifyOTPView(APIView):
    authentication_classes = []
    permission_classes = []
    throttle_scope = "otp"

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = normalize_phone(serializer.validated_data["phone"])
        otp = serializer.validated_data["otp"]
        challenge = OTPChallenge.objects.filter(phone=phone).order_by("-created_at").first()
        if not challenge or not challenge.is_active:
            return Response({"detail": "Invalid or expired OTP"}, status=status.HTTP_400_BAD_REQUEST)
        challenge.attempts += 1
        challenge.save(update_fields=["attempts"])
        if challenge.attempts > 5 or not check_password(otp, challenge.otp_hash):
            return Response({"detail": "Invalid or expired OTP"}, status=status.HTTP_400_BAD_REQUEST)
        challenge.mark_consumed()
        user, created = User.objects.get_or_create(
            phone=phone,
            defaults={"username": phone, "is_verified": True, "role": User.Role.CUSTOMER},
        )
        if created is False and not user.is_verified:
            user.is_verified = True
            user.save(update_fields=["is_verified"])
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])
        return Response(token_payload(user))


class AdminLoginView(APIView):
    authentication_classes = []
    permission_classes = []
    throttle_scope = "admin_login"

    def post(self, request):
        serializer = AdminLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower()
        password = serializer.validated_data["password"]
        user = User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)).first()
        if not user or not user.check_password(password) or not user.is_staff_admin:
            return Response({"detail": "Invalid admin credentials"}, status=status.HTTP_401_UNAUTHORIZED)
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])
        return Response(token_payload(user))


class RefreshView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        refresh_value = request.data.get("refresh") or request.data.get("refresh_token")
        if not refresh_value:
            return Response({"detail": "refresh token required"}, status=status.HTTP_400_BAD_REQUEST)
        refresh = RefreshToken(refresh_value)
        user_id = refresh.get("user_id")
        user = User.objects.get(id=user_id)
        return Response({"access_token": str(refresh.access_token), "refresh_token": str(refresh), "user": UserSerializer(user).data})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({"message": "Logged out"})


class MeView(RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class AddressListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(AddressSerializer(request.user.addresses.all(), many=True).data)

    def post(self, request):
        serializer = AddressSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        address = serializer.save()
        return Response(AddressSerializer(address).data, status=status.HTTP_201_CREATED)


class AddressDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, address_id: int):
        address = Address.objects.get(id=address_id, user=request.user)
        serializer = AddressSerializer(address, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return Response(AddressSerializer(serializer.save()).data)

    def delete(self, request, address_id: int):
        Address.objects.filter(id=address_id, user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
