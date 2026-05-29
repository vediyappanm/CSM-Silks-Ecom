from django.urls import path

from .views import RazorpayOrderView, RazorpayVerifyView, RazorpayWebhookView, RefundView

urlpatterns = [
    path("payments/razorpay/order", RazorpayOrderView.as_view()),
    path("payments/razorpay/verify", RazorpayVerifyView.as_view()),
    path("payments/webhook", RazorpayWebhookView.as_view()),
    path("payments/refund", RefundView.as_view()),
]
