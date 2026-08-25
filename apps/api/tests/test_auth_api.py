import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models.refresh_token import RefreshToken

pytestmark = pytest.mark.asyncio


def _unique_email() -> str:
    return f"user-{uuid.uuid4().hex[:12]}@example.com"


async def test_signup_success(client: AsyncClient) -> None:
    email = _unique_email()

    response = await client.post("/auth/signup", json={"email": email, "password": "correct-horse"})

    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == email
    assert "access_token" in body
    assert "refresh_token" in response.cookies


async def test_signup_duplicate_email_returns_409(client: AsyncClient) -> None:
    email = _unique_email()
    await client.post("/auth/signup", json={"email": email, "password": "correct-horse"})

    response = await client.post("/auth/signup", json={"email": email, "password": "another-password"})

    assert response.status_code == 409


async def test_login_success(client: AsyncClient) -> None:
    email = _unique_email()
    password = "correct-horse-battery"
    await client.post("/auth/signup", json={"email": email, "password": password})

    response = await client.post("/auth/login", json={"email": email, "password": password})

    assert response.status_code == 200
    assert response.json()["user"]["email"] == email
    assert "refresh_token" in response.cookies


async def test_login_wrong_password_returns_401(client: AsyncClient) -> None:
    email = _unique_email()
    await client.post("/auth/signup", json={"email": email, "password": "correct-horse-battery"})

    response = await client.post("/auth/login", json={"email": email, "password": "wrong-password"})

    assert response.status_code == 401
    wrong_password_body = response.json()

    other_response = await client.post(
        "/auth/login", json={"email": _unique_email(), "password": "wrong-password"}
    )
    assert other_response.status_code == 401
    assert other_response.json() == wrong_password_body


async def test_login_nonexistent_email_returns_401_with_identical_shape(client: AsyncClient) -> None:
    response = await client.post(
        "/auth/login", json={"email": _unique_email(), "password": "does-not-matter"}
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid email or password"}


async def test_refresh_rotation(client: AsyncClient, db_session) -> None:
    email = _unique_email()
    signup_response = await client.post(
        "/auth/signup", json={"email": email, "password": "correct-horse-battery"}
    )
    old_refresh_cookie = signup_response.cookies["refresh_token"]

    refresh_response = await client.post("/auth/refresh")

    assert refresh_response.status_code == 200
    new_refresh_cookie = refresh_response.cookies["refresh_token"]
    assert new_refresh_cookie != old_refresh_cookie

    result = await db_session.execute(select(RefreshToken))
    tokens = result.scalars().all()
    assert len(tokens) == 2
    revoked = [t for t in tokens if t.revoked_at is not None]
    active = [t for t in tokens if t.revoked_at is None]
    assert len(revoked) == 1
    assert len(active) == 1
    assert revoked[0].family_id == active[0].family_id


async def test_refresh_reuse_detection_revokes_family(client: AsyncClient) -> None:
    email = _unique_email()
    signup_response = await client.post(
        "/auth/signup", json={"email": email, "password": "correct-horse-battery"}
    )
    original_refresh_token = signup_response.cookies["refresh_token"]

    first_refresh = await client.post("/auth/refresh")
    assert first_refresh.status_code == 200
    rotated_refresh_token = first_refresh.cookies["refresh_token"]

    # Replay the original (already-rotated) refresh token: this must be treated
    # as theft and kill the whole family.
    client.cookies.set("refresh_token", original_refresh_token)
    replay_response = await client.post("/auth/refresh")
    assert replay_response.status_code == 401

    # The rotated token that came out of the first refresh must now be dead too.
    client.cookies.set("refresh_token", rotated_refresh_token)
    now_dead_response = await client.post("/auth/refresh")
    assert now_dead_response.status_code == 401


async def test_logout_revokes_family(client: AsyncClient, db_session) -> None:
    email = _unique_email()
    signup_response = await client.post(
        "/auth/signup", json={"email": email, "password": "correct-horse-battery"}
    )
    refresh_token = signup_response.cookies["refresh_token"]

    logout_response = await client.post("/auth/logout")
    assert logout_response.status_code == 204

    client.cookies.set("refresh_token", refresh_token)
    refresh_after_logout = await client.post("/auth/refresh")
    assert refresh_after_logout.status_code == 401

    result = await db_session.execute(select(RefreshToken))
    tokens = result.scalars().all()
    assert all(t.revoked_at is not None for t in tokens)


async def test_me_requires_bearer_token(client: AsyncClient) -> None:
    response = await client.get("/auth/me")
    assert response.status_code == 401


async def test_me_returns_current_user_with_valid_token(client: AsyncClient) -> None:
    email = _unique_email()
    signup_response = await client.post(
        "/auth/signup", json={"email": email, "password": "correct-horse-battery"}
    )
    access_token = signup_response.json()["access_token"]

    response = await client.get("/auth/me", headers={"Authorization": f"Bearer {access_token}"})

    assert response.status_code == 200
    assert response.json()["email"] == email
