import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.therapy_session import TherapySession, TherapySessionStatus
from app.models.user import User
from app.repositories.therapy_session_repo import TherapySessionRepository
from app.repositories.user_memory_profile_repo import UserMemoryProfileRepository
from app.services import llm_client, voice_persona
from app.services.llm_client import LlmNotConfiguredError, LlmQuotaExceededError, LlmRequestError

settings = get_settings()


class SessionNotFoundError(Exception):
    pass


class SessionAlreadyEndedError(Exception):
    pass


class DailySessionQuotaExceededError(Exception):
    pass


class DailyTurnQuotaExceededError(Exception):
    pass


@dataclass(frozen=True)
class QuotaStatus:
    sessions_used_today: int
    sessions_remaining_today: int
    turns_used_today: int
    turns_remaining_today: int


@dataclass(frozen=True)
class TurnChunk:
    text: str
    is_crisis: bool = False


def _start_of_today_utc() -> datetime:
    now = datetime.now(UTC)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


class VoiceService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._sessions = TherapySessionRepository(db)
        self._profiles = UserMemoryProfileRepository(db)

    async def _turns_used_today(self, user_id: uuid.UUID, since: datetime) -> int:
        result = await self._db.execute(
            select(TherapySession).where(
                TherapySession.user_id == user_id, TherapySession.started_at >= since
            )
        )
        today_sessions = result.scalars().all()
        return sum(
            1 for s in today_sessions for turn in s.transcript if turn.get("role") == "user"
        )

    async def get_quota(self, user: User) -> QuotaStatus:
        since = _start_of_today_utc()
        sessions_used = await self._sessions.count_started_since(user_id=user.id, since=since)
        turns_used = await self._turns_used_today(user.id, since)
        return QuotaStatus(
            sessions_used_today=sessions_used,
            sessions_remaining_today=max(0, settings.voice_daily_session_limit - sessions_used),
            turns_used_today=turns_used,
            turns_remaining_today=max(0, settings.voice_daily_turn_limit - turns_used),
        )

    async def start_session(self, user: User) -> TherapySession:
        quota = await self.get_quota(user)
        if quota.sessions_remaining_today <= 0:
            raise DailySessionQuotaExceededError(
                f"Daily session limit of {settings.voice_daily_session_limit} reached"
            )
        return await self._sessions.create(user_id=user.id, transcript=[])

    async def get_session(self, user: User, session_id: uuid.UUID) -> TherapySession:
        session = await self._sessions.get_by_id(session_id, user_id=user.id)
        if session is None:
            raise SessionNotFoundError(str(session_id))
        return session

    async def list_sessions(
        self, user: User, *, offset: int = 0, limit: int = 20
    ) -> list[TherapySession]:
        return await self._sessions.list_for_user(user_id=user.id, offset=offset, limit=limit)

    async def get_memory_profile(self, user: User):
        return await self._profiles.get_by_user_id(user.id)

    async def delete_memory_profile(self, user: User) -> None:
        profile = await self._profiles.get_by_user_id(user.id)
        if profile is not None:
            await self._profiles.delete(profile)

    async def stream_turn(
        self, user: User, session: TherapySession, user_text: str
    ) -> AsyncIterator[TurnChunk]:
        """Streams the assistant's reply for one turn, persisting the full
        exchange (both sides) to `session.transcript` once the stream ends.
        A crisis-language match on the user's own turn short-circuits before
        any LLM call is made at all - the exact `CRISIS_STEPS_TEXT` is
        yielded instead of an LLM-improvised response."""
        if session.status != TherapySessionStatus.active:
            raise SessionAlreadyEndedError(str(session.id))

        quota = await self.get_quota(user)
        if quota.turns_remaining_today <= 0:
            raise DailyTurnQuotaExceededError(
                f"Daily turn limit of {settings.voice_daily_turn_limit} reached"
            )

        now = datetime.now(UTC).isoformat()
        user_crisis = voice_persona.contains_crisis_language(user_text)
        transcript = list(session.transcript)
        transcript.append({"role": "user", "text": user_text, "at": now, "crisis_flagged": user_crisis})

        if user_crisis:
            reply_text = voice_persona.CRISIS_STEPS_TEXT
            transcript.append(
                {"role": "assistant", "text": reply_text, "at": now, "crisis_flagged": True}
            )
            await self._sessions.update(session, transcript=transcript, crisis_flagged=True)
            yield TurnChunk(text=reply_text, is_crisis=True)
            return

        profile = await self._profiles.get_by_user_id(user.id)
        system_prompt = voice_persona.build_system_prompt(
            rolling_summary=profile.rolling_summary if profile else "",
            key_facts=profile.key_facts if profile else {},
        )
        history = [
            {"role": "user" if t["role"] == "user" else "model", "text": t["text"]}
            for t in transcript
        ]

        reply_parts: list[str] = []
        input_tokens = 0
        output_tokens = 0
        async for chunk in llm_client.stream_reply(system_prompt=system_prompt, history=history):
            reply_parts.append(chunk.text)
            input_tokens = max(input_tokens, chunk.input_tokens)
            output_tokens = max(output_tokens, chunk.output_tokens)
            yield TurnChunk(text=chunk.text)

        reply_text = "".join(reply_parts)
        reply_crisis = voice_persona.contains_crisis_language(reply_text)
        transcript.append(
            {"role": "assistant", "text": reply_text, "at": now, "crisis_flagged": reply_crisis}
        )
        await self._sessions.update(
            session,
            transcript=transcript,
            crisis_flagged=session.crisis_flagged or reply_crisis,
            llm_input_tokens=session.llm_input_tokens + input_tokens,
            llm_output_tokens=session.llm_output_tokens + output_tokens,
        )
        if reply_crisis:
            yield TurnChunk(text=voice_persona.CRISIS_STEPS_TEXT, is_crisis=True)

    async def end_session(self, user: User, session: TherapySession) -> TherapySession:
        if session.status != TherapySessionStatus.active:
            raise SessionAlreadyEndedError(str(session.id))

        profile = await self._profiles.get_by_user_id(user.id)
        previous_summary = profile.rolling_summary if profile else ""

        transcript_text = "\n".join(f"{t['role']}: {t['text']}" for t in session.transcript)
        summarization_prompt = (
            "You maintain a private, ongoing memory of one client across therapy "
            "sessions. Given the previous summary and this session's transcript, "
            "write an updated summary in your own words - recurring patterns, "
            "what's worked, what hasn't, stated goals. Keep it concise, a few "
            "sentences to a short paragraph. Reply with the summary text only, "
            "nothing else."
        )
        history = [
            {
                "role": "user",
                "text": (
                    f"Previous summary: {previous_summary or '(none yet)'}\n\n"
                    f"This session's transcript:\n{transcript_text}"
                ),
            }
        ]
        # Summarization is a memory-quality enhancement, not a requirement for
        # ending a session - a session must always be endable even if the LLM
        # is unreachable/unconfigured/out of quota, rather than 500ing and
        # leaving the user stuck in an "active" session they can't close.
        try:
            new_summary = await llm_client.complete(
                system_prompt=summarization_prompt, history=history
            )
        except (LlmNotConfiguredError, LlmQuotaExceededError, LlmRequestError):
            new_summary = None

        if new_summary is not None:
            if profile is None:
                await self._profiles.create(
                    user_id=user.id,
                    rolling_summary=new_summary.strip(),
                    key_facts={},
                    session_count=1,
                )
            else:
                await self._profiles.update(
                    profile,
                    rolling_summary=new_summary.strip(),
                    session_count=profile.session_count + 1,
                )

        return await self._sessions.update(
            session, status=TherapySessionStatus.ended, ended_at=datetime.now(UTC)
        )
