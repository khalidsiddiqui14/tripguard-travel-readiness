import httpx
from fastapi import HTTPException
from app.core.config import settings
async def get_json(url: str, params: dict | None = None):
    try:
        async with httpx.AsyncClient(timeout=settings.api_timeout_seconds) as client:
            response = await client.get(url, params=params)
            if response.status_code == 429:
                raise HTTPException(status_code=503, detail="External service rate limit reached. Please retry later.")
            response.raise_for_status()
            return response.json()
    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="External service timed out. Please retry.")
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="External service is temporarily unavailable.")
# --------------------------------------------------
# 1. Weather - Open-Meteo (Free, No Key)
# --------------------------------------------------
async def get_weather(lat: float, lon: float):
    # API fail ho to crash nahi hoga, None return hoga
    # Taaki readiness me weather ko 30 hi mile, 0 nahi
    try:
        data = await get_json("https://api.open-meteo.com/v1/forecast", params={"latitude": lat, "longitude": lon, "current": "temperature_2m,precipitation,weather_code,wind_speed_10m", "timezone": "auto"})
        current = data.get("current") or {}
        code = int(current.get("weather_code") or 0)
        if code in [95, 96, 99]:
            condition = "storm"
            risk = "severe"
        elif code in [51, 53, 55, 61, 63, 65, 80, 81, 82]:
            condition = "heavy rain"
            risk = "moderate"
        elif code in [71, 73, 75, 77, 85, 86]:
            condition = "snow"
            risk = "moderate"
        else:
            condition = "clear"
            risk = "normal"
        return {"temperature": current.get("temperature_2m"), "precipitation": current.get("precipitation"), "wind_speed": current.get("wind_speed_10m"), "condition": condition, "weather_risk": risk, "available": True}
    except Exception:
        return {"temperature": None, "condition": "unavailable", "weather_risk": None, "available": False}
# --------------------------------------------------
# 2. Currency - Frankfurter (Free, No Key)
# --------------------------------------------------
async def get_currency_rate(from_currency: str = "USD", to_currency: str = "INR"):
    try:
        data = await get_json(f"https://api.frankfurter.dev/v1/latest", params={"base": from_currency.upper(), "symbols": to_currency.upper()})
        rates = data.get("rates") or {}
        return {"from": from_currency.upper(), "to": to_currency.upper(), "rate": rates.get(to_currency.upper()), "date": data.get("date"), "available": True}
    except Exception:
        return {"from": from_currency.upper(), "to": to_currency.upper(), "rate": None, "available": False}
# --------------------------------------------------
# 3. City Search + Country Info - Nominatim + REST Countries (Free, No Key)
# --------------------------------------------------
async def search_city(query: str):
    try:
        if not query or not query.strip():
            return []
        data = await get_json("https://nominatim.openstreetmap.org/search", params={"q": query.strip(), "format": "json", "limit": 5, "addressdetails": 1})
        result = []
        for item in data or []:
            address = item.get("address") or {}
            result.append({"name": address.get("city") or address.get("town") or address.get("village") or item.get("display_name", "").split(",")[0], "display_name": item.get("display_name"), "country": address.get("country"), "country_code": (address.get("country_code") or "").upper(), "lat": float(item.get("lat")) if item.get("lat") else None, "lon": float(item.get("lon")) if item.get("lon") else None})
        return result
    except Exception:
        return []
async def get_country_info(country_code: str):
    try:
        if not country_code:
            return {"available": False}
        data = await get_json(f"https://restcountries.com/v3.1/alpha/{country_code.lower()}")
        info = (data or [{}])[0]
        return {"name": (info.get("name") or {}).get("common"), "capital": (info.get("capital") or [None])[0], "currency": list((info.get("currencies") or {}).keys()), "timezone": (info.get("timezones") or [None])[0], "available": True}
    except Exception:
        return {"available": False}