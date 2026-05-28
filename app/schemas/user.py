"""app/schemas/user.py"""
from __future__ import annotations
import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator
from app.models.user import UserRole, LoyaltyTier


class OTPRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        digits = v.replace("+", "").replace(" ", "")
        if not digits.isdigit() or len(digits) < 10:
            raise ValueError("Invalid phone number")
        return v


class OTPVerify(BaseModel):
    phone: str
    otp: str


class UserCreate(BaseModel):
    phone: str
    full_name: str | None = None
    email: EmailStr | None = None


class UserLogin(BaseModel):
    phone: str
    password: str | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    skin_tone: str | None = None
    body_type: str | None = None
    city: str | None = None
    state: str | None = None
    wa_opted_in: bool | None = None
    fcm_token: str | None = None


class UserResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    phone: str
    email: str | None
    full_name: str | None
    role: UserRole
    loyalty_points: int
    loyalty_tier: LoyaltyTier
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class RefreshRequest(BaseModel):
    refresh_token: str
