import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.gating_deps import require_gate
from app.models.user import User
from app.schemas.checkin import CheckinCreate, CheckinOut, StreakSummary
from app.services.checkin_service import CheckinNotFoundError, CheckinService

router = APIRouter(prefix="/checkins", tags=["checkins"])


@router.post("", response_model=CheckinOut, status_code=status.HTTP_201_CREATED)
async def create_checkin(
    body: CheckinCreate,
    current_user: User = Depends(require_gate(needs_baseline=True)),
    db: AsyncSession = Depends(get_db),
) -> CheckinOut:
    checkin = await CheckinService(db).create(current_user, body)
    return CheckinOut.model_validate(checkin)


@router.get("", response_model=list[CheckinOut])
async def list_checkins(
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(require_gate(needs_baseline=True)),
    db: AsyncSession = Depends(get_db),
) -> list[CheckinOut]:
    checkins = await CheckinService(db).list(current_user, offset=offset, limit=limit)
    return [CheckinOut.model_validate(c) for c in checkins]


@router.get("/streaks", response_model=StreakSummary)
async def get_streaks(
    current_user: User = Depends(require_gate(needs_baseline=True)),
    db: AsyncSession = Depends(get_db),
) -> StreakSummary:
    result = await CheckinService(db).streaks(current_user)
    return StreakSummary(
        current_streak=result.current_streak,
        longest_streak=result.longest_streak,
        all_time_meds_adherence_pct=result.all_time_meds_adherence_pct,
        last_8_meds_adherence_pct=result.last_8_meds_adherence_pct,
        homework_attempt_rate_pct=result.homework_attempt_rate_pct,
    )


@router.get("/{checkin_id}", response_model=CheckinOut)
async def get_checkin(
    checkin_id: uuid.UUID,
    current_user: User = Depends(require_gate(needs_baseline=True)),
    db: AsyncSession = Depends(get_db),
) -> CheckinOut:
    try:
        checkin = await CheckinService(db).get(current_user, checkin_id)
    except CheckinNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Check-in not found"
        ) from exc
    return CheckinOut.model_validate(checkin)
