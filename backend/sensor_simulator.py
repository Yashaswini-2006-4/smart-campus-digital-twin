import asyncio
import logging
import os
import random
from datetime import datetime

from fastapi import APIRouter

from database import (
    get_class_occupancy_history,
    get_latest_environment_reading,
    get_latest_sensor_reading,
    initialize_database,
    insert_sensor_reading,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/sensor-simulator",
    tags=["Software Sensor Simulator"],
)


def _enabled():
    return os.getenv("ENABLE_SENSOR_SIMULATOR", "false").strip().lower() in {
        "1", "true", "yes", "on"
    }


def _interval_seconds():
    try:
        return max(60, int(os.getenv("SENSOR_SIMULATOR_INTERVAL_SECONDS", "300")))
    except ValueError:
        return 300


def _clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def generate_simulated_reading():
    """Generate and save one clearly designated software sensor reading."""
    now = datetime.now().astimezone()
    class_schedule = int(now.weekday() < 5 and 8 <= now.hour < 18)

    # Prefer the real outdoor reading as a reference for simulated indoor
    # temperature and humidity. Fall back to sensible demo reference values.
    environment = get_latest_environment_reading() or {}

    try:
        outdoor_temp = float(environment.get("temperature_c", 25.0))
    except (TypeError, ValueError):
        outdoor_temp = 25.0

    try:
        outdoor_humidity = float(environment.get("humidity", 55.0))
    except (TypeError, ValueError):
        outdoor_humidity = 55.0

    target_temp = _clamp(outdoor_temp - 0.8, 20.0, 32.0)
    target_humidity = _clamp(outdoor_humidity, 25.0, 85.0)

    latest = get_latest_sensor_reading() or {}

    try:
        previous_temp = float(latest.get("temperature", 0) or 0)
    except (TypeError, ValueError):
        previous_temp = 0.0

    if 15 <= previous_temp <= 40:
        temperature = previous_temp + (
            (target_temp - previous_temp) * 0.2
        ) + random.uniform(-0.25, 0.25)
    else:
        temperature = target_temp + random.uniform(-0.4, 0.4)

    temperature = round(_clamp(temperature, 18.0, 35.0), 1)

    try:
        previous_humidity = float(latest.get("humidity", 0) or 0)
    except (TypeError, ValueError):
        previous_humidity = 0.0

    if 10 <= previous_humidity <= 100:
        humidity = previous_humidity + (
            (target_humidity - previous_humidity) * 0.25
        ) + random.uniform(-1.5, 1.5)
    else:
        humidity = target_humidity + random.uniform(-3, 3)

    humidity = round(_clamp(humidity, 15.0, 95.0), 1)

    # Illustrative software energy model. Values are not actual meter readings.
    target_energy = (
        random.uniform(350, 650)
        if class_schedule
        else random.uniform(50, 160)
    )

    try:
        previous_energy = float(latest.get("energy", 0) or 0)
    except (TypeError, ValueError):
        previous_energy = 0.0

    if 0 < previous_energy <= 1000:
        energy = (
            previous_energy * 0.7
            + target_energy * 0.3
            + random.uniform(-12, 12)
        )
    else:
        energy = target_energy

    energy = round(_clamp(energy, 0, 1000), 1)

    # Use today's manually entered class occupancy when available.
    today = now.date().isoformat()
    class_rows = get_class_occupancy_history(record_date=today, limit=500)

    if class_rows:
        occupancy = sum(
            max(0, int(row.get("student_count", 0) or 0))
            for row in class_rows
        )
        occupancy_source = "manual_class_occupancy"
    elif class_schedule:
        occupancy = random.randint(40, 150)
        occupancy_source = "simulated_occupancy"
    else:
        occupancy = random.randint(5, 30)
        occupancy_source = "simulated_occupancy"

    record_id = insert_sensor_reading(
        occupancy=occupancy,
        energy=energy,
        temperature=temperature,
        humidity=humidity,
        class_schedule=class_schedule,
    )

    logger.info(
        "Software sensor simulation saved reading id=%s "
        "source=software_simulator occupancy_source=%s",
        record_id,
        occupancy_source,
    )

    return {
        "id": record_id,
        "timestamp": now.isoformat(),
        "occupancy": occupancy,
        "energy": energy,
        "temperature": temperature,
        "humidity": humidity,
        "class_schedule": class_schedule,
        "data_source": "software_simulator",
        "occupancy_source": occupancy_source,
    }


_background_task = None


async def _simulation_loop():
    while True:
        try:
            await asyncio.to_thread(generate_simulated_reading)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("Software sensor simulator failed")

        await asyncio.sleep(_interval_seconds())


@router.on_event("startup")
async def start_simulator():
    global _background_task

    if not _enabled():
        logger.info("Software sensor simulator is disabled")
        return

    initialize_database()

    # Generate the first reading immediately when the service starts.
    try:
        await asyncio.to_thread(generate_simulated_reading)
    except Exception:
        logger.exception("Initial software sensor reading failed")

    _background_task = asyncio.create_task(_simulation_loop())
    logger.info(
        "Software sensor simulator started; interval=%s seconds",
        _interval_seconds(),
    )


@router.on_event("shutdown")
async def stop_simulator():
    global _background_task

    if _background_task is not None:
        _background_task.cancel()
        try:
            await _background_task
        except asyncio.CancelledError:
            pass
        _background_task = None


@router.get("/status")
def simulator_status():
    return {
        "enabled": _enabled(),
        "mode": "simulated",
        "interval_seconds": _interval_seconds(),
        "latest_reading": get_latest_sensor_reading(),
    }