from django.urls import path

from .views import AdminLoginView, LogoutView, MeView, RefreshView, SendOTPView, VerifyOTPView

urlpatterns = [
    path("otp/send", SendOTPView.as_view()),
    path("otp/verify", VerifyOTPView.as_view()),
    path("admin/login", AdminLoginView.as_view()),
    path("refresh", RefreshView.as_view()),
    path("logout", LogoutView.as_view()),
    path("me", MeView.as_view()),
]
