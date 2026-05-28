"""tests/conftest.py — pytest fixtures"""
import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.main import app
from app.database import Base, get_db
from app.config import settings

TEST_DB_URL = "postgresql+asyncpg://csm:csm_secret@localhost:5432/csm_silks_test"

test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSession() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session", autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c


@pytest.fixture
async def admin_token(client):
    # Send OTP
    resp = await client.post("/api/v1/auth/otp/send", json={"phone": "+919999999999"})
    otp = resp.json()["dev_otp"]
    # Verify OTP
    resp = await client.post("/api/v1/auth/otp/verify", json={"phone": "+919999999999", "otp": otp})
    token = resp.json()["access_token"]
    # Promote to admin in DB
    async with TestSession() as db:
        from sqlalchemy import select, update
        from app.models.user import User, UserRole
        await db.execute(
            update(User).where(User.phone == "+919999999999").values(role=UserRole.ADMIN)
        )
        await db.commit()
    return token


@pytest.fixture
async def user_token(client):
    resp = await client.post("/api/v1/auth/otp/send", json={"phone": "+918888888888"})
    otp = resp.json()["dev_otp"]
    resp = await client.post("/api/v1/auth/otp/verify", json={"phone": "+918888888888", "otp": otp})
    return resp.json()["access_token"]
