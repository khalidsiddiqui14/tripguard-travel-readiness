from datetime import date, timedelta
from types import SimpleNamespace
from app.services.readiness_service import calculate_readiness

def test_readiness_score_is_between_zero_and_100():
    trip = SimpleNamespace(departure_date=date.today()+timedelta(days=10), return_date=date.today()+timedelta(days=12),
        origin_city="Delhi", destination_city="Singapore",
        checklist_items=[SimpleNamespace(is_completed=True) for _ in range(5)])
    result = calculate_readiness(trip)
    assert 0 <= result["score"] <= 100
    assert result["risk_level"] in {"low", "medium", "high"}

def test_no_checklist_does_not_crash():
    trip = SimpleNamespace(departure_date=date.today()+timedelta(days=1), return_date=date.today()+timedelta(days=2),
        origin_city="Delhi", destination_city="Tokyo", checklist_items=[])
    assert calculate_readiness(trip)["score"] >= 0
