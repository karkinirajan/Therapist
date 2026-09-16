import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.therapy_session import TherapySessionStatus


class TherapySessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    status: TherapySessionStatus
    transcript: list
    started_at: datetime
    ended_at: datetime | None
    crisis_flagged: bool


class UserMemoryProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rolling_summary: str
    key_facts: dict
    session_count: int
    updated_at: datetime


class VoiceQuotaOut(BaseModel):
    sessions_used_today: int
    sessions_remaining_today: int
    turns_used_today: int
    turns_remaining_today: int


class TtsRequest(BaseModel):
    text: str
