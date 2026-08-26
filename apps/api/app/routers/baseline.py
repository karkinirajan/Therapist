from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.baseline import BaselineCreate, BaselineOut, BaselineUpdate
from app.services.baseline_service import (
    BaselineAlreadyExistsError,
    BaselineNotFoundError,
    BaselineService,
)

# No gate applied here deliberately: baseline creation is the chicken-and-egg
# prerequisite the gate itself depends on.
router = APIRouter(prefix="/baseline", tags=["baseline"])


@router.post("", response_model=BaselineOut, status_code=status.HTTP_201_CREATED)
async def create_baseline(
    body: BaselineCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BaselineOut:
    service = BaselineService(db)
    try:
        baseline = await service.create(current_user, body)
    except BaselineAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Baseline already exists"
        ) from exc
    return BaselineOut.model_validate(baseline)


@router.get("", response_model=BaselineOut)
async def get_baseline(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BaselineOut:
    service = BaselineService(db)
    try:
        baseline = await service.get(current_user)
    except BaselineNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No baseline found"
        ) from exc
    return BaselineOut.model_validate(baseline)


@router.put("", response_model=BaselineOut)
async def redo_baseline(
    body: BaselineUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BaselineOut:
    service = BaselineService(db)
    try:
        baseline = await service.redo(current_user, body)
    except BaselineNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No baseline found"
        ) from exc
    return BaselineOut.model_validate(baseline)
