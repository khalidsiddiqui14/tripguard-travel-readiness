from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.orm import Session, selectinload
from app.db.database import get_db
from app.core.dependencies import get_current_user, require_admin
from app.models.user import User
from app.models.trip import Trip
from app.models.checklist import ChecklistItem
from app.services.readiness_service import calculate_readiness
router = APIRouter(prefix="/dashboard", tags=["Dashboards"])
def count_records(db: Session, model, *conditions) -> int:
    statement = select(func.count(model.id))
    if conditions:
        statement = statement.where(*conditions)
    return db.scalar(statement) or 0
@router.get("/employee")
def employee_dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    statement = select(Trip).options(selectinload(Trip.checklist_items)).where(Trip.user_id == user.id, Trip.status == "upcoming").order_by(Trip.departure_date.asc())
    upcoming_trips = list(db.scalars(statement).all())
    summaries = []
    readiness_scores = []
    for trip in upcoming_trips:
        readiness = calculate_readiness(trip)
        pending = sum(1 for item in trip.checklist_items if not item.is_completed)
        readiness_scores.append(readiness["score"])
        summaries.append({"trip_id": trip.id, "title": trip.title, "destination": trip.destination_city, "destination_city": trip.destination_city, "destination_country": trip.destination_country, "departure_date": trip.departure_date, "return_date": trip.return_date, "status": trip.status, "readiness": readiness, "readiness_score": readiness["score"], "risk_level": readiness["risk_level"], "pending_tasks": pending})
    total_trips = count_records(db, Trip, Trip.user_id == user.id)
    completed_trips = count_records(db, Trip, Trip.user_id == user.id, Trip.status == "completed")
    cancelled_trips = count_records(db, Trip, Trip.user_id == user.id, Trip.status == "cancelled")
    pending_total = db.scalar(select(func.count(ChecklistItem.id)).join(Trip, ChecklistItem.trip_id == Trip.id).where(Trip.user_id == user.id, Trip.status == "upcoming", ChecklistItem.is_completed.is_(False))) or 0
    average_readiness = round(sum(readiness_scores) / len(readiness_scores)) if readiness_scores else 0
    high_risk_trips = sum(1 for trip in summaries if trip["risk_level"] == "high")
    return {"total_trips": total_trips, "upcoming_trips": len(upcoming_trips), "completed_trips": completed_trips, "cancelled_trips": cancelled_trips, "average_readiness": average_readiness, "pending_tasks": pending_total, "high_risk_trips": high_risk_trips, "trips": summaries}
@router.get("/admin")
def admin_dashboard(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    total_employees = count_records(db, User, User.role == "employee")
    active_employees = count_records(db, User, User.role == "employee", User.is_active.is_(True))
    inactive_employees = total_employees - active_employees
    total_trips = count_records(db, Trip)
    upcoming_count = count_records(db, Trip, Trip.status == "upcoming")
    completed_count = count_records(db, Trip, Trip.status == "completed")
    cancelled_count = count_records(db, Trip, Trip.status == "cancelled")
    statement = select(Trip).options(selectinload(Trip.checklist_items), selectinload(Trip.owner)).where(Trip.status == "upcoming").order_by(Trip.departure_date.asc())
    upcoming_trips = list(db.scalars(statement).all())
    flagged_risks = []
    readiness_scores = []
    trip_summaries = []
    for trip in upcoming_trips:
        readiness = calculate_readiness(trip)
        readiness_scores.append(readiness["score"])
        trip_summaries.append({"trip_id": trip.id, "id": trip.id, "title": trip.title, "destination": trip.destination_city, "destination_city": trip.destination_city, "destination_country": trip.destination_country, "departure_date": trip.departure_date, "return_date": trip.return_date, "status": trip.status, "readiness": readiness, "readiness_score": readiness["score"], "risk_level": readiness["risk_level"], "user_name": trip.owner.name if trip.owner else "", "user_email": trip.owner.email if trip.owner else ""})
        if readiness["risk_level"] == "high":
            flagged_risks.append({"trip_id": trip.id, "trip_title": trip.title, "employee_id": trip.user_id, "employee_name": trip.owner.name if trip.owner else "", "destination": trip.destination_city, "departure_date": trip.departure_date, "readiness_score": readiness["score"], "risk_level": readiness["risk_level"], "explanation": readiness["explanation"]})
    average_readiness = round(sum(readiness_scores) / len(readiness_scores)) if readiness_scores else 0
    return {"total_employees": total_employees, "active_employees": active_employees, "inactive_employees": inactive_employees, "total_trips": total_trips, "upcoming_trips": upcoming_count, "completed_trips": completed_count, "cancelled_trips": cancelled_count, "average_readiness": average_readiness, "flagged_risks_count": len(flagged_risks), "flagged_risks": flagged_risks, "trips": trip_summaries}