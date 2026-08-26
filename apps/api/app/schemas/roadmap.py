import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict


class RoadmapStateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    phase_index: int
    intro_acknowledged: bool


class RoadmapAdvanceRequest(BaseModel):
    confirm_early: bool = False


class RoadmapPhaseHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    from_phase: int
    to_phase: int
    date: date
    earned: bool


class RoadmapAdvanceResponse(BaseModel):
    state: RoadmapStateOut
    history: RoadmapPhaseHistoryOut
