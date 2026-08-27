"""Edge cases around refresh-token expiry and concurrent reuse that aren't
covered by test_auth_api.py's rotation/reuse-detection/logout tests."""

import asyncio
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rate_limit import limiter
from app.core.security import hash_refresh_token
from app.models.refresh_token import RefreshToken
from app.models.user import User

pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
def _reset_rate_limiter():
    """See the identical fixture in test_auth_rate_limit.py: `limiter`'s
    in-memory storage persists for the whole pytest session, and this file's
    concurrent-refresh test alone issues more signups than the 10/minute
    per-IP cap on /auth/signup allows within one test. Reset before and
    after so this file's request volume neither trips on leftover state
    from earlier tests nor leaks into tests that run after it."""
    limiter.reset()
    yield
    limiter.reset()


def _unique_email() -> str:
    return f"user-{uuid.uuid4().hex[:12]}@example.com"


async def test_refresh_with_expired_token_returns_401_and_clears_cookie(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    email = _unique_email()
    signup_response = await client.post(
        "/auth/signup", json={"email": email, "password": "correct-horse-battery"}
    )
    raw_refresh_token = signup_response.cookies["refresh_token"]

    # Force the token this cookie points at to already be expired, rather
    # than waiting out the real TTL.
    result = await db_session.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == hash_refresh_token(raw_refresh_token)
        )
    )
    token_row = result.scalar_one()
    token_row.expires_at = datetime.now(UTC) - timedelta(days=1)
    await db_session.flush()
    await db_session.commit()

    client.cookies.set("refresh_token", raw_refresh_token)
    response = await client.post("/auth/refresh")

    assert response.status_code == 401

    # The endpoint must actively clear the cookie on rejection (see
    # `_clear_refresh_cookie` in app/routers/auth.py), not just leave a
    # dead one sitting in the browser.
    set_cookie_headers = response.headers.get_list("set-cookie")
    assert any(
        header.startswith("refresh_token=") and ("Max-Age=0" in header or "max-age=0" in header)
        for header in set_cookie_headers
    )


async def test_refresh_missing_cookie_returns_401(client: AsyncClient) -> None:
    response = await client.post("/auth/refresh")

    assert response.status_code == 401
    assert response.json() == {"detail": "Missing refresh token"}


async def test_concurrent_refresh_reuse_triggers_reuse_detection() -> None:
    """Two callers racing to refresh the same (not-yet-rotated) token: at most
    one may succeed, the other must be rejected as a reuse/race loser.

    This deliberately does NOT use the shared `client`/`db_session` fixtures
    from conftest.py: those bind every request in a test to one single
    AsyncSession on one connection, and a single SQLAlchemy AsyncSession is
    documented as unsafe for concurrent use (two truly-parallel requests on
    it raise `InvalidRequestError: Session is already flushing` rather than
    exercising the app's real reuse-detection logic). Production traffic
    gets one independent session per request (`app.core.deps.get_db`), so to
    actually race two requests the way they'd race in production, this test
    talks to the app directly with two independent ASGI clients — each
    getting its own DB session/connection, same as two real concurrent HTTP
    requests would. Because that bypasses the per-test rollback-savepoint
    fixture, it commits real rows to the `therapist_test` database, so it
    cleans up explicitly at the end via `finally`.

    The race is timing-dependent, so this repeats it several times in one
    test (rather than relying on a single asyncio.gather call) to reliably
    surface the bug instead of being flaky in either direction.
    """
    from app.db.session import async_session_factory
    from app.main import app

    transport = ASGITransport(app=app)
    created_user_ids: list[uuid.UUID] = []

    try:
        double_success_seen = False

        for _ in range(15):
            # Reset per iteration too: 15 iterations each doing a signup
            # would otherwise trip /auth/signup's own 10/minute per-IP cap
            # partway through this loop, which has nothing to do with the
            # race this test is actually probing.
            limiter.reset()
            email = _unique_email()
            async with AsyncClient(transport=transport, base_url="http://test") as setup_client:
                signup_response = await setup_client.post(
                    "/auth/signup", json={"email": email, "password": "correct-horse-battery"}
                )
                assert signup_response.status_code == 201
                original_refresh_token = signup_response.cookies["refresh_token"]
                created_user_ids.append(uuid.UUID(signup_response.json()["user"]["id"]))

            async def do_refresh(refresh_token: str = original_refresh_token) -> int:
                async with AsyncClient(
                    transport=ASGITransport(app=app),
                    base_url="http://test",
                    cookies={"refresh_token": refresh_token},
                ) as race_client:
                    response = await race_client.post("/auth/refresh")
                    return response.status_code

            results = await asyncio.gather(do_refresh(), do_refresh())

            if results.count(200) > 1:
                double_success_seen = True
                break

        # Two concurrent requests racing the same refresh token must never
        # both succeed — see the xfail reason above for why this currently
        # can happen.
        assert not double_success_seen
    finally:
        async with async_session_factory() as cleanup_session:
            for user_id in created_user_ids:
                await cleanup_session.execute(
                    delete(RefreshToken).where(RefreshToken.user_id == user_id)
                )
                await cleanup_session.execute(delete(User).where(User.id == user_id))
            await cleanup_session.commit()
