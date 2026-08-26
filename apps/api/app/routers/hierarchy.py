import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.core.gating_deps import require_gate
from app.models.user import User
from app.schemas.hierarchy import HierarchyItemCreate, HierarchyItemOut, HierarchyItemUpdate
from app.services.hierarchy_service import HierarchyItemNotFoundError, HierarchyService

router = APIRouter(prefix="/hierarchy", tags=["hierarchy"])


@router.post("", response_model=HierarchyItemOut, status_code=status.HTTP_201_CREATED)
async def create_item(
    body: HierarchyItemCreate,
    current_user: User = Depends(require_gate(needs_baseline=True)),
    db: AsyncSession = Depends(get_db),
) -> HierarchyItemOut:
    item = await HierarchyService(db).create(current_user, body)
    return HierarchyItemOut.model_validate(item)


@router.get("", response_model=list[HierarchyItemOut])
async def list_items(
    current_user: User = Depends(require_gate(needs_baseline=True)),
    db: AsyncSession = Depends(get_db),
) -> list[HierarchyItemOut]:
    items = await HierarchyService(db).list(current_user)
    return [HierarchyItemOut.model_validate(i) for i in items]


@router.get("/{item_id}", response_model=HierarchyItemOut)
async def get_item(
    item_id: uuid.UUID,
    current_user: User = Depends(require_gate(needs_baseline=True)),
    db: AsyncSession = Depends(get_db),
) -> HierarchyItemOut:
    try:
        item = await HierarchyService(db).get(current_user, item_id)
    except HierarchyItemNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Hierarchy item not found"
        ) from exc
    return HierarchyItemOut.model_validate(item)


@router.put("/{item_id}", response_model=HierarchyItemOut)
async def update_item(
    item_id: uuid.UUID,
    body: HierarchyItemUpdate,
    current_user: User = Depends(require_gate(needs_baseline=True)),
    db: AsyncSession = Depends(get_db),
) -> HierarchyItemOut:
    try:
        item = await HierarchyService(db).update(current_user, item_id, body)
    except HierarchyItemNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Hierarchy item not found"
        ) from exc
    return HierarchyItemOut.model_validate(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: uuid.UUID,
    current_user: User = Depends(require_gate(needs_baseline=True)),
    db: AsyncSession = Depends(get_db),
) -> None:
    try:
        await HierarchyService(db).delete(current_user, item_id)
    except HierarchyItemNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Hierarchy item not found"
        ) from exc
