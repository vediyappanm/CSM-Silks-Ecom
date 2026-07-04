from django.urls import path

from .views import AdminLoginView, AuthConfigView, GoogleCodeExchangeView, GoogleLoginView, LogoutView, MeView, RefreshView, SendOTPView, VerifyOTPView

urlpatterns = [
    path("config", AuthConfigView.as_view()),
    path("google", GoogleLoginView.as_view()),
    path("google/exchange", GoogleCodeExchangeView.as_view()),
    path("otp/send", SendOTPView.as_view()),
    path("otp/verify", VerifyOTPView.as_view()),
    path("admin/login", AdminLoginView.as_view()),
    path("refresh", RefreshView.as_view()),
    path("logout", LogoutView.as_view()),
    path("me", MeView.as_view()),
]
