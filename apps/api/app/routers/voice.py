import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.gating_deps import require_gate
from app.core.rate_limit import limiter, user_key
from app.models.user import User
from app.schemas.voice import TherapySessionOut, TtsRequest, UserMemoryProfileOut, VoiceQuotaOut
from app.services import tts_client
from app.services.tts_client import TtsNotConfiguredError, TtsQuotaExceededError, TtsRequestError
from app.services.voice_service import (
    DailySessionQuotaExceededError,
    SessionAlreadyEndedError,
    SessionNotFoundError,
    VoiceService,
)

router = APIRouter(prefix="/voice", tags=["voice"])


async def _stash_user_for_rate_limit(
    request: Request,
    current_user: User = Depends(require_gate(needs_baseline=True)),
) -> User:
    request.state.rate_limit_user_id = str(current_user.id)
    return current_user


@router.post("/sessions", response_model=TherapySessionOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute", key_func=user_key)
async def start_session(
    request: Request,
    current_user: User = Depends(_stash_user_for_rate_limit),
    db: AsyncSession = Depends(get_db),
) -> TherapySessionOut:
    try:
        session = await VoiceService(db).start_session(current_user)
    except DailySessionQuotaExceededError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc)
        ) from exc
    return TherapySessionOut.model_validate(session)


@router.post("/sessions/{session_id}/end", response_model=TherapySessionOut)
async def end_session(
    session_id: uuid.UUID,
    current_user: User = Depends(require_gate(needs_baseline=True)),
    db: AsyncSession = Depends(get_db),
) -> TherapySessionOut:
    service = VoiceService(db)
    try:
        session = await service.get_session(current_user, session_id)
        ended = await service.end_session(current_user, session)
    except SessionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
        ) from exc
    except SessionAlreadyEndedError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Session already ended"
        ) from exc
    return TherapySessionOut.model_validate(ended)


@router.post("/tts")
@limiter.limit("30/minute", key_func=user_key)
async def synthesize_speech(
    request: Request,
    body: TtsRequest,
    current_user: User = Depends(_stash_user_for_rate_limit),
) -> Response:
    """Returns MP3 bytes on success. On quota exhaustion or missing config,
    returns a 200 JSON `{"use_browser_tts": true}` rather than an error -
    the frontend is expected to fall back to SpeechSynthesis, not treat this
    as a failed request."""
    del current_user  # auth-only; TTS isn't scoped to a session
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="text is required")
    try:
        audio = await tts_client.synthesize(text=text)
    except (TtsNotConfiguredError, TtsQuotaExceededError, TtsRequestError):
        return Response(content='{"use_browser_tts": true}', media_type="application/json")
    return Response(content=audio, media_type="audio/mpeg")


@router.get("/quota", response_model=VoiceQuotaOut)
async def get_quota(
    current_user: User = Depends(require_gate(needs_baseline=True)),
    db: AsyncSession = Depends(get_db),
) -> VoiceQuotaOut:
    quota = await VoiceService(db).get_quota(current_user)
    return VoiceQuotaOut(
        sessions_used_today=quota.sessions_used_today,
        sessions_remaining_today=quota.sessions_remaining_today,
        turns_used_today=quota.turns_used_today,
        turns_remaining_today=quota.turns_remaining_today,
    )


@router.get("/sessions", response_model=list[TherapySessionOut])
async def list_sessions(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(require_gate(needs_baseline=True)),
    db: AsyncSession = Depends(get_db),
) -> list[TherapySessionOut]:
    sessions = await VoiceService(db).list_sessions(current_user, offset=offset, limit=limit)
    return [TherapySessionOut.model_validate(s) for s in sessions]


@router.get("/sessions/{session_id}", response_model=TherapySessionOut)
async def get_session(
    session_id: uuid.UUID,
    current_user: User = Depends(require_gate(needs_baseline=True)),
    db: AsyncSession = Depends(get_db),
) -> TherapySessionOut:
    try:
        session = await VoiceService(db).get_session(current_user, session_id)
    except SessionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
        ) from exc
    return TherapySessionOut.model_validate(session)


@router.get("/memory-profile", response_model=UserMemoryProfileOut | None)
async def get_memory_profile(
    current_user: User = Depends(require_gate(needs_baseline=True)),
    db: AsyncSession = Depends(get_db),
) -> UserMemoryProfileOut | None:
    profile = await VoiceService(db).get_memory_profile(current_user)
    return UserMemoryProfileOut.model_validate(profile) if profile else None


@router.delete("/memory-profile", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memory_profile(
    current_user: User = Depends(require_gate(needs_baseline=True)),
    db: AsyncSession = Depends(get_db),
) -> None:
    await VoiceService(db).delete_memory_profile(current_user)
