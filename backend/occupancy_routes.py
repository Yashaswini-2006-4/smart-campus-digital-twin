from datetime import date
from typing import Optional
import hmac
import os

from fastapi import APIRouter, HTTPException, Query, Header
from pydantic import BaseModel, Field

from database import (
    save_class_occupancy,
    get_class_occupancy_history,
    delete_class_occupancy_before,
)

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


class DeleteOldOccupancyRequest(BaseModel):
    cutoff_date: date


@router.delete("/delete-old")
def delete_old_class_occupancy(
    payload: DeleteOldOccupancyRequest,
    x_occupancy_delete_secret: Optional[str] = Header(default=None),
):
    """Internal deletion endpoint; called by the authenticated Node API only."""
    expected_secret = os.getenv("OCCUPANCY_DELETE_SECRET", "")
    if not expected_secret or not x_occupancy_delete_secret or not hmac.compare_digest(
        x_occupancy_delete_secret, expected_secret
    ):
        raise HTTPException(status_code=403, detail="Deletion is not authorized.")

    try:
        deleted_count = delete_class_occupancy_before(payload.cutoff_date.isoformat())
        return {
            "message": "Old occupancy records deleted successfully.",
            "cutoff_date": payload.cutoff_date.isoformat(),
            "deleted_count": deleted_count,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
