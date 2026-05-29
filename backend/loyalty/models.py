from django.conf import settings
from django.db import models


class LoyaltyTransaction(models.Model):
    class Type(models.TextChoices):
        EARN = "earn", "Earn"
        REDEEM = "redeem", "Redeem"
        EXPIRE = "expire", "Expire"
        BONUS = "bonus", "Bonus"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="loyalty_transactions", on_delete=models.CASCADE)
    order_id = models.PositiveIntegerField(null=True, blank=True)
    transaction_type = models.CharField(max_length=20, choices=Type.choices)
    points = models.IntegerField()
    balance_after = models.IntegerField()
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]


class LoyaltyReward(models.Model):
    name = models.CharField(max_length=120)
    description = models.TextField()
    points_required = models.PositiveIntegerField()
    reward_type = models.CharField(max_length=40)
    reward_value = models.DecimalField(max_digits=12, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["points_required"]
