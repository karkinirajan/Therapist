import enum
import json
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.baseline import Baseline
from app.models.checkin_log import CheckinLog
from app.models.exposure_hierarchy_item import ExposureHierarchyItem
from app.models.roadmap_phase_history import RoadmapPhaseHistory
from app.models.therapy_session import TherapySession
from app.models.tracking_entry import TrackingEntry
from app.models.user import User
from app.models.user_memory_profile import UserMemoryProfile
from app.models.user_roadmap_state import UserRoadmapState
from app.schemas.gating import GateStateOut
from app.services.gating_service import GatingService

# No gate applied here deliberately: the gate-state endpoint is what the
# frontend polls to *decide* whether to enforce the gate, so it can't itself
# require the gate to already be satisfied.
router = APIRouter(prefix="/me", tags=["me"])


def _json_value(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, enum.Enum):
        return value.value
    return value


def _record(model: Any) -> dict[str, Any]:
    return {column.name: _json_value(getattr(model, column.name)) for column in model.__table__.columns}


async def _records(db: AsyncSession, model: Any, user_id: UUID) -> list[dict[str, Any]]:
    result = await db.execute(select(model).where(model.user_id == user_id))
    return [_record(row) for row in result.scalars().all()]


@router.get("/gate-state", response_model=GateStateOut)
async def get_gate_state(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GateStateOut:
    gate_state = await GatingService(db).get_gate_state(current_user)
    return GateStateOut(
        has_baseline=gate_state.has_baseline,
        today_blocking_categories_complete=gate_state.today_blocking_categories_complete,
        this_week_rollup_complete=gate_state.this_week_rollup_complete,
        missing_blocking_categories=gate_state.missing_blocking_categories,
    )


@router.get("/export")
async def export_data(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> Response:
    """Download user-owned product data while excluding credentials and token metadata."""
    payload = {
        "exported_at": datetime.now(UTC).isoformat(),
        "format_version": 1,
        "account": {"id": str(current_user.id), "email": current_user.email, "created_at": _json_value(current_user.created_at)},
        "baseline": await _records(db, Baseline, current_user.id),
        "tracking_entries": await _records(db, TrackingEntry, current_user.id),
        "checkins": await _records(db, CheckinLog, current_user.id),
        "roadmap_state": await _records(db, UserRoadmapState, current_user.id),
        "roadmap_history": await _records(db, RoadmapPhaseHistory, current_user.id),
        "exposure_hierarchy": await _records(db, ExposureHierarchyItem, current_user.id),
        "voice_sessions": await _records(db, TherapySession, current_user.id),
        "voice_memory_profile": await _records(db, UserMemoryProfile, current_user.id),
    }
    return Response(
        content=json.dumps(payload, default=str, separators=(",", ":")),
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="therapist-data-export.json"', "Cache-Control": "no-store"},
    )
