import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.order import Order, OrderStatus
from app.models.payment import Payment, PaymentStatus
from app.models.user import User
from app.schemas.payment import PaymentCreateOrder, PaymentVerify, RefundRequest
from app.utils.razorpay import (
    create_razorpay_order, verify_payment_signature,
    verify_webhook_signature, create_refund,
)
from app.utils.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/create-order")
async def create_payment_order(
    body: PaymentCreateOrder,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order).where(Order.id == body.order_id, Order.user_id == current_user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")

    amount_paise = int(order.total_amount * 100)
    rz_order = create_razorpay_order(
        amount_paise=amount_paise,
        receipt=order.order_number,
        notes={"order_id": str(order.id), "user_id": str(current_user.id)},
    )

    payment = Payment(
        order_id=order.id,
        razorpay_order_id=rz_order["id"],
        amount=order.total_amount,
    )
    db.add(payment)
    order.status = OrderStatus.PAYMENT_PENDING
    await db.commit()

    return {
        "razorpay_order_id": rz_order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "order_id": str(order.id),
    }


@router.post("/verify")
async def verify_payment(
    body: PaymentVerify,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # CRITICAL: Always verify HMAC before marking paid
    if not verify_payment_signature(
        body.razorpay_order_id,
        body.razorpay_payment_id,
        body.razorpay_signature,
    ):
        raise HTTPException(400, "Payment signature verification failed")

    result = await db.execute(select(Payment).where(Payment.razorpay_order_id == body.razorpay_order_id))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(404, "Payment record not found")

    payment.razorpay_payment_id = body.razorpay_payment_id
    payment.razorpay_signature = body.razorpay_signature
    payment.status = PaymentStatus.CAPTURED
    payment.is_hmac_verified = True
    payment.paid_at = datetime.utcnow()

    order_result = await db.execute(select(Order).where(Order.id == payment.order_id))
    order = order_result.scalar_one()
    order.status = OrderStatus.CONFIRMED
    order.confirmed_at = datetime.utcnow()

    await db.commit()
    return {"message": "Payment verified", "order_number": order.order_number}


@router.post("/webhook")
async def razorpay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    body_bytes = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    if not verify_webhook_signature(body_bytes, signature):
        raise HTTPException(400, "Invalid webhook signature")

    payload = await request.json()
    event = payload.get("event", "")

    if event == "payment.captured":
        payment_data = payload["payload"]["payment"]["entity"]
        rz_order_id = payment_data.get("order_id")
        result = await db.execute(select(Payment).where(Payment.razorpay_order_id == rz_order_id))
        payment = result.scalar_one_or_none()
        if payment and payment.status != PaymentStatus.CAPTURED:
            payment.status = PaymentStatus.CAPTURED
            await db.commit()

    elif event == "payment.failed":
        payment_data = payload["payload"]["payment"]["entity"]
        rz_order_id = payment_data.get("order_id")
        result = await db.execute(select(Payment).where(Payment.razorpay_order_id == rz_order_id))
        payment = result.scalar_one_or_none()
        if payment:
            payment.status = PaymentStatus.FAILED
            await db.commit()

    return {"status": "ok"}


@router.post("/refund")
async def refund_payment(
    body: RefundRequest,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Payment).where(Payment.order_id == body.order_id))
    payment = result.scalar_one_or_none()
    if not payment or not payment.razorpay_payment_id:
        raise HTTPException(404, "Payment not found")
    if payment.status != PaymentStatus.CAPTURED:
        raise HTTPException(400, "Payment not in captured state")

    amount_paise = int(body.amount * 100) if body.amount else None
    refund = create_refund(payment.razorpay_payment_id, amount_paise)

    payment.refund_id = refund.get("id")
    payment.refunded_amount = (body.amount or payment.amount)
    payment.status = PaymentStatus.REFUNDED
    await db.commit()
    return {"message": "Refund initiated", "refund_id": refund.get("id")}
