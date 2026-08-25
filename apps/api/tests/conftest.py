import os
import subprocess
from collections.abc import AsyncGenerator, AsyncIterator
from pathlib import Path

# --- Point at a dedicated test database BEFORE any app module is imported ---
# `Settings` is loaded once via `lru_cache`, so this has to happen before
# `app.core.config` (or anything importing it) is ever imported.
_API_ROOT = Path(__file__).resolve().parents[1]
_env_path = _API_ROOT / ".env"
if _env_path.exists():
    for line in _env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())

_base_db_url = os.environ["DATABASE_URL"]
_TEST_DB_NAME = "therapist_test"
os.environ["DATABASE_URL"] = _base_db_url.rsplit("/", 1)[0] + f"/{_TEST_DB_NAME}"

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.core.deps import get_db

settings = get_settings()


@pytest.fixture(scope="session", autouse=True)
def _apply_migrations() -> None:
    """Run Alembic migrations against the dedicated test database once per
    test session (never against the dev database)."""
    subprocess.run(
        ["uv", "run", "alembic", "upgrade", "head"],
        cwd=str(_API_ROOT),
        check=True,
        capture_output=True,
    )


@pytest_asyncio.fixture(scope="session")
async def engine():
    eng = create_async_engine(str(settings.database_url), pool_pre_ping=True)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def db_session(engine) -> AsyncGenerator[AsyncSession, None]:
    """Each test runs inside an outer transaction that is rolled back at the
    end, regardless of any `commit()` calls made by application code (those
    become SAVEPOINTs via `join_transaction_mode='create_savepoint'`)."""
    async with engine.connect() as connection:
        outer_transaction = await connection.begin()
        session_factory = async_sessionmaker(
            bind=connection,
            expire_on_commit=False,
            join_transaction_mode="create_savepoint",
        )
        async with session_factory() as session:
            yield session
        await outer_transaction.rollback()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    from app.main import app

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
