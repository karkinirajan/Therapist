import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.baseline import Cadence, MedsAdherence, SleepQuality


class BaselineCreate(BaseModel):
    mood: int = Field(ge=1, le=10)
    anxiety: int = Field(ge=1, le=10)
    energy: int = Field(ge=1, le=10)
    sleep_quality: SleepQuality
    meds_adherence_2wk: MedsAdherence
    career_example: str = Field(min_length=1)
    structure_example: str = Field(min_length=1)
    life_example: str = Field(min_length=1)
    what_works: str = Field(min_length=1)
    non_negotiables: str | None = None
    cadence: Cadence


class BaselineUpdate(BaselineCreate):
    """Same shape as create - a redo/update replaces the whole intake snapshot."""


class BaselineOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    mood: int
    anxiety: int
    energy: int
    sleep_quality: SleepQuality
    meds_adherence_2wk: MedsAdherence
    career_example: str
    structure_example: str
    life_example: str
    what_works: str
    non_negotiables: str | None
    cadence: Cadence
