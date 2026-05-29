"""tests/test_products.py"""
import pytest


@pytest.mark.asyncio
async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_list_products_empty(client):
    resp = await client.get("/api/products")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.asyncio
async def test_create_product_requires_admin(client, user_token):
    resp = await client.post(
        "/api/products",
        json={
            "sku": "CSM-KAN-001",
            "name": "Royal Kanjivaram Gold Zari",
            "slug": "royal-kanjivaram-gold-zari",
            "category": "kanjivaram",
            "gender": "women",
            "price": 12999.0,
            "mrp": 15999.0,
            "stock_qty": 10,
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_create_product_as_admin(client, admin_token):
    resp = await client.post(
        "/api/products",
        json={
            "sku": "CSM-KAN-001",
            "name": "Royal Kanjivaram Gold Zari",
            "slug": "royal-kanjivaram-gold-zari",
            "category": "kanjivaram",
            "gender": "women",
            "price": 12999.0,
            "mrp": 15999.0,
            "stock_qty": 10,
            "hsn_code": "5007",
            "is_gi_tagged": True,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["sku"] == "CSM-KAN-001"
    assert data["discount_percent"] == 18
    assert data["available_qty"] == 10


@pytest.mark.asyncio
async def test_get_product_by_slug(client, admin_token):
    # Create product first
    await client.post(
        "/api/products",
        json={
            "sku": "CSM-MEN-001", "name": "Pure Silk Dhoti Gold",
            "slug": "pure-silk-dhoti-gold", "category": "mens_dhoti",
            "gender": "men", "price": 4999.0, "mrp": 6499.0, "stock_qty": 5,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    resp = await client.get("/api/products/pure-silk-dhoti-gold")
    assert resp.status_code == 200
    assert resp.json()["gender"] == "men"


@pytest.mark.asyncio
async def test_list_products_filter_gender(client):
    resp = await client.get("/api/products?gender=men")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_list_products_search(client):
    resp = await client.get("/api/products?search=Kanjivaram")
    assert resp.status_code == 200
    data = resp.json()
    for item in data["items"]:
        assert "kanjivaram" in item["name"].lower() or "kanjivaram" in str(item["category"]).lower()
