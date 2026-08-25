import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.models.user import User
from app.repositories.refresh_token_repo import RefreshTokenRepository
from app.repositories.user_repo import UserRepository

settings = get_settings()


class EmailAlreadyRegisteredError(Exception):
    """Raised when signup is attempted with an email that's already in use."""


class InvalidCredentialsError(Exception):
    """Raised on login failure. Deliberately generic — never signals which field was wrong."""


class InvalidRefreshTokenError(Exception):
    """Raised when a refresh token is missing, expired, or already revoked (non-reuse case)."""


@dataclass(frozen=True)
class IssuedTokens:
    access_token: str
    refresh_token: str
    refresh_token_expires_at: datetime
    user: User


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._users = UserRepository(db)
        self._refresh_tokens = RefreshTokenRepository(db)

    async def signup(
        self, *, email: str, password: str, user_agent: str | None, ip: str | None
    ) -> IssuedTokens:
        existing = await self._users.get_by_email(email)
        if existing is not None:
            raise EmailAlreadyRegisteredError()

        user = await self._users.create(email=email, password_hash=hash_password(password))
        return await self._issue_tokens(user, family_id=uuid.uuid4(), user_agent=user_agent, ip=ip)

    async def login(
        self, *, email: str, password: str, user_agent: str | None, ip: str | None
    ) -> IssuedTokens:
        user = await self._users.get_by_email(email)
        if user is None or user.password_hash is None:
            raise InvalidCredentialsError()
        if not verify_password(password, user.password_hash):
            raise InvalidCredentialsError()

        return await self._issue_tokens(user, family_id=uuid.uuid4(), user_agent=user_agent, ip=ip)

    async def refresh(
        self, *, raw_token: str, user_agent: str | None, ip: str | None
    ) -> IssuedTokens:
        token_hash = hash_refresh_token(raw_token)
        existing = await self._refresh_tokens.get_by_hash(token_hash)
        if existing is None:
            raise InvalidRefreshTokenError()

        now = datetime.now(UTC)
        if existing.expires_at.tzinfo is None:
            existing_expires_at = existing.expires_at.replace(tzinfo=UTC)
        else:
            existing_expires_at = existing.expires_at

        if existing.revoked_at is not None:
            # Reuse of an already-rotated token: treat as theft, kill the whole family.
            await self._refresh_tokens.revoke_family(existing.family_id)
            # Commit explicitly: this write must survive even though we're about to
            # raise. `get_db` rolls back the session on any exception leaving the
            # endpoint, which would otherwise silently undo the exact mitigation
            # we just applied for a detected refresh-token replay.
            await self._db.commit()
            raise InvalidRefreshTokenError()

        if existing_expires_at < now:
            raise InvalidRefreshTokenError()

        user = await self._users.get_by_id(existing.user_id)
        if user is None:
            raise InvalidRefreshTokenError()

        await self._refresh_tokens.revoke(existing)
        return await self._issue_tokens(
            user, family_id=existing.family_id, user_agent=user_agent, ip=ip
        )

    async def issue_tokens_for_user(
        self, user: User, *, user_agent: str | None, ip: str | None
    ) -> IssuedTokens:
        """Public entry point used by non-password login flows (e.g. OAuth exchange)
        that already have an authenticated `User` and just need a fresh token pair."""
        return await self._issue_tokens(user, family_id=uuid.uuid4(), user_agent=user_agent, ip=ip)

    async def logout(self, *, raw_token: str) -> None:
        token_hash = hash_refresh_token(raw_token)
        existing = await self._refresh_tokens.get_by_hash(token_hash)
        if existing is None:
            return
        await self._refresh_tokens.revoke_family(existing.family_id)

    async def _issue_tokens(
        self,
        user: User,
        *,
        family_id: uuid.UUID,
        user_agent: str | None,
        ip: str | None,
    ) -> IssuedTokens:
        access_token = create_access_token(user.id)
        raw_refresh_token = generate_refresh_token()
        expires_at = datetime.now(UTC) + timedelta(days=settings.refresh_token_ttl_days)

        await self._refresh_tokens.create(
            user_id=user.id,
            token_hash=hash_refresh_token(raw_refresh_token),
            family_id=family_id,
            expires_at=expires_at,
            user_agent=user_agent,
            ip=ip,
        )

        return IssuedTokens(
            access_token=access_token,
            refresh_token=raw_refresh_token,
            refresh_token_expires_at=expires_at,
            user=user,
        )
