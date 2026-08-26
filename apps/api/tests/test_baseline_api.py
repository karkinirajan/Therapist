import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests._helpers import auth_headers, make_user

pytestmark = pytest.mark.asyncio

_VALID_BASELINE = {
    "mood": 5,
    "anxiety": 6,
    "energy": 4,
    "sleep_quality": "fair",
    "meds_adherence_2wk": "consistent",
    "career_example": "Missed a deadline last month.",
    "structure_example": "Struggle to keep a morning routine.",
    "life_example": "Forget to pay bills on time.",
    "what_works": "Timers and checklists.",
    "non_negotiables": "No meds changes without prescriber.",
    "cadence": "daily",
}


async def test_create_baseline_success(client: AsyncClient, db_session: AsyncSession) -> None:
    user = await make_user(db_session)

    response = await client.post("/baseline", json=_VALID_BASELINE, headers=auth_headers(user))

    assert response.status_code == 201
    body = response.json()
    assert body["mood"] == 5
    assert body["user_id"] == str(user.id)


async def test_create_baseline_duplicate_returns_409(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    user = await make_user(db_session)
    first = await client.post("/baseline", json=_VALID_BASELINE, headers=auth_headers(user))
    assert first.status_code == 201

    second = await client.post("/baseline", json=_VALID_BASELINE, headers=auth_headers(user))

    assert second.status_code == 409


async def test_get_baseline_404_when_missing(client: AsyncClient, db_session: AsyncSession) -> None:
    user = await make_user(db_session)

    response = await client.get("/baseline", headers=auth_headers(user))

    assert response.status_code == 404


async def test_redo_baseline_updates_existing(client: AsyncClient, db_session: AsyncSession) -> None:
    user = await make_user(db_session)
    await client.post("/baseline", json=_VALID_BASELINE, headers=auth_headers(user))

    updated = dict(_VALID_BASELINE, mood=9)
    response = await client.put("/baseline", json=updated, headers=auth_headers(user))

    assert response.status_code == 200
    assert response.json()["mood"] == 9


async def test_baseline_requires_auth(client: AsyncClient) -> None:
    response = await client.get("/baseline")
    assert response.status_code == 401
