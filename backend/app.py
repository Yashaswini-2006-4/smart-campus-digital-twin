
import os
from pathlib import Path
from datetime import datetime

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from occupancy_routes import router as occupancy_router
from maintenance_routes import router as maintenance_router
from rag_chatbot import router as rag_router
from weather_service import router as weather_router

from database import (
    initialize_database,
    insert_sensor_reading,
    get_latest_sensor_reading,
    get_previous_sensor_reading,
    get_recent_sensor_readings,
    get_connection,
)


# ============================================================
# PATHS AND CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"

OCCUPANCY_MODEL_PATH = MODEL_DIR / "occupancy_model.pkl"
ENERGY_MODEL_PATH = MODEL_DIR / "energy_model.pkl"
ANOMALY_MODEL_PATH = MODEL_DIR / "anomaly_model.pkl"


def get_campus_capacity():
    """Return configured maximum simultaneous student capacity."""
    try:
        capacity = float(
            os.getenv("CAMPUS_STUDENT_CAPACITY", "0")
        )
        return capacity if capacity > 0 else None
    except (TypeError, ValueError):
        return None


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="Smart Campus Digital Twin API",
    description=(
        "AI/ML backend for Smart Campus Digital Twin "
        "with live WeatherAPI integration and "
        "daily class occupancy aggregation."
    ),
    version="1.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:8082",
        "http://127.0.0.1:8082",
        "http://192.168.31.98:8082",
        "http://localhost:19006",
        "http://127.0.0.1:19006",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all existing routers.
app.include_router(weather_router)
app.include_router(occupancy_router)
app.include_router(maintenance_router)
app.include_router(rag_router)


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

initialize_database()


# ============================================================
# ML MODEL LOADING
# ============================================================

def load_ml_model(model_path: Path):
    """Load a model saved directly or wrapped in a dictionary."""
    if not model_path.exists():
        raise FileNotFoundError(
            f"Model not found: {model_path}"
        )

    model = joblib.load(model_path)

    if isinstance(model, dict):
        for key in (
            "model",
            "estimator",
            "classifier",
            "regressor",
            "anomaly_model",
        ):
            if key in model:
                return model[key]

    return model


occupancy_model = load_ml_model(OCCUPANCY_MODEL_PATH)
energy_model = load_ml_model(ENERGY_MODEL_PATH)
anomaly_model = load_ml_model(ANOMALY_MODEL_PATH)


def prepare_features(model, data):
    """Match feature names and order expected by the saved model."""
    dataframe = pd.DataFrame([data])

    if hasattr(model, "feature_names_in_"):
        expected = list(model.feature_names_in_)

        for feature in expected:
            if feature not in dataframe.columns:
                dataframe[feature] = 0

        dataframe = dataframe[expected]

    return dataframe


# ============================================================
# DAILY CLASS OCCUPANCY AGGREGATION
# ============================================================

def get_class_occupancy_snapshots():
    """
    Sum the manual student counts for the most recent reporting
    date that is not in the future.

    The database stores one row per class/section and date.
    Updating a class/date replaces its count rather than adding
    a duplicate, so this SUM gives the total of reported sections.

    Returns:
        (latest_snapshot, previous_snapshot)

    Each snapshot contains:
        record_date
        total_students_present
        class_sections_reported
    """
    today = datetime.now().date().isoformat()
    connection = get_connection()

    def read_snapshot(record_date):
        if not record_date:
            return None

        row = connection.execute(
            """
            SELECT
                record_date,
                COALESCE(SUM(student_count), 0)
                    AS total_students_present,
                COUNT(*) AS class_sections_reported
            FROM class_occupancy
            WHERE record_date = ?
            GROUP BY record_date
            """,
            (record_date,),
        ).fetchone()

        if row is None:
            return None

        return {
            "record_date": row["record_date"],
            "total_students_present": int(
                row["total_students_present"]
            ),
            "class_sections_reported": int(
                row["class_sections_reported"]
            ),
        }

    try:
        latest_date_row = connection.execute(
            """
            SELECT MAX(record_date) AS record_date
            FROM class_occupancy
            WHERE record_date <= ?
            """,
            (today,),
        ).fetchone()

        latest_date = (
            latest_date_row["record_date"]
            if latest_date_row
            else None
        )

        if not latest_date:
            return None, None

        latest_snapshot = read_snapshot(latest_date)

        previous_date_row = connection.execute(
            """
            SELECT MAX(record_date) AS record_date
            FROM class_occupancy
            WHERE record_date < ?
              AND record_date <= ?
            """,
            (latest_date, today),
        ).fetchone()

        previous_date = (
            previous_date_row["record_date"]
            if previous_date_row
            else None
        )

        previous_snapshot = read_snapshot(previous_date)

        return latest_snapshot, previous_snapshot

    finally:
        connection.close()


# ============================================================
# CAMPUS CONTEXT
# ============================================================

def get_campus_context():
    """
    Retrieve the latest sensor reading and override its occupancy
    with the summed manual class count when manual records exist.

    Energy, temperature, humidity and class_schedule remain sourced
    from the sensor table.
    """
    latest_record = get_latest_sensor_reading()

    if latest_record is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "No sensor data available. Record an initial "
                "sensor reading before requesting campus analytics."
            ),
        )

    latest = dict(latest_record)

    previous_record = get_previous_sensor_reading()
    previous = (
        dict(previous_record)
        if previous_record is not None
        else dict(latest)
    )

    latest_snapshot, previous_snapshot = (
        get_class_occupancy_snapshots()
    )

    if latest_snapshot is not None:
        total = latest_snapshot["total_students_present"]

        latest["occupancy"] = float(total)
        latest["occupancy_source"] = "daily_class_occupancy"
        latest["occupancy_record_date"] = (
            latest_snapshot["record_date"]
        )
        latest["class_sections_reported"] = (
            latest_snapshot["class_sections_reported"]
        )

        if previous_snapshot is not None:
            previous["occupancy"] = float(
                previous_snapshot["total_students_present"]
            )
        else:
            # Avoid comparing a raw class total with an older
            # sensor value potentially stored on another scale.
            previous["occupancy"] = float(total)

    else:
        latest["occupancy_source"] = "sensor_reading"
        latest["occupancy_record_date"] = None
        latest["class_sections_reported"] = 0

    now = datetime.now()

    return {
        "latest": latest,
        "previous": previous,
        "occupancy_snapshot": latest_snapshot,
        "previous_occupancy_snapshot": previous_snapshot,
        "hour": now.hour,
        "day_of_week": now.weekday(),
        "is_weekend": 1 if now.weekday() >= 5 else 0,
    }


def get_occupancy_level(student_count):
    """
    Classify occupancy using configured campus capacity.
    Never interpret a raw student count as a percentage.
    """
    capacity = get_campus_capacity()

    if capacity is None:
        return "Capacity not configured"

    percentage = (float(student_count) / capacity) * 100

    if percentage < 40:
        return "Low"
    if percentage < 80:
        return "Normal"
    return "High"


# ============================================================
# OCCUPANCY PREDICTION
# ============================================================

def predict_next_occupancy():
    context = get_campus_context()
    latest = context["latest"]
    previous = context["previous"]

    features = {
        "hour": context["hour"],
        "day_of_week": context["day_of_week"],
        "is_weekend": context["is_weekend"],
        "temperature": latest["temperature"],
        "previous_occupancy": previous["occupancy"],
        "class_schedule": latest["class_schedule"],
    }

    prediction = occupancy_model.predict(
        prepare_features(occupancy_model, features)
    )[0]

    return max(0.0, float(prediction))


# ============================================================
# ENERGY PREDICTION
# ============================================================

def predict_next_energy():
    context = get_campus_context()
    latest = context["latest"]
    previous = context["previous"]

    features = {
        "hour": context["hour"],
        "day_of_week": context["day_of_week"],
        "is_weekend": context["is_weekend"],
        "temperature": latest["temperature"],
        "occupancy": latest["occupancy"],
        "previous_energy": previous["energy"],
        "class_schedule": latest["class_schedule"],
    }

    prediction = energy_model.predict(
        prepare_features(energy_model, features)
    )[0]

    return max(0.0, float(prediction))


# ============================================================
# ANOMALY DETECTION
# ============================================================

def predict_current_anomaly():
    context = get_campus_context()
    latest = context["latest"]

    features = {
        "occupancy": latest["occupancy"],
        "energy": latest["energy"],
        "temperature": latest["temperature"],
        "humidity": latest["humidity"],
    }

    dataframe = prepare_features(anomaly_model, features)
    prediction = anomaly_model.predict(dataframe)[0]
    anomaly_detected = int(prediction) == -1

    anomaly_score = None

    if hasattr(anomaly_model, "decision_function"):
        try:
            anomaly_score = float(
                anomaly_model.decision_function(dataframe)[0]
            )
        except Exception:
            anomaly_score = None

    return {
        "anomaly_detected": anomaly_detected,
        "prediction": int(prediction),
        "anomaly_score": anomaly_score,
    }


# ============================================================
# CAMPUS HEALTH SCORE
# ============================================================

def calculate_health_score():
    """
    Maintain the existing 30/30/40 weighted score when campus
    capacity is configured.

    Without capacity, a raw student count cannot produce a valid
    occupancy percentage. In that case, rescale the energy and
    anomaly components and mark the occupancy score unavailable.
    """
    context = get_campus_context()
    latest = context["latest"]

    occupancy = float(latest["occupancy"])
    energy = float(latest["energy"])

    anomaly_result = predict_current_anomaly()
    capacity = get_campus_capacity()

    occupancy_percentage = None
    occupancy_score = None

    if capacity is not None:
        occupancy_percentage = (occupancy / capacity) * 100

        occupancy_score = max(
            0.0,
            100.0 - max(0.0, occupancy_percentage - 80.0) * 2.0,
        )

    if energy <= 1400:
        energy_score = 100.0
    else:
        energy_score = max(
            0.0,
            100.0 - ((energy - 1400.0) / 10.0),
        )

    anomaly_score = (
        30.0 if anomaly_result["anomaly_detected"] else 100.0
    )

    if occupancy_score is not None:
        final_score = (
            occupancy_score * 0.30
            + energy_score * 0.30
            + anomaly_score * 0.40
        )
    else:
        # The occupancy component is not included until capacity
        # exists; available weights are normalized to total 100%.
        final_score = (
            energy_score * 0.30 + anomaly_score * 0.40
        ) / 0.70

    final_score = round(final_score, 2)

    if final_score >= 80:
        status = "Healthy"
    elif final_score >= 60:
        status = "Moderate"
    else:
        status = "Needs Attention"

    return {
        "score": final_score,
        "status": status,
        "occupancy_score": (
            round(occupancy_score, 2)
            if occupancy_score is not None
            else None
        ),
        "occupancy_percentage": (
            round(occupancy_percentage, 2)
            if occupancy_percentage is not None
            else None
        ),
        "occupancy_capacity_configured": capacity is not None,
        "energy_score": round(energy_score, 2),
        "anomaly_score": anomaly_score,
    }


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "message": "Smart Campus Digital Twin API",
        "status": "running",
        "version": "1.2.0",
        "database": "SQLite",
        "weather_integration": "WeatherAPI",
        "manual_class_occupancy_enabled": True,
        "campus_student_capacity_configured": (
            get_campus_capacity() is not None
        ),
        "ml_models": {
            "occupancy": "Random Forest Regressor",
            "energy": "Random Forest Regressor",
            "anomaly": "Isolation Forest",
        },
    }


# ============================================================
# SENSOR DATA
# ============================================================

@app.get("/sensor-data")
def sensor_data():
    # Return occupancy from the manual total when available.
    return get_campus_context()["latest"]


@app.get("/sensor-data/recent")
def recent_sensor_data():
    readings = get_recent_sensor_readings()
    return {
        "count": len(readings),
        "readings": readings,
    }


# ============================================================
# SENSOR DATA INPUT
# ============================================================

class SensorData(BaseModel):
    occupancy: float
    energy: float
    temperature: float
    humidity: float
    class_schedule: int


@app.post("/sensor-data")
def add_sensor_data(sensor: SensorData):
    reading_id = insert_sensor_reading(
        occupancy=sensor.occupancy,
        energy=sensor.energy,
        temperature=sensor.temperature,
        humidity=sensor.humidity,
        class_schedule=sensor.class_schedule,
    )

    latest = get_campus_context()["latest"]

    return {
        "message": "Sensor data stored successfully.",
        "id": reading_id,
        "reading": latest,
    }


# ============================================================
# OCCUPANCY API
# ============================================================

@app.get("/occupancy")
def occupancy_prediction():
    context = get_campus_context()
    latest = context["latest"]

    current = float(latest["occupancy"])
    prediction = predict_next_occupancy()
    difference = prediction - current

    if difference > 10:
        insight = "Campus occupancy is expected to increase."
    elif difference < -10:
        insight = "Campus occupancy is expected to decrease."
    else:
        insight = "Campus occupancy is expected to remain relatively stable."

    snapshot = context["occupancy_snapshot"]

    return {
        "current_occupancy": round(current, 2),
        "total_students_present": round(current, 2),
        "predicted_occupancy": round(prediction, 2),
        "difference": round(difference, 2),
        "level": get_occupancy_level(prediction),
        "insight": insight,
        "occupancy_source": latest["occupancy_source"],
        "occupancy_record_date": latest["occupancy_record_date"],
        "class_sections_reported": latest["class_sections_reported"],
        "occupancy_capacity_configured": get_campus_capacity() is not None,
        "model": "Random Forest Regressor",
        "model_status": "ML prediction active",
        "previous_occupancy": round(
            float(context["previous"]["occupancy"]), 2
        ),
        "reporting_date_total": (
            snapshot["total_students_present"]
            if snapshot else None
        ),
    }


# ============================================================
# ENERGY API
# ============================================================

@app.get("/energy")
def energy_prediction():
    context = get_campus_context()
    latest = context["latest"]

    prediction = predict_next_energy()
    current = float(latest["energy"])
    difference = prediction - current
    percentage = (difference / current * 100) if current else 0

    if prediction < 1000:
        level = "Low"
    elif prediction < 1600:
        level = "Normal"
    else:
        level = "High"

    if difference > 150:
        insight = "Energy consumption is expected to increase."
    elif difference < -150:
        insight = "Energy consumption is expected to decrease."
    else:
        insight = "Energy consumption is expected to remain relatively stable."

    return {
        "current_energy": round(current, 2),
        "predicted_energy": round(prediction, 2),
        "difference": round(difference, 2),
        "percentage_change": round(percentage, 2),
        "level": level,
        "insight": insight,
        "occupancy_input": round(float(latest["occupancy"]), 2),
        "occupancy_source": latest["occupancy_source"],
        "model": "Random Forest Regressor",
        "model_status": "ML prediction active",
        "previous_energy": round(
            float(context["previous"]["energy"]), 2
        ),
    }


# ============================================================
# ANOMALY API
# ============================================================

@app.get("/anomaly")
def anomaly_detection():
    context = get_campus_context()
    latest = context["latest"]
    result = predict_current_anomaly()

    if result["anomaly_detected"]:
        status = "Anomaly Detected"
        risk = "High"
        analysis = (
            "The Isolation Forest model detected an unusual "
            "campus sensor pattern."
        )
    else:
        status = "Normal"
        risk = "Low"
        analysis = (
            "Current campus sensor values are within the "
            "learned normal pattern."
        )

    return {
        "status": status,
        "risk": risk,
        "anomaly_detected": result["anomaly_detected"],
        "anomaly_score": result["anomaly_score"],
        "sensor_data": {
            "occupancy": latest["occupancy"],
            "occupancy_source": latest["occupancy_source"],
            "energy": latest["energy"],
            "temperature": latest["temperature"],
            "humidity": latest["humidity"],
        },
        "analysis": analysis,
        "model": "Isolation Forest",
        "model_status": "ML anomaly detection active",
    }


# ============================================================
# CAMPUS HEALTH API
# ============================================================

@app.get("/health")
def campus_health():
    context = get_campus_context()
    latest = context["latest"]

    health = calculate_health_score()
    anomaly = predict_current_anomaly()
    snapshot = context["occupancy_snapshot"]

    insight = (
        "Campus health uses occupancy, energy and anomaly "
        "detection. The occupancy component is scored against "
        "capacity only when CAMPUS_STUDENT_CAPACITY is configured."
    )

    return {
        "score": health["score"],
        "status": health["status"],
        "insight": insight,
        "component_scores": {
            "occupancy": health["occupancy_score"],
            "energy": health["energy_score"],
            "anomaly": health["anomaly_score"],
        },
        "inputs": {
            "occupancy": latest["occupancy"],
            "total_students_present": latest["occupancy"],
            "occupancy_source": latest["occupancy_source"],
            "occupancy_record_date": latest["occupancy_record_date"],
            "class_sections_reported": latest["class_sections_reported"],
            "occupancy_percentage": health["occupancy_percentage"],
            "energy": latest["energy"],
            "temperature": latest["temperature"],
            "humidity": latest["humidity"],
            "anomaly_detected": anomaly["anomaly_detected"],
            "occupancy_capacity_configured": (
                health["occupancy_capacity_configured"]
            ),
            "reporting_date_total": (
                snapshot["total_students_present"]
                if snapshot else None
            ),
        },
        "decision_layer": "Weighted Rule-Based Decision Layer",
        "model_status": "ML + Decision Layer active",
    }


# ============================================================
# AI RECOMMENDATIONS
# ============================================================

@app.get("/recommendations")
def recommendations():
    context = get_campus_context()
    latest = context["latest"]

    current_occupancy = float(latest["occupancy"])
    current_energy = float(latest["energy"])

    predicted_occupancy = predict_next_occupancy()
    predicted_energy = predict_next_energy()

    anomaly = predict_current_anomaly()
    health = calculate_health_score()

    recommendation_list = []

    capacity = get_campus_capacity()

    if capacity is None:
        recommendation_list.append({
            "category": "Occupancy",
            "priority": "Medium",
            "title": "Campus capacity required",
            "message": (
                f"The latest reported total is "
                f"{round(current_occupancy)} students. "
                "Configure campus capacity before determining "
                "low, normal or high occupancy."
            ),
            "action": (
                "Set CAMPUS_STUDENT_CAPACITY to the approved "
                "maximum simultaneous student count."
            ),
        })
    elif predicted_occupancy / capacity >= 0.8:
        recommendation_list.append({
            "category": "Occupancy",
            "priority": "High",
            "title": "High Occupancy Expected",
            "message": (
                "Predicted headcount is at least 80% "
                "of configured campus capacity."
            ),
            "action": (
                "Monitor crowded areas and optimize room allocation."
            ),
        })
    elif predicted_occupancy / capacity < 0.4:
        recommendation_list.append({
            "category": "Occupancy",
            "priority": "Low",
            "title": "Low Occupancy Expected",
            "message": (
                "Predicted headcount is below 40% "
                "of configured campus capacity."
            ),
            "action": (
                "Consider consolidating lightly occupied spaces."
            ),
        })
    else:
        recommendation_list.append({
            "category": "Occupancy",
            "priority": "Normal",
            "title": "Occupancy Within Expected Range",
            "message": (
                "Predicted headcount is between 40% and 80% "
                "of configured campus capacity."
            ),
            "action": "Continue normal campus operations.",
        })

    if predicted_energy > 1600:
        recommendation_list.append({
            "category": "Energy",
            "priority": "High",
            "title": "High Energy Consumption",
            "message": "Predicted energy consumption is high.",
            "action": "Review HVAC, lighting and high-load equipment.",
        })
    elif predicted_energy < 1000:
        recommendation_list.append({
            "category": "Energy",
            "priority": "Low",
            "title": "Low Energy Consumption",
            "message": "Predicted energy consumption is relatively low.",
            "action": "Maintain current energy-saving practices.",
        })
    else:
        recommendation_list.append({
            "category": "Energy",
            "priority": "Normal",
            "title": "Energy Consumption Stable",
            "message": "Predicted energy consumption is within the normal range.",
            "action": "Continue monitoring energy usage.",
        })

    if anomaly["anomaly_detected"]:
        recommendation_list.append({
            "category": "Anomaly",
            "priority": "High",
            "title": "Sensor Anomaly Detected",
            "message": "The anomaly detection model identified an unusual pattern.",
            "action": "Maintenance should inspect the affected campus conditions.",
        })
    else:
        recommendation_list.append({
            "category": "Anomaly",
            "priority": "Low",
            "title": "No Major Anomaly",
            "message": "Current sensor patterns appear normal.",
            "action": "Continue regular monitoring.",
        })

    if health["score"] < 60:
        recommendation_list.append({
            "category": "Campus Health",
            "priority": "High",
            "title": "Campus Health Needs Attention",
            "message": "The overall campus health score is below the normal threshold.",
            "action": "Review occupancy, energy and anomaly conditions.",
        })
    elif health["score"] < 80:
        recommendation_list.append({
            "category": "Campus Health",
            "priority": "Medium",
            "title": "Campus Health Moderate",
            "message": "Campus conditions are acceptable but can be improved.",
            "action": "Monitor the major contributing factors.",
        })
    else:
        recommendation_list.append({
            "category": "Campus Health",
            "priority": "Low",
            "title": "Campus Health Good",
            "message": "Overall campus conditions are healthy.",
            "action": "Maintain current operating conditions.",
        })

    summary = (
        f"Current reported headcount is {round(current_occupancy)}; "
        f"predicted occupancy is {round(predicted_occupancy)}. "
        f"Current energy is {round(current_energy)}; "
        f"predicted energy is {round(predicted_energy)}. "
        f"Campus health score is {round(health['score'])}/100."
    )

    return {
        "summary": summary,
        "recommendations": recommendation_list,
        "ml_inputs": {
            "current_occupancy": round(current_occupancy, 2),
            "predicted_occupancy": round(predicted_occupancy, 2),
            "current_energy": round(current_energy, 2),
            "predicted_energy": round(predicted_energy, 2),
            "anomaly_risk": (
                "High" if anomaly["anomaly_detected"] else "Low"
            ),
            "health_score": health["score"],
            "occupancy_source": latest["occupancy_source"],
            "occupancy_capacity_configured": capacity is not None,
        },
        "models": {
            "occupancy": "Random Forest Regressor",
            "energy": "Random Forest Regressor",
            "anomaly": "Isolation Forest",
            "decision_layer": "Weighted Rule-Based Decision Layer",
        },
        "model_status": (
            "Occupancy + Energy + Anomaly + Decision Layer active"
        ),
    }


# ============================================================
# WHAT-IF SIMULATION
# ============================================================

class WhatIfRequest(BaseModel):
    occupancy_change: float = 0
    energy_change: float = 0


@app.post("/what-if")
def what_if_simulation(request: WhatIfRequest):
    context = get_campus_context()
    latest = context["latest"]

    current_occupancy = float(latest["occupancy"])
    current_energy = float(latest["energy"])

    simulated_occupancy = max(
        0.0,
        current_occupancy * (1 + request.occupancy_change / 100),
    )
    simulated_energy = max(
        0.0,
        current_energy * (1 + request.energy_change / 100),
    )

    capacity = get_campus_capacity()

    if capacity is None:
        occupancy_effect = "Configure campus capacity to classify occupancy"
    elif simulated_occupancy / capacity >= 0.8:
        occupancy_effect = "High occupancy"
    elif simulated_occupancy / capacity < 0.4:
        occupancy_effect = "Low occupancy"
    else:
        occupancy_effect = "Normal occupancy"

    if simulated_energy > 1600:
        energy_effect = "High energy consumption"
    elif simulated_energy < 1000:
        energy_effect = "Low energy consumption"
    else:
        energy_effect = "Normal energy consumption"

    return {
        "current": {
            "occupancy": round(current_occupancy, 2),
            "energy": round(current_energy, 2),
        },
        "simulated": {
            "occupancy": round(simulated_occupancy, 2),
            "energy": round(simulated_energy, 2),
        },
        "changes": {
            "occupancy_percent": request.occupancy_change,
            "energy_percent": request.energy_change,
        },
        "interpretation": {
            "occupancy": occupancy_effect,
            "energy": energy_effect,
        },
        "occupancy_source": latest["occupancy_source"],
        "model_status": "What-If Decision Simulation active",
    }
