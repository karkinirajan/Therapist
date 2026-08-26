from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.gating_deps import require_gate
from app.models.user import User
from app.schemas.roadmap import (
    RoadmapAdvanceRequest,
    RoadmapAdvanceResponse,
    RoadmapPhaseHistoryOut,
    RoadmapStateOut,
)
from app.services.roadmap_service import (
    AlreadyAtFinalPhaseError,
    PhaseAdvanceNotEarnedError,
    RoadmapService,
)

router = APIRouter(prefix="/roadmap", tags=["roadmap"])


@router.get("/state", response_model=RoadmapStateOut)
async def get_state(
    current_user: User = Depends(require_gate(needs_baseline=True)),
    db: AsyncSession = Depends(get_db),
) -> RoadmapStateOut:
    state = await RoadmapService(db).get_or_init_state(current_user)
    return RoadmapStateOut.model_validate(state)


@router.post("/advance", response_model=RoadmapAdvanceResponse)
async def advance(
    body: RoadmapAdvanceRequest,
    current_user: User = Depends(require_gate(needs_baseline=True)),
    db: AsyncSession = Depends(get_db),
) -> RoadmapAdvanceResponse:
    service = RoadmapService(db)
    try:
        result = await service.advance_phase(current_user, confirm_early=body.confirm_early)
    except PhaseAdvanceNotEarnedError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This phase's metric hasn't been met yet. Pass confirm_early=true "
                "to advance anyway."
            ),
        ) from exc
    except AlreadyAtFinalPhaseError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Already at the final phase"
        ) from exc
    return RoadmapAdvanceResponse(
        state=RoadmapStateOut.model_validate(result.state),
        history=RoadmapPhaseHistoryOut.model_validate(result.history),
    )
