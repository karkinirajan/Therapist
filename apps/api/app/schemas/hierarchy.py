import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class HierarchyItemCreate(BaseModel):
    label: str = Field(min_length=1)
    initial_suds: int = Field(ge=0, le=100)
    current_suds: int | None = Field(default=None, ge=0, le=100)
    climbed: bool = False
    order: int


class HierarchyItemUpdate(BaseModel):
    label: str | None = Field(default=None, min_length=1)
    initial_suds: int | None = Field(default=None, ge=0, le=100)
    current_suds: int | None = Field(default=None, ge=0, le=100)
    climbed: bool | None = None
    order: int | None = None


class HierarchyItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    label: str
    initial_suds: int
    current_suds: int | None
    climbed: bool
    order: int
    created_at: datetime
