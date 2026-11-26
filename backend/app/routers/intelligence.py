from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.dependencies import get_current_user
from app.models.user import User
from app.services.external_api import get_json
router = APIRouter(tags=["Travel Intelligence"])
async def _safe_get(url, params):
    try:
        return await get_json(url, params)
    except Exception:
        raise HTTPException(status_code=502, detail="External travel service is currently unavailable. Please try again.")
# Dono route chalenge - /weather bhi, /intelligence/weather bhi
@router.get("/destinations/search")
@router.get("/intelligence/destinations/search")
async def search_destinations(q: str = Query(min_length=2), user: User = Depends(get_current_user)):
    data = await _safe_get("https://geocoding-api.open-meteo.com/v1/search", {"name": q, "count": 10, "language": "en", "format": "json"})
    return {"results": data.get("results", [])}
@router.get("/weather")
@router.get("/intelligence/weather")
async def weather(latitude: float, longitude: float, user: User = Depends(get_current_user)):
    data = await _safe_get("https://api.open-meteo.com/v1/forecast", {
        "latitude": latitude, "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
        "forecast_days": 7, "timezone": "auto"
    })
    return data
@router.get("/currency")
@router.get("/intelligence/currency")
async def currency(base: str = "USD", symbols: str = "EUR,GBP,INR", user: User = Depends(get_current_user)):
    return await _safe_get("https://api.frankfurter.app/latest", {"from": base.upper(), "to": symbols.upper()})
@router.get("/countries/{name}")
@router.get("/intelligence/countries/{name}")
async def country_info(name: str, user: User = Depends(get_current_user)):
    return await _safe_get(f"https://restcountries.com/v3.1/name/{name}", {"fields": "name,cca2,currencies,timezones,capital,region"})