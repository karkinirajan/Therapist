import uuid
from datetime import datetime

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.voice_socket_ticket import VoiceSocketTicket


class VoiceSocketTicketRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(self, *, session_id: uuid.UUID, user_id: uuid.UUID, token_hash: str, expires_at: datetime) -> None:
        self._db.add(VoiceSocketTicket(session_id=session_id, user_id=user_id, token_hash=token_hash, expires_at=expires_at))
        await self._db.flush()

    async def claim(self, *, token_hash: str, now: datetime) -> tuple[uuid.UUID, uuid.UUID] | None:
        """Atomically consume a live ticket, preventing a replay race."""
        result = await self._db.execute(
            update(VoiceSocketTicket)
            .where(
                VoiceSocketTicket.token_hash == token_hash,
                VoiceSocketTicket.used_at.is_(None),
                VoiceSocketTicket.expires_at >= now,
            )
            .values(used_at=now)
            .returning(VoiceSocketTicket.user_id, VoiceSocketTicket.session_id)
        )
        row = result.one_or_none()
        return (row[0], row[1]) if row else None
