from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.models.tryon import LoyaltyTransaction, LoyaltyReward
from app.utils.auth import get_current_user

router = APIRouter(prefix="/loyalty", tags=["loyalty"])

TIER_THRESHOLDS = {
    "bronze": 0, "silver": 1000, "gold": 3000, "platinum": 6000, "elite": 12000
}


def _get_tier(points: int) -> str:
    tier = "bronze"
    for name, threshold in TIER_THRESHOLDS.items():
        if points >= threshold:
            tier = name
    return tier


@router.get("/balance")
async def get_balance(current_user: User = Depends(get_current_user)):
    tier = _get_tier(current_user.loyalty_points)
    next_tier = None
    next_threshold = None
    tiers = list(TIER_THRESHOLDS.items())
    for i, (name, threshold) in enumerate(tiers):
        if name == tier and i + 1 < len(tiers):
            next_tier, next_threshold = tiers[i + 1]
            break
    return {
        "points": current_user.loyalty_points,
        "tier": tier,
        "rupee_value": round(current_user.loyalty_points * 0.10, 2),
        "next_tier": next_tier,
        "points_to_next_tier": max(0, (next_threshold or 0) - current_user.loyalty_points),
    }


@router.get("/history")
async def get_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LoyaltyTransaction)
        .where(LoyaltyTransaction.user_id == current_user.id)
        .order_by(LoyaltyTransaction.created_at.desc())
        .limit(50)
    )
    transactions = result.scalars().all()
    return [
        {
            "type": t.transaction_type,
            "points": t.points,
            "balance_after": t.balance_after,
            "description": t.description,
            "created_at": t.created_at.isoformat(),
        }
        for t in transactions
    ]


@router.get("/rewards")
async def list_rewards(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LoyaltyReward).where(LoyaltyReward.is_active == True))
    rewards = result.scalars().all()
    return [
        {
            "id": str(r.id), "name": r.name, "description": r.description,
            "points_required": r.points_required, "reward_type": r.reward_type,
            "reward_value": r.reward_value,
        }
        for r in rewards
    ]


@router.post("/redeem/{reward_id}")
async def redeem_reward(
    reward_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import uuid
    result = await db.execute(select(LoyaltyReward).where(LoyaltyReward.id == uuid.UUID(reward_id)))
    reward = result.scalar_one_or_none()
    if not reward or not reward.is_active:
        raise HTTPException(404, "Reward not found")
    if current_user.loyalty_points < reward.points_required:
        raise HTTPException(400, f"Insufficient points. Need {reward.points_required}, have {current_user.loyalty_points}")

    current_user.loyalty_points -= reward.points_required
    txn = LoyaltyTransaction(
        user_id=current_user.id,
        transaction_type="redeem",
        points=-reward.points_required,
        balance_after=current_user.loyalty_points,
        description=f"Redeemed: {reward.name}",
    )
    db.add(txn)
    await db.commit()
    return {"message": f"Redeemed {reward.name}", "points_remaining": current_user.loyalty_points}
