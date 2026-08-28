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

import asyncpg
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.core.deps import get_db

settings = get_settings()


def _to_asyncpg_dsn(sqlalchemy_url: str) -> str:
    """asyncpg.connect() doesn't understand the `postgresql+asyncpg://` driver
    prefix SQLAlchemy uses - strip it back to plain `postgresql://`."""
    return sqlalchemy_url.replace("postgresql+asyncpg://", "postgresql://", 1)


async def _ensure_test_database_exists() -> None:
    """Create `therapist_test` if it doesn't exist yet. Without this, a fresh
    clone (a new dev machine, CI, or a freshly-provisioned EC2 box) has no
    way to run the test suite at all - the database has to exist before
    Alembic can even connect to it, and nothing else in this repo creates
    it. `CREATE DATABASE` can't run inside a transaction block, so this
    connects directly via asyncpg with autocommit semantics rather than
    going through a SQLAlchemy engine/session."""
    admin_dsn = _to_asyncpg_dsn(_base_db_url)
    conn = await asyncpg.connect(admin_dsn)
    try:
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", _TEST_DB_NAME
        )
        if not exists:
            # Identifier, not a value - can't be a bound parameter. Safe here
            # since _TEST_DB_NAME is a hardcoded constant, never user input.
            await conn.execute(f'CREATE DATABASE "{_TEST_DB_NAME}"')
    finally:
        await conn.close()


@pytest.fixture(scope="session", autouse=True)
def _apply_migrations() -> None:
    """Ensure the dedicated test database exists, then run Alembic migrations
    against it once per test session (never against the dev database)."""
    import asyncio

    asyncio.run(_ensure_test_database_exists())
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
