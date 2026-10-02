import os
import time
from pathlib import Path

import requests
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query

from database import (
    initialize_database,
    insert_environment_reading,
    get_latest_environment_reading,
    get_recent_environment_readings,
)


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

# Load variables from backend/.env
load_dotenv(BASE_DIR / ".env")

WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "").strip()
WEATHER_LOCATION = os.getenv(
    "WEATHER_LOCATION",
    "Hassan"
).strip()

WEATHER_API_URL = (
    "https://api.weatherapi.com/v1/current.json"
)

# Cache successful responses for 5 minutes
CACHE_TTL_SECONDS = 300

router = APIRouter(tags=["Live Environment"])

_cached_weather = None
_cache_timestamp = 0.0


# Ensure the database tables exist
initialize_database()


# ============================================================
# FETCH WEATHER FROM WEATHERAPI
# ============================================================

def fetch_weather_from_api():
    if not WEATHER_API_KEY:
        raise HTTPException(
            status_code=503,
            detail=(
                "WeatherAPI is not configured. "
                "Set WEATHER_API_KEY in backend/.env."
            ),
        )

    if not WEATHER_LOCATION:
        raise HTTPException(
            status_code=503,
            detail=(
                "Weather location is missing. "
                "Set WEATHER_LOCATION in backend/.env."
            ),
        )

    try:
        response = requests.get(
            WEATHER_API_URL,
            params={
                "key": WEATHER_API_KEY,
                "q": WEATHER_LOCATION,
                "aqi": "no",
            },
            timeout=15,
        )

    except requests.Timeout:
        raise HTTPException(
            status_code=504,
            detail="WeatherAPI request timed out. Try again later.",
        )

    except requests.RequestException:
        raise HTTPException(
            status_code=502,
            detail="Could not connect to WeatherAPI.",
        )

    try:
        data = response.json()
    except ValueError:
        data = {}

    # WeatherAPI can return an error object with its response
    if response.status_code != 200:
        error_data = data.get("error", {})
        error_code = error_data.get("code")

        if error_code == 1006:
            raise HTTPException(
                status_code=502,
                detail=(
                    "WeatherAPI could not find the configured "
                    "location. Check WEATHER_LOCATION."
                ),
            )

        if error_code in (2006, 2007, 2008):
            raise HTTPException(
                status_code=502,
                detail=(
                    "WeatherAPI rejected the API key or "
                    "the account has a usage restriction. "
                    "Check your WeatherAPI account."
                ),
            )

        raise HTTPException(
            status_code=502,
            detail=(
                "WeatherAPI returned an error. "
                "Check the API key, location, and account."
            ),
        )

    try:
        location_data = data["location"]
        current_data = data["current"]

        condition_data = current_data["condition"]

        weather = {
            "location": location_data["name"],
            "region": location_data.get("region"),
            "country": location_data.get("country"),
            "local_time": location_data.get("localtime"),
            "temperature_c": float(current_data["temp_c"]),
            "humidity": float(current_data["humidity"]),
            "condition": condition_data["text"],
            "feels_like_c": float(
                current_data["feelslike_c"]
            ),
            "wind_kph": float(current_data["wind_kph"]),
            "last_updated": current_data.get("last_updated"),
            "source": "WeatherAPI",
            "data_type": "Live outdoor weather",
        }

    except (KeyError, TypeError, ValueError):
        raise HTTPException(
            status_code=502,
            detail="WeatherAPI returned an unexpected response.",
        )

    # Save the successful reading to SQLite
    insert_environment_reading(
        location=weather["location"],
        region=weather["region"],
        country=weather["country"],
        temperature_c=weather["temperature_c"],
        humidity=weather["humidity"],
        condition=weather["condition"],
        feels_like_c=weather["feels_like_c"],
        wind_kph=weather["wind_kph"],
        last_updated=weather["last_updated"],
        source=weather["source"],
    )

    return weather


# ============================================================
# GET CURRENT ENVIRONMENT
# ============================================================

@router.get("/environment")
def get_environment(
    refresh: bool = Query(
        False,
        description=(
            "Set to true to bypass the 5-minute cache."
        ),
    )
):
    global _cached_weather
    global _cache_timestamp

    current_time = time.monotonic()

    # Return cached data to reduce API calls
    if (
        not refresh
        and _cached_weather is not None
        and current_time - _cache_timestamp
        < CACHE_TTL_SECONDS
    ):
        return _cached_weather

    weather = fetch_weather_from_api()

    _cached_weather = weather
    _cache_timestamp = time.monotonic()

    return weather


# ============================================================
# GET SAVED WEATHER HISTORY
# ============================================================

@router.get("/environment/history")
def environment_history(
    limit: int = Query(20, ge=1, le=100)
):
    readings = get_recent_environment_readings(limit)

    return {
        "count": len(readings),
        "readings": readings,
    }


# ============================================================
# GET LATEST SAVED WEATHER READING
# ============================================================

@router.get("/environment/latest")
def latest_environment():
    reading = get_latest_environment_reading()

    if reading is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "No environment readings have been saved yet. "
                "Call GET /environment first."
            ),
        )

    return reading