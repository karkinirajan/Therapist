import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests._helpers import auth_headers, make_user
from tests.test_baseline_api import _VALID_BASELINE

pytestmark = pytest.mark.asyncio


async def test_gated_endpoint_returns_403_without_baseline(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    user = await make_user(db_session)

    response = await client.get("/tracking/categories", headers=auth_headers(user))

    assert response.status_code == 403
    assert "intake" in response.json()["detail"].lower()


async def test_gated_endpoint_returns_200_once_baseline_exists(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    user = await make_user(db_session)
    headers = auth_headers(user)
    create_response = await client.post("/baseline", json=_VALID_BASELINE, headers=headers)
    assert create_response.status_code == 201

    response = await client.get("/tracking/categories", headers=headers)

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 6


async def test_baseline_endpoint_itself_is_never_gated(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    """`/baseline` must stay reachable with no baseline yet - it's the
    chicken-and-egg prerequisite the gate depends on."""
    user = await make_user(db_session)

    response = await client.get("/baseline", headers=auth_headers(user))

    assert response.status_code == 404  # not-gated 403; genuinely "not found yet"
