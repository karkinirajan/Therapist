from pydantic import BaseModel


class GateStateOut(BaseModel):
    has_baseline: bool
    today_blocking_categories_complete: bool
    this_week_rollup_complete: bool
    missing_blocking_categories: list[str]
