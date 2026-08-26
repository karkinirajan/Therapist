import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token
from app.models.user import User
from app.repositories.user_repo import UserRepository


def unique_email() -> str:
    return f"user-{uuid.uuid4().hex[:12]}@example.com"


async def make_user(db_session: AsyncSession, *, timezone: str = "UTC") -> User:
    user = await UserRepository(db_session).create(email=unique_email(), password_hash=None)
    user.timezone = timezone
    await db_session.flush()
    await db_session.refresh(user)
    return user


def auth_headers(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}
