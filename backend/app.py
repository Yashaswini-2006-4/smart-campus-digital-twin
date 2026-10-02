from pathlib import Path
from datetime import datetime
from occupancy_routes import router as occupancy_router

import joblib
import pandas as pd

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from maintenance_routes import router as maintenance_router

from database import (
    initialize_database,
    insert_sensor_reading,
    get_latest_sensor_reading,
    get_previous_sensor_reading,
    get_recent_sensor_readings,
)

from weather_service import router as weather_router


# ============================================================
# APPLICATION
# ============================================================

app = FastAPI(
    title="Smart Campus Digital Twin API",
    description=(
        "AI/ML backend for Smart Campus Digital Twin "
        "with live WeatherAPI integration"
    ),
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:19006",
        "http://127.0.0.1:19006",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register WeatherAPI endpoints:
# GET /environment
# GET /environment/latest
# GET /environment/history

app.include_router(weather_router)
app.include_router(occupancy_router)
app.include_router(maintenance_router)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "models"

OCCUPANCY_MODEL_PATH = MODEL_DIR / "occupancy_model.pkl"
ENERGY_MODEL_PATH = MODEL_DIR / "energy_model.pkl"
ANOMALY_MODEL_PATH = MODEL_DIR / "anomaly_model.pkl"


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

initialize_database()


# ============================================================
# MODEL LOADING
# ============================================================

def load_ml_model(model_path):
    """
    Load an ML model from a pickle/joblib file.

    Supports models saved directly and models wrapped
    inside a dictionary.
    """

    if not model_path.exists():
        raise FileNotFoundError(
            f"Model not found: {model_path}"
        )

    model = joblib.load(model_path)

    if isinstance(model, dict):
        possible_keys = [
            "model",
            "estimator",
            "classifier",
            "regressor",
            "anomaly_model",
        ]

        for key in possible_keys:
            if key in model:
                return model[key]

    return model


occupancy_model = load_ml_model(
    OCCUPANCY_MODEL_PATH
)

energy_model = load_ml_model(
    ENERGY_MODEL_PATH
)

anomaly_model = load_ml_model(
    ANOMALY_MODEL_PATH
)


# ============================================================
# FEATURE PREPARATION
# ============================================================

def prepare_features(model, data):
    """
    Prepare input features in the same order used
    when the model was trained.
    """

    dataframe = pd.DataFrame([data])

    if hasattr(model, "feature_names_in_"):
        expected_features = list(
            model.feature_names_in_
        )

        for feature in expected_features:
            if feature not in dataframe.columns:
                dataframe[feature] = 0

        dataframe = dataframe[expected_features]

    return dataframe


# ============================================================
# CAMPUS CONTEXT
# ============================================================

def get_campus_context():
    """
    Get the latest and previous campus sensor readings.

    Campus sensor readings remain separate from WeatherAPI
    outdoor weather readings.
    """

    latest = get_latest_sensor_reading()

    if latest is None:
        raise HTTPException(
            status_code=404,
            detail="No sensor data available.",
        )

    previous = get_previous_sensor_reading()

    if previous is None:
        previous = latest

    now = datetime.now()

    return {
        "latest": latest,
        "previous": previous,
        "hour": now.hour,
        "day_of_week": now.weekday(),
        "is_weekend": (
            1 if now.weekday() >= 5 else 0
        ),
    }


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

    dataframe = prepare_features(
        occupancy_model,
        features,
    )

    prediction = occupancy_model.predict(
        dataframe
    )[0]

    return max(0, float(prediction))


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

    dataframe = prepare_features(
        energy_model,
        features,
    )

    prediction = energy_model.predict(
        dataframe
    )[0]

    return max(0, float(prediction))


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

    dataframe = prepare_features(
        anomaly_model,
        features,
    )

    prediction = anomaly_model.predict(
        dataframe
    )[0]

    anomaly_detected = int(prediction) == -1

    anomaly_score = None

    if hasattr(anomaly_model, "decision_function"):
        try:
            decision = anomaly_model.decision_function(
                dataframe
            )[0]

            anomaly_score = float(decision)

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
    context = get_campus_context()

    latest = context["latest"]

    occupancy = float(latest["occupancy"])
    energy = float(latest["energy"])

    anomaly_result = predict_current_anomaly()

    # Occupancy score
    if occupancy <= 80:
        occupancy_score = 100
    else:
        occupancy_score = max(
            0,
            100 - ((occupancy - 80) * 2),
        )

    # Energy score
    if energy <= 1400:
        energy_score = 100
    else:
        energy_score = max(
            0,
            100 - ((energy - 1400) / 10),
        )

    # Anomaly score
    if anomaly_result["anomaly_detected"]:
        anomaly_score = 30
    else:
        anomaly_score = 100

    # Weighted decision layer
    final_score = (
        occupancy_score * 0.30
        + energy_score * 0.30
        + anomaly_score * 0.40
    )

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
        "occupancy_score": round(
            occupancy_score, 2
        ),
        "energy_score": round(
            energy_score, 2
        ),
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
        "version": "1.1.0",
        "database": "SQLite",
        "weather_integration": "WeatherAPI",
        "ml_models": {
            "occupancy": "Random Forest",
            "energy": "Random Forest",
            "anomaly": "Isolation Forest",
        },
    }


# ============================================================
# SENSOR DATA
# ============================================================

@app.get("/sensor-data")
def sensor_data():
    latest = get_latest_sensor_reading()

    if latest is None:
        raise HTTPException(
            status_code=404,
            detail="No sensor data available.",
        )

    return latest


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

    latest = get_latest_sensor_reading()

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

    prediction = predict_next_occupancy()

    current = float(latest["occupancy"])
    difference = prediction - current

    if prediction < 40:
        level = "Low"
    elif prediction < 80:
        level = "Normal"
    else:
        level = "High"

    if difference > 10:
        insight = (
            "Campus occupancy is expected "
            "to increase."
        )
    elif difference < -10:
        insight = (
            "Campus occupancy is expected "
            "to decrease."
        )
    else:
        insight = (
            "Campus occupancy is expected "
            "to remain relatively stable."
        )

    return {
        "current_occupancy": round(current, 2),
        "predicted_occupancy": round(
            prediction, 2
        ),
        "difference": round(difference, 2),
        "level": level,
        "insight": insight,
        "model": "Random Forest Regressor",
        "model_status": "ML prediction active",
        "previous_occupancy": round(
            float(context["previous"]["occupancy"]),
            2,
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

    percentage = 0

    if current != 0:
        percentage = (
            difference / current
        ) * 100

    if prediction < 1000:
        level = "Low"
    elif prediction < 1600:
        level = "Normal"
    else:
        level = "High"

    if difference > 150:
        insight = (
            "Energy consumption is expected "
            "to increase."
        )
    elif difference < -150:
        insight = (
            "Energy consumption is expected "
            "to decrease."
        )
    else:
        insight = (
            "Energy consumption is expected "
            "to remain relatively stable."
        )

    return {
        "current_energy": round(current, 2),
        "predicted_energy": round(
            prediction, 2
        ),
        "difference": round(difference, 2),
        "percentage_change": round(
            percentage, 2
        ),
        "level": level,
        "insight": insight,
        "model": "Random Forest Regressor",
        "model_status": "ML prediction active",
        "previous_energy": round(
            float(context["previous"]["energy"]),
            2,
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
            "The Isolation Forest model detected "
            "an unusual campus sensor pattern."
        )
    else:
        status = "Normal"
        risk = "Low"

        analysis = (
            "Current campus sensor values are "
            "within the learned normal pattern."
        )

    return {
        "status": status,
        "risk": risk,
        "anomaly_detected": result[
            "anomaly_detected"
        ],
        "anomaly_score": result["anomaly_score"],
        "sensor_data": {
            "occupancy": latest["occupancy"],
            "energy": latest["energy"],
            "temperature": latest["temperature"],
            "humidity": latest["humidity"],
        },
        "analysis": analysis,
        "model": "Isolation Forest",
        "model_status": (
            "ML anomaly detection active"
        ),
    }


# ============================================================
# HEALTH API
# ============================================================

@app.get("/health")
def campus_health():
    context = get_campus_context()

    latest = context["latest"]

    health = calculate_health_score()
    anomaly = predict_current_anomaly()

    return {
        "score": health["score"],
        "status": health["status"],
        "insight": (
            "Campus health score is calculated "
            "using occupancy, energy and anomaly "
            "detection."
        ),
        "component_scores": {
            "occupancy": health["occupancy_score"],
            "energy": health["energy_score"],
            "anomaly": health["anomaly_score"],
        },
        "inputs": {
            "occupancy": latest["occupancy"],
            "energy": latest["energy"],
            "temperature": latest["temperature"],
            "humidity": latest["humidity"],
            "anomaly_detected": anomaly[
                "anomaly_detected"
            ],
        },
        "decision_layer": (
            "Weighted Rule-Based Decision Layer"
        ),
        "model_status": (
            "ML + Decision Layer active"
        ),
    }


# ============================================================
# AI RECOMMENDATIONS
# ============================================================

@app.get("/recommendations")
def recommendations():
    context = get_campus_context()

    latest = context["latest"]

    current_occupancy = float(
        latest["occupancy"]
    )

    current_energy = float(
        latest["energy"]
    )

    predicted_occupancy = predict_next_occupancy()
    predicted_energy = predict_next_energy()

    anomaly = predict_current_anomaly()
    health = calculate_health_score()

    recommendation_list = []

    # Occupancy recommendation
    if predicted_occupancy > 80:
        recommendation_list.append({
            "category": "Occupancy",
            "priority": "High",
            "title": "High Occupancy Expected",
            "message": (
                "Predicted campus occupancy is high."
            ),
            "action": (
                "Monitor crowded areas and "
                "optimize room allocation."
            ),
        })

    elif predicted_occupancy < 40:
        recommendation_list.append({
            "category": "Occupancy",
            "priority": "Low",
            "title": "Low Occupancy Expected",
            "message": (
                "Predicted occupancy is relatively low."
            ),
            "action": (
                "Consider consolidating lightly "
                "occupied spaces."
            ),
        })

    else:
        recommendation_list.append({
            "category": "Occupancy",
            "priority": "Normal",
            "title": "Occupancy Stable",
            "message": (
                "Predicted occupancy is within "
                "the normal operating range."
            ),
            "action": (
                "Continue normal campus operations."
            ),
        })

    # Energy recommendation
    if predicted_energy > 1600:
        recommendation_list.append({
            "category": "Energy",
            "priority": "High",
            "title": "High Energy Consumption",
            "message": (
                "Predicted energy consumption is high."
            ),
            "action": (
                "Review HVAC, lighting and "
                "high-load equipment."
            ),
        })

    elif predicted_energy < 1000:
        recommendation_list.append({
            "category": "Energy",
            "priority": "Low",
            "title": "Low Energy Consumption",
            "message": (
                "Predicted energy consumption "
                "is relatively low."
            ),
            "action": (
                "Maintain current energy-saving practices."
            ),
        })

    else:
        recommendation_list.append({
            "category": "Energy",
            "priority": "Normal",
            "title": "Energy Consumption Stable",
            "message": (
                "Predicted energy consumption "
                "is within the normal range."
            ),
            "action": (
                "Continue monitoring energy usage."
            ),
        })

    # Anomaly recommendation
    if anomaly["anomaly_detected"]:
        recommendation_list.append({
            "category": "Anomaly",
            "priority": "High",
            "title": "Sensor Anomaly Detected",
            "message": (
                "The anomaly detection model "
                "identified an unusual pattern."
            ),
            "action": (
                "Maintenance team should inspect "
                "the affected campus conditions."
            ),
        })

    else:
        recommendation_list.append({
            "category": "Anomaly",
            "priority": "Low",
            "title": "No Major Anomaly",
            "message": (
                "Current sensor patterns appear normal."
            ),
            "action": (
                "Continue regular monitoring."
            ),
        })

    # Campus health recommendation
    if health["score"] < 60:
        recommendation_list.append({
            "category": "Campus Health",
            "priority": "High",
            "title": "Campus Health Needs Attention",
            "message": (
                "The overall campus health score "
                "is below the normal threshold."
            ),
            "action": (
                "Review occupancy, energy and "
                "anomaly conditions."
            ),
        })

    elif health["score"] < 80:
        recommendation_list.append({
            "category": "Campus Health",
            "priority": "Medium",
            "title": "Campus Health Moderate",
            "message": (
                "Campus conditions are acceptable "
                "but can be improved."
            ),
            "action": (
                "Monitor the major contributing factors."
            ),
        })

    else:
        recommendation_list.append({
            "category": "Campus Health",
            "priority": "Low",
            "title": "Campus Health Good",
            "message": (
                "Overall campus conditions are healthy."
            ),
            "action": (
                "Maintain current operating conditions."
            ),
        })

    summary = (
        f"Current occupancy is "
        f"{round(current_occupancy)} and predicted "
        f"occupancy is {round(predicted_occupancy)}. "
        f"Current energy usage is "
        f"{round(current_energy)} and predicted "
        f"energy is {round(predicted_energy)}. "
        f"Campus health score is "
        f"{round(health['score'])}/100."
    )

    return {
        "summary": summary,
        "recommendations": recommendation_list,
        "ml_inputs": {
            "current_occupancy": round(
                current_occupancy, 2
            ),
            "predicted_occupancy": round(
                predicted_occupancy, 2
            ),
            "current_energy": round(
                current_energy, 2
            ),
            "predicted_energy": round(
                predicted_energy, 2
            ),
            "anomaly_risk": (
                "High"
                if anomaly["anomaly_detected"]
                else "Low"
            ),
            "health_score": health["score"],
        },
        "models": {
            "occupancy": "Random Forest Regressor",
            "energy": "Random Forest Regressor",
            "anomaly": "Isolation Forest",
            "decision_layer": (
                "Weighted Rule-Based Decision Layer"
            ),
        },
        "model_status": (
            "Occupancy + Energy + Anomaly "
            "+ Decision Layer active"
        ),
    }


# ============================================================
# WHAT-IF SIMULATION
# ============================================================

class WhatIfRequest(BaseModel):
    occupancy_change: float = 0
    energy_change: float = 0


@app.post("/what-if")
def what_if_simulation(
    request: WhatIfRequest,
):
    latest = get_latest_sensor_reading()

    if latest is None:
        raise HTTPException(
            status_code=404,
            detail="No sensor data available.",
        )

    current_occupancy = float(
        latest["occupancy"]
    )

    current_energy = float(
        latest["energy"]
    )

    simulated_occupancy = (
        current_occupancy
        * (1 + request.occupancy_change / 100)
    )

    simulated_energy = (
        current_energy
        * (1 + request.energy_change / 100)
    )

    simulated_occupancy = max(
        0,
        simulated_occupancy,
    )

    simulated_energy = max(
        0,
        simulated_energy,
    )

    if simulated_occupancy > 80:
        occupancy_effect = "High occupancy"
    elif simulated_occupancy < 40:
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
            "occupancy": round(
                current_occupancy, 2
            ),
            "energy": round(
                current_energy, 2
            ),
        },
        "simulated": {
            "occupancy": round(
                simulated_occupancy, 2
            ),
            "energy": round(
                simulated_energy, 2
            ),
        },
        "changes": {
            "occupancy_percent": (
                request.occupancy_change
            ),
            "energy_percent": (
                request.energy_change
            ),
        },
        "interpretation": {
            "occupancy": occupancy_effect,
            "energy": energy_effect,
        },
        "model_status": (
            "What-If Decision Simulation active"
        ),
    }