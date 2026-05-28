"""tests/test_orders.py — GST calculation + order flow"""
import pytest
from app.services.order_service import calculate_gst, calculate_loyalty_points, generate_order_number


def test_gst_calculation():
    """GST = CGST 2.5% + SGST 2.5% = 5% total."""
    cgst, sgst = calculate_gst(10000.0)
    assert cgst == 250.0
    assert sgst == 250.0
    assert cgst + sgst == 500.0  # 5% total


def test_gst_on_saree_price():
    """₹12,999 saree → GST = ₹649.95"""
    cgst, sgst = calculate_gst(12999.0)
    assert abs((cgst + sgst) - 649.95) < 0.01


def test_loyalty_points():
    """5 points per ₹100 spent."""
    assert calculate_loyalty_points(1000.0) == 50
    assert calculate_loyalty_points(12999.0) == 649
    assert calculate_loyalty_points(500.0) == 25


def test_order_number_format():
    order_num = generate_order_number()
    assert order_num.startswith("CSM-")
    parts = order_num.split("-")
    assert len(parts) == 3
    assert len(parts[1]) == 8  # YYYYMMDD


@pytest.mark.asyncio
async def test_order_requires_auth(client):
    resp = await client.post("/api/v1/orders", json={"address_id": "00000000-0000-0000-0000-000000000000"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_orders_authenticated(client, user_token):
    resp = await client.get(
        "/api/v1/orders",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert data["items"] == []  # empty for new user


@pytest.mark.asyncio
async def test_cart_add_nonexistent_product(client, user_token):
    resp = await client.post(
        "/api/v1/cart",
        json={"product_id": "00000000-0000-0000-0000-000000000000", "quantity": 1},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_cart_flow(client, user_token, admin_token):
    # Create a product
    create_resp = await client.post(
        "/api/v1/products",
        json={
            "sku": "CSM-KAN-TEST",
            "name": "Test Kanjivaram",
            "slug": "test-kanjivaram-order",
            "category": "kanjivaram",
            "gender": "women",
            "price": 6499.0,
            "mrp": 7999.0,
            "stock_qty": 5,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_resp.status_code == 200
    product_id = create_resp.json()["id"]

    # Add to cart
    add_resp = await client.post(
        "/api/v1/cart",
        json={"product_id": product_id, "quantity": 1},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert add_resp.status_code == 200
    cart_data = add_resp.json()
    assert cart_data["item_count"] == 1
    assert cart_data["subtotal"] == 6499.0
    assert abs(cart_data["cgst"] - 162.48) < 1.0  # 2.5%
    assert abs(cart_data["sgst"] - 162.48) < 1.0  # 2.5%

    # Get cart
    get_resp = await client.get("/api/v1/cart", headers={"Authorization": f"Bearer {user_token}"})
    assert get_resp.status_code == 200
    assert get_resp.json()["item_count"] == 1
