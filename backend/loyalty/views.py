from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import LoyaltyReward, LoyaltyTransaction
from .serializers import LoyaltyRewardSerializer, LoyaltyTransactionSerializer


class LoyaltyBalanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"points": request.user.loyalty_points, "tier": request.user.loyalty_tier, "rupee_value": request.user.loyalty_points})


class LoyaltyHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        txns = LoyaltyTransaction.objects.filter(user=request.user)
        return Response(LoyaltyTransactionSerializer(txns, many=True).data)


class LoyaltyRewardsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        rewards = LoyaltyReward.objects.filter(is_active=True)
        return Response(LoyaltyRewardSerializer(rewards, many=True).data)


class LoyaltyRedeemView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, reward_id: int):
        reward = LoyaltyReward.objects.get(id=reward_id, is_active=True)
        if request.user.loyalty_points < reward.points_required:
            return Response({"detail": "Not enough loyalty points"}, status=status.HTTP_400_BAD_REQUEST)
        request.user.loyalty_points -= reward.points_required
        request.user.save(update_fields=["loyalty_points"])
        txn = LoyaltyTransaction.objects.create(
            user=request.user,
            transaction_type=LoyaltyTransaction.Type.REDEEM,
            points=-reward.points_required,
            balance_after=request.user.loyalty_points,
            description=f"Redeemed {reward.name}",
        )
        return Response({"message": "Reward redeemed", "transaction": LoyaltyTransactionSerializer(txn).data})
