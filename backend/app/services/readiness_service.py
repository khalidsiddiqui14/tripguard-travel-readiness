from datetime import date
from sqlalchemy.orm import Session
from app.models.trip import Trip
from app.models.readiness import ReadinessRecord
DEFAULT_TASKS = [
    "Flight booking confirmed",
    "Accommodation confirmed",
    "Travel insurance arranged",
    "Passport and visa checked",
    "Emergency contacts saved",
]
READINESS_BUSINESS_RULES = {
    "checklist_completion": "Up to 40 points, proportional to completed checklist items.",
    "weather": "Up to 30 points. Normal weather = 30, moderate = 15, severe = 0. If weather data is unavailable, full 30 points are given and weather is marked as unavailable.",
    "departure_proximity": "Up to 20 points. If checklist is fully complete, 20 points always. Otherwise 20 points at least 7 days before departure, 10 points 2-6 days before departure, 0 points 0-1 day before departure.",
    "trip_details": "10 points when origin, destination and trip dates are valid.",
    "risk_bands": "Low: 75-100; Medium: 45-74; High: 0-44.",
}
def calculate_readiness(trip: Trip, today: date | None = None, weather_risk: str | None = None) -> dict:
    today = today or date.today()
    items = trip.checklist_items or []
    total_tasks = len(items)
    completed_tasks = sum(1 for item in items if item.is_completed)
    checklist_score = round((completed_tasks / total_tasks) * 40) if total_tasks else 0
    weather_map = {"normal": 30, "clear": 30, "moderate": 15, "rain": 15, "severe": 0, "storm": 0, "extreme": 0}
    weather_key = str(weather_risk or "normal").lower().strip()
    weather_score = weather_map.get(weather_key, 30)
    weather_available = weather_risk is not None
    if trip.departure_date is not None:
        days_until_departure = (trip.departure_date - today).days
    else:
        days_until_departure = 999
    is_fully_ready = total_tasks > 0 and completed_tasks == total_tasks
    if is_fully_ready:
        proximity_score = 20
    elif days_until_departure >= 7:
        proximity_score = 20
    elif days_until_departure >= 2:
        proximity_score = 10
    else:
        proximity_score = 0
    valid_details = bool(trip.origin_city) and bool(trip.destination_city) and trip.departure_date is not None and trip.return_date is not None and trip.return_date >= trip.departure_date
    details_score = 10 if valid_details else 0
    score = min(100, checklist_score + weather_score + proximity_score + details_score)
    if score >= 75:
        risk_level = "low"
    elif score >= 45:
        risk_level = "medium"
    else:
        risk_level = "high"
    explanation = f"Checklist {checklist_score}/40; weather {weather_score}/30; trip timing {proximity_score}/20; trip details {details_score}/10."
    return {
        "score": score,
        "risk_level": risk_level,
        "explanation": explanation,
        "business_rules": READINESS_BUSINESS_RULES,
        "score_breakdown": {"checklist": checklist_score, "weather": weather_score, "departure_proximity": proximity_score, "trip_details": details_score},
        "checklist_progress": {"completed": completed_tasks, "total": total_tasks},
        "weather_available": weather_available,
        "days_until_departure": days_until_departure,
    }
def save_readiness(db: Session, trip: Trip, weather_risk: str | None = None) -> dict:
    result = calculate_readiness(trip, weather_risk=weather_risk)
    try:
        db.query(ReadinessRecord).filter(ReadinessRecord.trip_id == trip.id).delete()
        record = ReadinessRecord(trip_id=trip.id, score=result["score"], risk_level=result["risk_level"], explanation=result["explanation"])
        db.add(record)
        db.commit()
        db.refresh(record)
    except Exception:
        db.rollback()
        raise
    return {"id": record.id, **result}