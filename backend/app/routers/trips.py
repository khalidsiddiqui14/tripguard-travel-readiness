from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.trip import Trip
from app.models.checklist import ChecklistItem
from app.schemas.trip import TripCreate, TripUpdate, TripResponse
from app.services.readiness_service import DEFAULT_TASKS
router = APIRouter(prefix="/trips", tags=["Trips"])
def get_owned_trip(db: Session, trip_id: int, user: User):
    trip = db.get(Trip, trip_id)
    if not trip or (user.role != "admin" and trip.user_id != user.id):
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip
@router.post("", response_model=TripResponse, status_code=201)
def create_trip(payload: TripCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        trip = Trip(user_id=user.id, **payload.model_dump())
        db.add(trip)
        db.flush()
        for title in DEFAULT_TASKS:
            db.add(ChecklistItem(trip_id=trip.id, title=title))
        db.commit()
        db.refresh(trip)
        return trip
    except Exception:
        db.rollback()
        raise
@router.get("", response_model=list[TripResponse])
def list_trips(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    query = select(Trip).order_by(Trip.departure_date)
    if user.role != "admin":
        query = query.where(Trip.user_id == user.id)
    return list(db.scalars(query).all())
@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return get_owned_trip(db, trip_id, user)
@router.put("/{trip_id}", response_model=TripResponse)
def update_trip(trip_id: int, payload: TripUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    trip = get_owned_trip(db, trip_id, user)
    if trip.status == "cancelled":
        raise HTTPException(status_code=400, detail="Cancelled trip cannot be updated")
    # FIX: sirf wahi field update hogi jo user ne bheji hai, baaki same rahegi
    # Pehle wala model_dump() saari field ko None kar deta tha
    data = payload.model_dump(exclude_unset=True, exclude_none=True)
    for key, value in data.items():
        setattr(trip, key, value)
    try:
        db.commit()
        db.refresh(trip)
    except Exception:
        db.rollback()
        raise
    return trip
@router.patch("/{trip_id}/cancel", response_model=TripResponse)
def cancel_trip(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    trip = get_owned_trip(db, trip_id, user)
    if trip.status == "cancelled":
        raise HTTPException(status_code=400, detail="Trip is already cancelled")
    if trip.status == "completed":
        raise HTTPException(status_code=400, detail="Completed trip cannot be cancelled")
    trip.status = "cancelled"
    try:
        db.commit()
        db.refresh(trip)
    except Exception:
        db.rollback()
        raise
    return trip