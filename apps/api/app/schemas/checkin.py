import uuid
from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.checkin_log import HomeworkStatus

# --- CBT tool_data discriminated union --------------------------------------


class ThoughtRecordData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tool: Literal["thought-record"] = "thought-record"
    situation: str
    automatic_thought: str
    distortion: str
    evidence_for: str
    evidence_against: str
    balanced_thought: str


class BehavioralActivationData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tool: Literal["behavioral-activation"] = "behavioral-activation"
    activity: str
    value_link: str
    predicted_mood_delta: int
    actual_mood_delta: int | None = None


class ExposureHierarchyData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tool: Literal["exposure-hierarchy"] = "exposure-hierarchy"
    item_label: str
    suds_before: int = Field(ge=0, le=100)
    suds_after: int = Field(ge=0, le=100)
    notes: str


class BehavioralExperimentData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tool: Literal["behavioral-experiment"] = "behavioral-experiment"
    prediction: str
    experiment: str
    outcome: str
    what_it_means: str


ToolData = Annotated[
    ThoughtRecordData
    | BehavioralActivationData
    | ExposureHierarchyData
    | BehavioralExperimentData,
    Field(discriminator="tool"),
]


# --- request/response models -----------------------------------------------


class CheckinCreate(BaseModel):
    date: date
    mood: int
    anxiety: int
    meds: bool
    sleep: str
    last_homework_status: HomeworkStatus
    last_homework_note: str
    gap_reflection: str
    what_worked: str
    what_didnt: str
    tool_data: ToolData | None = None
    pattern_flagged: str
    roadmap_phase_name: str
    next_homework: str
    next_homework_due: date | None = None


class CheckinOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    date: date
    mood: int
    anxiety: int
    meds: bool
    sleep: str
    last_homework_status: HomeworkStatus
    last_homework_note: str
    gap_reflection: str
    what_worked: str
    what_didnt: str
    tool_data: dict | None
    pattern_flagged: str
    roadmap_phase_name: str
    next_homework: str
    next_homework_due: date | None
    streak_at_logging: int
    created_at: datetime


class StreakSummary(BaseModel):
    current_streak: int
    longest_streak: int
    all_time_meds_adherence_pct: float
    last_8_meds_adherence_pct: float
    homework_attempt_rate_pct: float
