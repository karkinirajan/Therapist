import uuid
from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.tracking_entry import TrackingCadence

# --- reference data -------------------------------------------------------


class TrackingCategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    key: str
    label: str
    description: str
    sort_order: int
    is_blocking: bool


# --- per-category, per-cadence payload shapes -----------------------------
# Each category has a distinct payload shape per cadence. `extra="forbid"` so
# a wrong-shaped/mistyped payload for a category is actually rejected, not
# silently accepted as an arbitrary dict.


class _StrictPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ExecutiveFunctionDaily(_StrictPayload):
    task_initiated: bool
    planned_count: int = Field(ge=0)
    completed_count: int = Field(ge=0)
    took_longer_than_planned: bool


class ExecutiveFunctionWeekly(_StrictPayload):
    planning_accuracy_pct: int = Field(ge=0, le=100)
    blocker_note: str


class ExecutiveFunctionMonthly(_StrictPayload):
    completion_rate_trend: Literal["up", "flat", "down"]
    scaffolding_usage_note: str


class CompulsionErpDaily(_StrictPayload):
    compulsions_resisted: int = Field(ge=0)
    compulsions_performed: int = Field(ge=0)
    suds_before: int | None = Field(default=None, ge=0, le=100)
    suds_after: int | None = Field(default=None, ge=0, le=100)
    intrusive_thought_band: Literal["none", "low", "moderate", "high"]


class CompulsionErpWeekly(_StrictPayload):
    hierarchy_progress_note: str
    suds_decay_note: str


class CompulsionErpMonthly(_StrictPayload):
    hierarchy_completion_pct: int = Field(ge=0, le=100)
    new_themes_note: str


class MoodAnxietyDaily(_StrictPayload):
    mood: int = Field(ge=1, le=10)
    anxiety: int = Field(ge=1, le=10)
    sleep_quality: Literal["poor", "fair", "good", "great"]
    panic_or_shutdown: bool


class MoodAnxietyWeekly(_StrictPayload):
    mood_avg: float
    anxiety_avg: float
    volatility_note: str


class MoodAnxietyMonthly(_StrictPayload):
    trend_note: str


class BehavioralActivationDaily(_StrictPayload):
    activity: str
    value_link: str
    predicted_mood_delta: int
    actual_mood_delta: int | None = None


class BehavioralActivationWeekly(_StrictPayload):
    domains_covered: list[str]
    neglected_domains: list[str]


class BehavioralActivationMonthly(_StrictPayload):
    neglect_trend_note: str


class SleepMedsDaily(_StrictPayload):
    sleep_quality: Literal["poor", "fair", "good", "great"]
    sleep_hours: float | None = Field(default=None, ge=0, le=24)
    meds_taken: bool
    meds_time: str | None = None


class SleepMedsWeekly(_StrictPayload):
    adherence_pct: int = Field(ge=0, le=100)
    routine_consistency_note: str


class SleepMedsMonthly(_StrictPayload):
    adherence_trend_note: str
    raise_with_prescriber: bool


class DistortionAwarenessDaily(_StrictPayload):
    distortions: list[str]


class DistortionAwarenessWeekly(_StrictPayload):
    most_frequent: str | None = None
    thought_records_completed: int = Field(ge=0)


class DistortionAwarenessMonthly(_StrictPayload):
    frequency_trend_note: str


PAYLOAD_SCHEMAS: dict[str, dict[TrackingCadence, type[_StrictPayload]]] = {
    "executive_function": {
        TrackingCadence.daily: ExecutiveFunctionDaily,
        TrackingCadence.weekly: ExecutiveFunctionWeekly,
        TrackingCadence.monthly: ExecutiveFunctionMonthly,
    },
    "compulsion_erp": {
        TrackingCadence.daily: CompulsionErpDaily,
        TrackingCadence.weekly: CompulsionErpWeekly,
        TrackingCadence.monthly: CompulsionErpMonthly,
    },
    "mood_anxiety": {
        TrackingCadence.daily: MoodAnxietyDaily,
        TrackingCadence.weekly: MoodAnxietyWeekly,
        TrackingCadence.monthly: MoodAnxietyMonthly,
    },
    "behavioral_activation": {
        TrackingCadence.daily: BehavioralActivationDaily,
        TrackingCadence.weekly: BehavioralActivationWeekly,
        TrackingCadence.monthly: BehavioralActivationMonthly,
    },
    "sleep_meds": {
        TrackingCadence.daily: SleepMedsDaily,
        TrackingCadence.weekly: SleepMedsWeekly,
        TrackingCadence.monthly: SleepMedsMonthly,
    },
    "distortion_awareness": {
        TrackingCadence.daily: DistortionAwarenessDaily,
        TrackingCadence.weekly: DistortionAwarenessWeekly,
        TrackingCadence.monthly: DistortionAwarenessMonthly,
    },
}


def get_payload_schema(category_key: str, cadence: TrackingCadence) -> type[_StrictPayload] | None:
    """Returns the strict payload schema for a (category_key, cadence) pair, or
    None if the category key isn't recognized (caller maps that to 404) or the
    cadence isn't valid for that category."""
    return PAYLOAD_SCHEMAS.get(category_key, {}).get(cadence)


# --- request/response models -----------------------------------------------


class TrackingEntryCreate(BaseModel):
    category_key: str
    cadence: TrackingCadence
    period_start: date
    payload: dict[str, Any]


class TrackingEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    category_id: uuid.UUID
    cadence: TrackingCadence
    period_start: date
    payload: dict[str, Any]
    created_at: datetime
    updated_at: datetime | None
