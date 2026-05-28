import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.database import get_db
from app.models.cart import CartItem
from app.models.product import Product
from app.models.user import User
from app.schemas.cart import CartItemCreate, CartItemUpdate, CartResponse, CartItemResponse
from app.utils.auth import get_current_user
from app.config import settings

router = APIRouter(prefix="/cart", tags=["cart"])


def _build_cart_response(items: list, products: dict) -> CartResponse:
    result_items = []
    subtotal = 0.0
    for ci in items:
        prod = products.get(ci.product_id)
        if not prod:
            continue
        line_total = prod.price * ci.quantity
        subtotal += line_total
        result_items.append(CartItemResponse(
            id=ci.id, product_id=ci.product_id, quantity=ci.quantity,
            selected_colour=ci.selected_colour,
            product_name=prod.name, product_price=prod.price,
            product_image=prod.thumbnail_url,
            line_total=line_total,
        ))
    cgst = round(subtotal * 0.025, 2)
    sgst = round(subtotal * 0.025, 2)
    return CartResponse(
        items=result_items, item_count=len(result_items),
        subtotal=subtotal, cgst=cgst, sgst=sgst,
        total=subtotal + cgst + sgst,
        free_shipping=subtotal >= settings.FREE_SHIPPING_THRESHOLD,
    )


@router.get("", response_model=CartResponse)
async def get_cart(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items_result = await db.execute(
        select(CartItem).where(CartItem.user_id == current_user.id)
    )
    items = items_result.scalars().all()
    if not items:
        return CartResponse(items=[], item_count=0, subtotal=0, cgst=0, sgst=0, total=0, free_shipping=False)

    product_ids = [ci.product_id for ci in items]
    prods_result = await db.execute(select(Product).where(Product.id.in_(product_ids)))
    products = {p.id: p for p in prods_result.scalars().all()}
    return _build_cart_response(items, products)


@router.post("", response_model=CartResponse)
async def add_to_cart(
    body: CartItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    prod_result = await db.execute(select(Product).where(Product.id == body.product_id, Product.is_active == True))
    product = prod_result.scalar_one_or_none()
    if not product:
        raise HTTPException(404, "Product not found")
    if product.available_qty < body.quantity:
        raise HTTPException(400, f"Only {product.available_qty} units available")

    existing_result = await db.execute(
        select(CartItem).where(CartItem.user_id == current_user.id, CartItem.product_id == body.product_id)
    )
    existing = existing_result.scalar_one_or_none()
    if existing:
        existing.quantity = min(existing.quantity + body.quantity, 10)
    else:
        db.add(CartItem(user_id=current_user.id, product_id=body.product_id,
                        quantity=body.quantity, selected_colour=body.selected_colour))
    await db.commit()
    return await get_cart(current_user, db)


@router.patch("/{item_id}", response_model=CartResponse)
async def update_cart_item(
    item_id: uuid.UUID,
    body: CartItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CartItem).where(CartItem.id == item_id, CartItem.user_id == current_user.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Cart item not found")
    item.quantity = body.quantity
    await db.commit()
    return await get_cart(current_user, db)


@router.delete("/{item_id}", response_model=CartResponse)
async def remove_cart_item(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(CartItem).where(CartItem.id == item_id, CartItem.user_id == current_user.id)
    )
    await db.commit()
    return await get_cart(current_user, db)


@router.delete("", status_code=204)
async def clear_cart(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(delete(CartItem).where(CartItem.user_id == current_user.id))
    await db.commit()
