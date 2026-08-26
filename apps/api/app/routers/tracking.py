from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.gating_deps import require_gate
from app.models.tracking_entry import TrackingCadence
from app.models.user import User
from app.schemas.tracking import TrackingCategoryOut, TrackingEntryCreate, TrackingEntryOut
from app.services.tracking_service import (
    InvalidTrackingPayloadError,
    TrackingService,
    UnknownTrackingCategoryError,
)

router = APIRouter(prefix="/tracking", tags=["tracking"])


@router.get("/categories", response_model=list[TrackingCategoryOut])
async def list_categories(
    current_user: User = Depends(require_gate(needs_baseline=True)),
    db: AsyncSession = Depends(get_db),
) -> list[TrackingCategoryOut]:
    categories = await TrackingService(db).list_categories()
    return [TrackingCategoryOut.model_validate(c) for c in categories]


@router.post("/entries", response_model=TrackingEntryOut, status_code=status.HTTP_201_CREATED)
async def record_entry(
    body: TrackingEntryCreate,
    current_user: User = Depends(require_gate(needs_baseline=True)),
    db: AsyncSession = Depends(get_db),
) -> TrackingEntryOut:
    service = TrackingService(db)
    try:
        entry = await service.record_entry(
            current_user,
            category_key=body.category_key,
            cadence=body.cadence,
            period_start=body.period_start,
            payload=body.payload,
        )
    except UnknownTrackingCategoryError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown tracking category: {body.category_key}",
        ) from exc
    except InvalidTrackingPayloadError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    return TrackingEntryOut.model_validate(entry)


@router.get("/entries", response_model=list[TrackingEntryOut])
async def list_entries(
    category_key: str | None = Query(default=None),
    cadence: TrackingCadence | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    current_user: User = Depends(require_gate(needs_baseline=True)),
    db: AsyncSession = Depends(get_db),
) -> list[TrackingEntryOut]:
    service = TrackingService(db)
    try:
        entries = await service.list_entries(
            current_user,
            category_key=category_key,
            cadence=cadence,
            date_from=date_from,
            date_to=date_to,
        )
    except UnknownTrackingCategoryError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown tracking category: {category_key}",
        ) from exc
    return [TrackingEntryOut.model_validate(e) for e in entries]
