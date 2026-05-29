from django.urls import path

from .views import LoyaltyBalanceView, LoyaltyHistoryView, LoyaltyRedeemView, LoyaltyRewardsView

urlpatterns = [
    path("loyalty/balance", LoyaltyBalanceView.as_view()),
    path("loyalty/history", LoyaltyHistoryView.as_view()),
    path("loyalty/rewards", LoyaltyRewardsView.as_view()),
    path("loyalty/redeem/<int:reward_id>", LoyaltyRedeemView.as_view()),
]
