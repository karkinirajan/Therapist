"""Rate-limit behavior on /auth/login.

Per app/routers/auth.py, login is stacked with two slowapi limits:
`10/minute` per-IP and `5/minute` per-email (see app/core/rate_limit.py's
`email_key`, which reads `request.state.rate_limit_email` set from the
request body before the rate limiter runs). All requests in these tests
share one client/IP and one email, so the tighter 5/minute per-email limit
is the one that actually trips first.
"""

import uuid

import pytest
from httpx import AsyncClient

from app.core.rate_limit import limiter

pytestmark = pytest.mark.asyncio

LOGIN_PER_EMAIL_LIMIT = 5


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """`limiter` (app/core/rate_limit.py) is a single module-level instance
    with in-memory storage that persists for the whole pytest session — it's
    not reset per test by conftest.py's fixtures. Without resetting it here,
    these tests would be order-dependent: whichever requests earlier tests
    (or other tests in this file) already made against the shared per-IP
    bucket would count against these tests' own login attempts, and vice
    versa for tests that run afterward. Reset before AND after so this file
    is isolated from and doesn't leak into any test that runs around it.
    """
    limiter.reset()
    yield
    limiter.reset()


def _unique_email() -> str:
    return f"user-{uuid.uuid4().hex[:12]}@example.com"


async def test_login_rate_limit_exceeded_returns_429(client: AsyncClient) -> None:
    email = _unique_email()
    # No account needs to exist: the rate limiter runs before credential
    # verification (it wraps the whole endpoint), so wrong-password attempts
    # against a nonexistent user still count toward the per-email limit.
    payload = {"email": email, "password": "wrong-password"}

    statuses = [
        (await client.post("/auth/login", json=payload)).status_code
        for _ in range(LOGIN_PER_EMAIL_LIMIT + 2)
    ]

    # First LOGIN_PER_EMAIL_LIMIT attempts are evaluated normally (401,
    # invalid credentials); everything past that is rate-limited.
    assert statuses[:LOGIN_PER_EMAIL_LIMIT] == [401] * LOGIN_PER_EMAIL_LIMIT
    assert all(status == 429 for status in statuses[LOGIN_PER_EMAIL_LIMIT:])


async def test_login_rate_limit_is_scoped_per_email(client: AsyncClient) -> None:
    """Exhausting the limit for one email must not block a login attempt for
    a different email from the same client/IP."""
    exhausted_email = _unique_email()
    other_email = _unique_email()

    for _ in range(LOGIN_PER_EMAIL_LIMIT):
        response = await client.post(
            "/auth/login", json={"email": exhausted_email, "password": "wrong-password"}
        )
        assert response.status_code == 401

    blocked_response = await client.post(
        "/auth/login", json={"email": exhausted_email, "password": "wrong-password"}
    )
    assert blocked_response.status_code == 429

    other_response = await client.post(
        "/auth/login", json={"email": other_email, "password": "wrong-password"}
    )
    assert other_response.status_code == 401
