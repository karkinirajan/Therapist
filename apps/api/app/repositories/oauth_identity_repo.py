import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.oauth_identity import OAuthIdentity, OAuthProvider


class OAuthIdentityRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_provider_account(
        self, provider: OAuthProvider, provider_account_id: str
    ) -> OAuthIdentity | None:
        result = await self._db.execute(
            select(OAuthIdentity).where(
                OAuthIdentity.provider == provider,
                OAuthIdentity.provider_account_id == provider_account_id,
            )
        )
        return result.scalar_one_or_none()

    async def create(
        self, *, user_id: uuid.UUID, provider: OAuthProvider, provider_account_id: str
    ) -> OAuthIdentity:
        identity = OAuthIdentity(
            user_id=user_id, provider=provider, provider_account_id=provider_account_id
        )
        self._db.add(identity)
        await self._db.flush()
        await self._db.refresh(identity)
        return identity
