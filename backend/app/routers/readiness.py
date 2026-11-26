from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.trip import Trip
from app.services.readiness_service import (
    calculate_readiness,
    save_readiness,
)
router = APIRouter(tags=["Travel Readiness"])
def get_accessible_trip(trip_id: int, db: Session, user: User) -> Trip:
    trip = db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if user.role != "admin" and trip.user_id != user.id:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip
# Dono route chalenge - backend wala bhi, frontend wala bhi
@router.get("/trips/{trip_id}/readiness")
@router.get("/readiness/trips/{trip_id}")
def readiness(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    trip = get_accessible_trip(trip_id, db, user)
    return calculate_readiness(trip)
@router.post("/trips/{trip_id}/readiness/recalculate")
@router.post("/readiness/trips/{trip_id}/recalculate")
def recalculate(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    trip = get_accessible_trip(trip_id, db, user)
    return save_readiness(db, trip)