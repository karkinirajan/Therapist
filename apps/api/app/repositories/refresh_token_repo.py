import uuid
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.refresh_token import RefreshToken


class RefreshTokenRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_hash(self, token_hash: str) -> RefreshToken | None:
        result = await self._db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    async def create(
        self,
        *,
        user_id: uuid.UUID,
        token_hash: str,
        family_id: uuid.UUID,
        expires_at: datetime,
        user_agent: str | None = None,
        ip: str | None = None,
    ) -> RefreshToken:
        token = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            family_id=family_id,
            expires_at=expires_at,
            user_agent=user_agent,
            ip=ip,
        )
        self._db.add(token)
        await self._db.flush()
        await self._db.refresh(token)
        return token

    async def revoke(self, token: RefreshToken) -> None:
        token.revoked_at = datetime.now(UTC)
        await self._db.flush()

    async def claim_for_rotation(self, token_hash: str) -> RefreshToken | None:
        """Atomically revoke a token IF it is still active, returning the row
        only to whichever caller's UPDATE actually flipped it. Two concurrent
        callers racing the same `token_hash` cannot both get a non-None result:
        Postgres holds a row lock across the first UPDATE until it commits or
        rolls back, so a second concurrent UPDATE targeting the same row
        blocks, then re-evaluates `revoked_at IS NULL` against the already-
        committed result and matches zero rows. This is what makes refresh-
        token rotation safe under real concurrent requests - a plain
        get-then-revoke (read `revoked_at`, decide, then revoke) has a gap
        between the read and the write where two callers can both observe
        "not revoked yet" and both rotate the same token."""
        result = await self._db.execute(
            update(RefreshToken)
            .where(RefreshToken.token_hash == token_hash, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=datetime.now(UTC))
            .returning(RefreshToken)
        )
        return result.scalar_one_or_none()

    async def revoke_family(self, family_id: uuid.UUID) -> None:
        await self._db.execute(
            update(RefreshToken)
            .where(RefreshToken.family_id == family_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=datetime.now(UTC))
        )
