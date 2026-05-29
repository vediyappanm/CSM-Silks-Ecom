from rest_framework import serializers

from .models import LoyaltyReward, LoyaltyTransaction


class LoyaltyTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltyTransaction
        fields = ["id", "transaction_type", "points", "balance_after", "description", "created_at"]


class LoyaltyRewardSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoyaltyReward
        fields = ["id", "name", "description", "points_required", "reward_type", "reward_value", "is_active"]
