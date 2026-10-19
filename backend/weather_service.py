
import math
import os
import time
from pathlib import Path
from typing import Any, Optional

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
load_dotenv(BASE_DIR / ".env")

WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "").strip()
WEATHER_LOCATION = os.getenv("WEATHER_LOCATION", "Hassan").strip()

WEATHER_API_URL = (
    "https://api.weatherapi.com/v1/current.json"
)

CACHE_TTL_SECONDS = 300
REQUEST_TIMEOUT_SECONDS = 15

router = APIRouter(tags=["Live Environment"])

_cached_weather: Optional[dict[str, Any]] = None
_cache_timestamp = 0.0

# Preserve the existing SQLite initialization.
initialize_database()


# ============================================================
# AIR QUALITY INDEX HELPERS
# ============================================================

US_EPA_CATEGORIES = {
    1: "Good",
    2: "Moderate",
    3: "Unhealthy for Sensitive Groups",
    4: "Unhealthy",
    5: "Very Unhealthy",
    6: "Hazardous",
}


def optional_float(value: Any) -> Optional[float]:
    """Convert a value to a finite number, or return None."""
    if value is None:
        return None

    try:
        number = float(value)
        return number if math.isfinite(number) else None
    except (TypeError, ValueError):
        return None


def optional_int(value: Any) -> Optional[int]:
    number = optional_float(value)

    if number is None:
        return None

    return int(number)


def get_defra_band(index: Optional[int]) -> Optional[str]:
    """Return the UK DEFRA band for a valid 1-10 index."""
    if index is None or not 1 <= index <= 10:
        return None

    if index <= 3:
        return "Low"
    if index <= 6:
        return "Moderate"
    if index <= 9:
        return "High"

    return "Very High"


def normalize_air_quality(
    raw: Any,
    last_updated: Optional[str] = None,
) -> dict[str, Any]:
    """
    Normalize WeatherAPI air-quality values.

    Important: WeatherAPI's indices are US EPA and UK DEFRA
    indices. They are not India's CPCB National AQI.
    """
    if not isinstance(raw, dict) or not raw:
        return {
            "available": False,
            "message": (
                "Air-quality data was not returned by WeatherAPI. "
                "Check the account's AQI access and subscription."
            ),
        }

    us_epa_index = optional_int(raw.get("us-epa-index"))
    gb_defra_index = optional_int(raw.get("gb-defra-index"))

    pollutants = {
        "co": optional_float(raw.get("co")),
        "o3": optional_float(raw.get("o3")),
        "no2": optional_float(raw.get("no2")),
        "so2": optional_float(raw.get("so2")),
        "pm2_5": optional_float(raw.get("pm2_5")),
        "pm10": optional_float(raw.get("pm10")),
    }

    has_data = (
        us_epa_index is not None
        or gb_defra_index is not None
        or any(value is not None for value in pollutants.values())
    )

    if not has_data:
        return {
            "available": False,
            "message": (
                "WeatherAPI returned no usable AQI or pollutant values. "
                "No air-quality index has been estimated."
            ),
        }

    air_quality: dict[str, Any] = {
        "available": True,
        "source": "WeatherAPI",
        "last_updated": last_updated,
        "pollutant_units": "µg/m³ as reported by WeatherAPI",
        "index_note": (
            "The US EPA and UK DEFRA indices are different from "
            "India's CPCB National AQI."
        ),
    }

    if us_epa_index is not None:
        air_quality["us_epa_index"] = us_epa_index
        air_quality["us_epa_category"] = US_EPA_CATEGORIES.get(
            us_epa_index,
            "Unknown",
        )

    if gb_defra_index is not None:
        air_quality["gb_defra_index"] = gb_defra_index
        air_quality["gb_defra_band"] = get_defra_band(
            gb_defra_index
        )

    # Include only pollutant values actually returned by the provider.
    for name, value in pollutants.items():
        if value is not None:
            air_quality[name] = value

    return air_quality


# ============================================================
# FETCH WEATHER AND AIR QUALITY FROM WEATHERAPI
# ============================================================

def fetch_weather_from_api() -> dict[str, Any]:
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
                # Request AQI and pollutant fields as well as weather.
                "aqi": "yes",
            },
            timeout=REQUEST_TIMEOUT_SECONDS,
        )

    except requests.Timeout as error:
        raise HTTPException(
            status_code=504,
            detail="WeatherAPI request timed out. Try again later.",
        ) from error

    except requests.RequestException as error:
        raise HTTPException(
            status_code=502,
            detail="Could not connect to WeatherAPI.",
        ) from error

    try:
        data = response.json()
    except ValueError:
        data = {}

    if response.status_code != 200:
        error_data = (
            data.get("error", {})
            if isinstance(data, dict)
            else {}
        )
        error_code = (
            error_data.get("code")
            if isinstance(error_data, dict)
            else None
        )

        if error_code == 1006:
            detail = (
                "WeatherAPI could not find the configured location. "
                "Check WEATHER_LOCATION."
            )
        elif error_code in (2006, 2007, 2008):
            detail = (
                "WeatherAPI rejected the API key or the account has "
                "a usage restriction. Check the account and AQI access."
            )
        else:
            detail = (
                "WeatherAPI returned an error. Check the API key, "
                "location, account, and air-quality access."
            )

        raise HTTPException(status_code=502, detail=detail)

    try:
        location_data = data["location"]
        current_data = data["current"]
        condition_data = current_data["condition"]

        last_updated = current_data.get("last_updated")

        air_quality = normalize_air_quality(
            current_data.get("air_quality"),
            last_updated=last_updated,
        )

        weather = {
            "location": location_data["name"],
            "region": location_data.get("region"),
            "country": location_data.get("country"),
            "local_time": location_data.get("localtime"),
            "temperature_c": float(current_data["temp_c"]),
            "humidity": float(current_data["humidity"]),
            "condition": condition_data["text"],
            "feels_like_c": float(current_data["feelslike_c"]),
            "wind_kph": float(current_data["wind_kph"]),
            "last_updated": last_updated,
            "source": "WeatherAPI",
            "data_type": "Live outdoor weather",
            # New field; existing weather response fields are preserved.
            "air_quality": air_quality,
        }

    except (KeyError, TypeError, ValueError) as error:
        raise HTTPException(
            status_code=502,
            detail="WeatherAPI returned an unexpected response.",
        ) from error

    # Preserve the existing weather-history storage call.
    # See the note below about AQI history persistence.
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
# GET CURRENT ENVIRONMENT: WEATHER + AQI
# ============================================================

@router.get("/environment")
def get_environment(
    refresh: bool = Query(
        False,
        description="Set to true to bypass the 5-minute cache.",
    ),
):
    global _cached_weather, _cache_timestamp

    current_time = time.monotonic()

    if (
        not refresh
        and _cached_weather is not None
        and current_time - _cache_timestamp < CACHE_TTL_SECONDS
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
    limit: int = Query(20, ge=1, le=100),
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
