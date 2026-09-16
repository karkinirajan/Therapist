import json
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from app.core.security import decode_access_token
from app.db.session import async_session_factory
from app.repositories.user_repo import UserRepository
from app.services.llm_client import LlmNotConfiguredError, LlmQuotaExceededError, LlmRequestError
from app.services.voice_service import (
    DailyTurnQuotaExceededError,
    SessionAlreadyEndedError,
    SessionNotFoundError,
    VoiceService,
)

router = APIRouter(prefix="/voice", tags=["voice"])

# WebSocket protocol (JSON text frames both ways):
#   client -> server: {"type": "transcript_chunk", "text": "..."}
#   server -> client: {"type": "reply_token", "text": "..."}
#                      {"type": "reply_done"}
#                      {"type": "crisis_flag", "text": "..."}
#                      {"type": "error", "detail": "..."}


@router.websocket("/ws")
async def voice_conversation(websocket: WebSocket, session_id: uuid.UUID, token: str) -> None:
    # Native browser WebSocket can't set an Authorization header, so the
    # access token travels as a query param instead - see the plan's Safety
    # note: this is exactly as exposed as the rest of this deployment is
    # today (plain HTTP, no TLS yet), not a new weakness introduced here.
    user_id = decode_access_token(token)
    if user_id is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
        return

    async with async_session_factory() as db:
        user = await UserRepository(db).get_by_id(user_id)
        if user is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
            return

        service = VoiceService(db)
        try:
            session = await service.get_session(user, session_id)
        except SessionNotFoundError:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Session not found")
            return

        await websocket.accept()

        try:
            while True:
                raw = await websocket.receive_text()
                try:
                    message = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                if message.get("type") != "transcript_chunk":
                    continue
                user_text = str(message.get("text", "")).strip()
                if not user_text:
                    continue

                try:
                    async for chunk in service.stream_turn(user, session, user_text):
                        frame_type = "crisis_flag" if chunk.is_crisis else "reply_token"
                        await websocket.send_text(json.dumps({"type": frame_type, "text": chunk.text}))
                    await websocket.send_text(json.dumps({"type": "reply_done"}))
                    await db.commit()
                except DailyTurnQuotaExceededError:
                    await websocket.send_text(
                        json.dumps(
                            {
                                "type": "error",
                                "detail": "Daily conversation limit reached. Come back tomorrow.",
                            }
                        )
                    )
                except SessionAlreadyEndedError:
                    await websocket.send_text(
                        json.dumps({"type": "error", "detail": "This session has ended."})
                    )
                    break
                except (LlmNotConfiguredError, LlmQuotaExceededError, LlmRequestError):
                    await websocket.send_text(
                        json.dumps(
                            {
                                "type": "error",
                                "detail": "Unable to reach the conversation service right now.",
                            }
                        )
                    )
                    await db.rollback()
        except WebSocketDisconnect:
            await db.commit()
