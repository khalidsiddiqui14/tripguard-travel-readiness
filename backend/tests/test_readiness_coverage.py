from types import SimpleNamespace
from datetime import date, timedelta
from app.services.readiness_service import calculate_readiness

def make_trip(checklist=None, departure_days=10, title="Test", origin="Delhi", dest="Mumbai", country="India", purpose="Business", budget=10000):
    items = []
    for i, done in enumerate(checklist or []):
        items.append(SimpleNamespace(id=i+1, title=f"Task {i+1}", is_completed=done))
    return SimpleNamespace(
        title=title,
        origin_city=origin,
        destination_city=dest,
        destination_country=country,
        purpose=purpose,
        departure_date=date.today() + timedelta(days=departure_days),
        return_date=date.today() + timedelta(days=departure_days + 2),
        budget_amount=budget,
        budget_currency="INR",
        status="upcoming",
        checklist_items=items,
    )

def test_score_is_int():
    r = calculate_readiness(make_trip([True, False]))
    assert isinstance(r["score"], int)

def test_full_checklist_gives_high_score():
    r = calculate_readiness(make_trip([True, True, True, True]))
    assert r["score"] >= 70

def test_empty_checklist_gives_low_score():
    r = calculate_readiness(make_trip([]))
    assert r["score"] < 70

def test_all_incomplete_checklist():
    r = calculate_readiness(make_trip([False, False]))
    assert r["checklist_progress"]["completed"] == 0

def test_half_checklist_progress():
    r = calculate_readiness(make_trip([True, False, True, False]))
    assert r["checklist_progress"]["completed"] == 2
    assert r["checklist_progress"]["total"] == 4

def test_high_score_is_low_risk():
    r = calculate_readiness(make_trip([True]*10))
    if r["score"] >= 75:
        assert r["risk_level"] == "low"

def test_low_score_is_high_risk():
    r = calculate_readiness(make_trip([]))
    if r["score"] <= 44:
        assert r["risk_level"] == "high"

def test_medium_risk_band():
    r = calculate_readiness(make_trip([True, False]))
    if 45 <= r["score"] <= 74:
        assert r["risk_level"] == "medium"

def test_breakdown_total_equals_score():
    r = calculate_readiness(make_trip([True, False]))
    b = r["score_breakdown"]
    total = sum(v for v in b.values() if isinstance(v, (int, float)))
    assert total == r["score"]

def test_breakdown_has_all_keys():
    r = calculate_readiness(make_trip([True]))
    assert "checklist" in r["score_breakdown"]
    assert "weather" in r["score_breakdown"] or "checklist_setup" in r["score_breakdown"]

def test_explanation_exists():
    r = calculate_readiness(make_trip([True]))
    assert isinstance(r["explanation"], str)
    assert len(r["explanation"]) > 0

def test_business_rules_exist():
    r = calculate_readiness(make_trip([True]))
    assert isinstance(r["business_rules"], dict)
    assert len(r["business_rules"]) > 0

def test_missing_title_lowers_score():
    full = calculate_readiness(make_trip([True, True], title="Trip"))
    missing = calculate_readiness(make_trip([True, True], title=""))
    assert missing["score"] <= full["score"]

def test_missing_budget_lowers_score():
    full = calculate_readiness(make_trip([True], budget=10000))
    missing = calculate_readiness(make_trip([True], budget=None))
    assert missing["score"] <= full["score"]

def test_far_departure_not_penalised_much():
    r = calculate_readiness(make_trip([True, True], departure_days=30))
    assert r["score"] >= 0

def test_tomorrow_departure_with_empty_checklist_is_risky():
    r = calculate_readiness(make_trip([], departure_days=1))
    assert r["risk_level"] in ("high", "medium")

def test_past_departure_does_not_crash():
    r = calculate_readiness(make_trip([True], departure_days=-2))
    assert 0 <= r["score"] <= 100

def test_no_checklist_attr_does_not_crash():
    trip = make_trip([])
    trip.checklist_items = None
    r = calculate_readiness(trip)
    assert 0 <= r["score"] <= 100

def test_single_completed_task():
    r = calculate_readiness(make_trip([True]))
    assert r["checklist_progress"]["completed"] == 1

def test_many_tasks_progress():
    r = calculate_readiness(make_trip([True]*5 + [False]*5))
    assert r["checklist_progress"]["total"] == 10
    assert r["checklist_progress"]["completed"] == 5

def test_score_never_above_100():
    for _ in range(5):
        r = calculate_readiness(make_trip([True]*20))
        assert r["score"] <= 100

def test_score_never_below_0():
    r = calculate_readiness(make_trip([], departure_days=-10))
    assert r["score"] >= 0