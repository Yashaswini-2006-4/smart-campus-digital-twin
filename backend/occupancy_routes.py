from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from database import save_class_occupancy, get_class_occupancy_history

router = APIRouter(prefix="/class-occupancy", tags=["Class Occupancy"])


class ClassOccupancyRequest(BaseModel):
    record_date: date
    class_section: str = Field(..., min_length=1, max_length=80)
    room_number: str = Field(..., min_length=1, max_length=40)
    student_count: int = Field(..., ge=0, le=10000)


@router.post("")
def create_or_update_class_occupancy(payload: ClassOccupancyRequest):
    """Save a class count; submitting the same class/date updates that record."""
    try:
        return {
            "message": "Class occupancy saved successfully.",
            "record": save_class_occupancy(
                record_date=payload.record_date.isoformat(),
                class_section=payload.class_section,
                room_number=payload.room_number,
                student_count=payload.student_count,
            ),
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("")
def class_occupancy_history(
    record_date: Optional[date] = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
):
    records = get_class_occupancy_history(
        record_date=record_date.isoformat() if record_date else None,
        limit=limit,
    )
    return {"count": len(records), "records": records}
