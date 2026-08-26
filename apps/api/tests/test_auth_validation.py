"""Additional coverage for input validation and error-shape edge cases on the
auth endpoints that aren't exercised by test_auth_api.py: malformed/empty
email, short passwords, case-insensitive email uniqueness, and a tampered
JWT on /auth/me.
"""

import uuid

import pytest
from httpx import AsyncClient

from app.core.rate_limit import limiter

pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """See the identical fixture in test_auth_rate_limit.py: `limiter`'s
    in-memory storage persists for the whole pytest session, so this resets
    it around every test in this file to keep it isolated from request
    volume in tests that run before or after it."""
    limiter.reset()
    yield
    limiter.reset()


def _unique_email() -> str:
    return f"user-{uuid.uuid4().hex[:12]}@example.com"


@pytest.mark.parametrize(
    "payload",
    [
        {"email": "", "password": "correct-horse"},
        {"email": "not-an-email", "password": "correct-horse"},
        {"email": "missing-domain@", "password": "correct-horse"},
        {"password": "correct-horse"},  # email field missing entirely
    ],
)
async def test_signup_malformed_email_returns_422(client: AsyncClient, payload: dict) -> None:
    response = await client.post("/auth/signup", json=payload)

    assert response.status_code == 422


async def test_signup_password_below_minimum_length_returns_422(client: AsyncClient) -> None:
    response = await client.post(
        "/auth/signup", json={"email": _unique_email(), "password": "short1"}
    )

    assert response.status_code == 422


async def test_login_password_below_minimum_length_returns_422(client: AsyncClient) -> None:
    # Even for a nonexistent user, schema validation runs before the service
    # layer is ever reached, so this must be a 422, not a 401.
    response = await client.post(
        "/auth/login", json={"email": _unique_email(), "password": "short1"}
    )

    assert response.status_code == 422


async def test_signup_email_differing_only_by_case_is_treated_as_duplicate(
    client: AsyncClient,
) -> None:
    # The `users.email` column is CITEXT (see app/models/user.py), so
    # comparisons and the unique index are case-insensitive at the DB layer.
    # Confirm the API actually surfaces that as a 409, not a second account.
    base = uuid.uuid4().hex[:12]
    email_lower = f"user-{base}@example.com"
    email_upper = f"USER-{base}@EXAMPLE.COM"

    first = await client.post(
        "/auth/signup", json={"email": email_lower, "password": "correct-horse"}
    )
    assert first.status_code == 201

    second = await client.post(
        "/auth/signup", json={"email": email_upper, "password": "another-password"}
    )

    assert second.status_code == 409


async def test_login_email_differing_only_by_case_succeeds(client: AsyncClient) -> None:
    base = uuid.uuid4().hex[:12]
    email_lower = f"user-{base}@example.com"
    email_upper = f"USER-{base}@EXAMPLE.COM"
    password = "correct-horse-battery"

    await client.post("/auth/signup", json={"email": email_lower, "password": password})

    response = await client.post("/auth/login", json={"email": email_upper, "password": password})

    assert response.status_code == 200
    assert response.json()["user"]["email"].lower() == email_lower.lower()


async def test_me_rejects_tampered_jwt_with_401_not_500(client: AsyncClient) -> None:
    email = _unique_email()
    signup_response = await client.post(
        "/auth/signup", json={"email": email, "password": "correct-horse-battery"}
    )
    access_token = signup_response.json()["access_token"]

    # Corrupt the last few characters of the signature so the token still
    # looks structurally like a JWT but fails signature verification. This
    # deliberately mutates more than the final character: base64url-encodes
    # 6 bits per character, and a 256-bit HS256 signature's last character
    # only carries 2 significant bits (the rest is unused padding) — so
    # flipping only the very last character can, depending on which bit
    # flips, leave the decoded signature bytes (and therefore verification)
    # completely unchanged. Replacing a longer suffix avoids that flakiness.
    tampered = access_token[:-6] + ("AAAAAA" if not access_token.endswith("AAAAAA") else "BBBBBB")

    response = await client.get("/auth/me", headers={"Authorization": f"Bearer {tampered}"})

    assert response.status_code == 401


async def test_me_rejects_garbage_bearer_token_with_401_not_500(client: AsyncClient) -> None:
    response = await client.get("/auth/me", headers={"Authorization": "Bearer not-a-jwt-at-all"})

    assert response.status_code == 401


async def test_me_rejects_malformed_authorization_header_with_401(client: AsyncClient) -> None:
    # No "Bearer " scheme prefix at all.
    response = await client.get("/auth/me", headers={"Authorization": "garbage-header-value"})

    assert response.status_code == 401
