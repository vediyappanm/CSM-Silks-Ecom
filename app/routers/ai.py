import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.product import Product
from app.models.order import Order
from app.models.tryon import TryOnSession
from app.models.user import User
from app.schemas.ai import (
    TryOnRequest, TryOnResponse,
    VoiceSearchRequest, VoiceSearchResponse,
    AdminChatRequest,
)
from app.services.ai_service import ai_service
from app.utils.auth import get_current_user, get_optional_user, get_current_admin

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/tryon", response_model=TryOnResponse)
async def virtual_try_on(
    body: TryOnRequest,
    current_user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    prod_result = await db.execute(
        select(Product).where(Product.id == body.product_id, Product.is_active == True)
    )
    product = prod_result.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")

    import time
    t0 = time.time()
    ai_result = await ai_service.virtual_try_on(
        skin_tone=body.skin_tone,
        body_type=body.body_type,
        drape_style=body.drape_style,
        occasion=body.occasion,
        product_name=product.name,
        category=product.category.value,
        colour=product.colours[0] if product.colours else "gold",
        zari_type=product.zari_type or "Real Gold Zari",
    )
    latency_ms = int((time.time() - t0) * 1000)

    session = TryOnSession(
        user_id=current_user.id if current_user else None,
        product_id=product.id,
        skin_tone=body.skin_tone,
        body_type=body.body_type,
        drape_style=body.drape_style,
        occasion=body.occasion,
        ai_result=ai_result,
        confidence_score=ai_result.get("confidence_score", 85),
        model_used=ai_service.primary,
        tokens_used=ai_result.get("_meta", {}).get("tokens", 0),
        latency_ms=latency_ms,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return TryOnResponse(
        draping_tip=ai_result["draping_tip"],
        colour_analysis=ai_result["colour_analysis"],
        blouse_suggestion=ai_result["blouse_suggestion"],
        jewellery_pairing=ai_result["jewellery_pairing"],
        footwear=ai_result["footwear"],
        confidence_score=ai_result["confidence_score"],
        ai_verdict=ai_result["ai_verdict"],
        alternative_colours=ai_result.get("alternative_colours", []),
        session_id=session.id,
    )


@router.post("/voice-search", response_model=VoiceSearchResponse)
async def voice_search(body: VoiceSearchRequest, db: AsyncSession = Depends(get_db)):
    result = await ai_service.voice_search(body.transcript, body.context)
    return VoiceSearchResponse(**result)


@router.post("/recommend")
async def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Build user data context
    products_result = await db.execute(
        select(Product.slug).where(Product.is_active == True).limit(50)
    )
    slugs = [r[0] for r in products_result.all()]

    user_data = {
        "skin_tone": current_user.skin_tone or "unknown",
        "avg_order_value": 8000,
    }
    recommendations = await ai_service.get_recommendations(user_data, slugs)
    return {"recommendations": recommendations}


@router.post("/admin/chat/stream")
async def admin_chat_stream(
    body: AdminChatRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    # Fetch live stats
    revenue_result = await db.execute(
        select(func.sum(Order.total_amount)).where(
            func.date(Order.created_at) == func.current_date()
        )
    )
    revenue = revenue_result.scalar() or 0.0
    orders_result = await db.execute(
        select(func.count()).select_from(Order).where(
            func.date(Order.created_at) == func.current_date()
        )
    )
    orders_count = orders_result.scalar() or 0

    live_data = {
        "revenue": revenue,
        "orders": orders_count,
        "pending": 0,
        "tryon_sessions": 0,
        "unsold_alerts": 0,
        "wa_sent": 0,
    }

    async def generate():
        async for chunk in ai_service.admin_chat_stream(body.messages, live_data):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
