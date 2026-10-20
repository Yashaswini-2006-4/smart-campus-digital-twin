"""
Train the software-only campus energy prediction model.

The generated training data follows the scale used by
backend/sensor_simulator.py:
- Class hours: target energy between 350 and 650
- Non-class hours: target energy between 50 and 160
- Each reading blends 70% previous energy with 30% target energy
- Small random noise simulates natural variation

All generated training records are simulated, not real meter readings.
"""

from datetime import datetime, timedelta
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.model_selection import train_test_split


# ============================================================
# Configuration
# ============================================================

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "models"

DATA_FILE = DATA_DIR / "energy_data.csv"
MODEL_FILE = MODEL_DIR / "energy_model.pkl"

RANDOM_SEED = 42
SIMULATED_DAYS = 35
SAMPLES_PER_HOUR = 12  # One sample every five minutes.

DATA_DIR.mkdir(parents=True, exist_ok=True)
MODEL_DIR.mkdir(parents=True, exist_ok=True)

rng = np.random.default_rng(RANDOM_SEED)


# Keep these feature names compatible with backend/app.py.
FEATURES = [
    "day_of_week",
    "hour",
    "temperature",
    "is_weekend",
    "class_schedule",
    "occupancy",
    "previous_energy",
]

TARGET = "energy"


# ============================================================
# Generate synthetic data matching the software simulator
# ============================================================

rows = []

# Start on a Monday so the generated weekday schedule is predictable.
start_time = datetime(2026, 1, 5, 0, 0)

previous_energy = 120.0
indoor_temperature = 24.0

total_samples = (
    SIMULATED_DAYS * 24 * SAMPLES_PER_HOUR
)

for step in range(total_samples):
    timestamp = start_time + timedelta(
        minutes=5 * step
    )

    day_of_week = timestamp.weekday()
    hour = timestamp.hour

    is_weekend = int(day_of_week >= 5)

    # Match the schedule condition in sensor_simulator.py.
    class_schedule = int(
        not is_weekend and 8 <= hour < 18
    )

    # --------------------------------------------------------
    # Simulated indoor temperature
    # --------------------------------------------------------

    # A smooth daily temperature curve with modest variation.
    daily_temperature = (
        25.0
        + 4.0 * np.sin(
            (hour - 14) * 2.0 * np.pi / 24.0
        )
        + rng.normal(0, 0.5)
    )

    # The simulator approaches outdoor temperature gradually.
    target_indoor_temperature = np.clip(
        daily_temperature - 0.8,
        18.0,
        34.0,
    )

    indoor_temperature += (
        0.2
        * (
            target_indoor_temperature
            - indoor_temperature
        )
        + rng.uniform(-0.25, 0.25)
    )

    temperature = round(
        float(
            np.clip(
                indoor_temperature,
                18.0,
                35.0,
            )
        ),
        1,
    )

    # --------------------------------------------------------
    # Simulated occupancy
    # --------------------------------------------------------

    if class_schedule:
        # Similar to the software simulator's daytime range.
        occupancy = int(rng.integers(40, 151))
    else:
        occupancy = int(rng.integers(5, 31))

    # --------------------------------------------------------
    # Simulated energy consumption
    # --------------------------------------------------------

    # These ranges match the existing software simulator.
    if class_schedule:
        target_energy = float(
            rng.uniform(350.0, 650.0)
        )
    else:
        target_energy = float(
            rng.uniform(50.0, 160.0)
        )

    # Match the recurrence used by sensor_simulator.py.
    energy = (
        previous_energy * 0.7
        + target_energy * 0.3
        + rng.uniform(-12.0, 12.0)
    )

    energy = round(
        float(np.clip(energy, 0.0, 1000.0)),
        1,
    )

    rows.append(
        {
            "timestamp": timestamp.isoformat(),
            "day_of_week": day_of_week,
            "hour": hour,
            "temperature": temperature,
            "is_weekend": is_weekend,
            "class_schedule": class_schedule,
            "occupancy": occupancy,
            "previous_energy": round(
                previous_energy,
                1,
            ),
            "energy": energy,
        }
    )

    # The next training sample uses the previous reading.
    previous_energy = energy


df = pd.DataFrame(rows)

df.to_csv(
    DATA_FILE,
    index=False,
    encoding="utf-8",
)

print("\nSynthetic energy dataset created.")
print(f"Dataset: {DATA_FILE}")
print(f"Records: {len(df)}")
print(
    "Energy range: "
    f"{df['energy'].min():.1f}–"
    f"{df['energy'].max():.1f}"
)


# ============================================================
# Train and evaluate the model
# ============================================================

X = df[FEATURES]
y = df[TARGET]

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=RANDOM_SEED,
)

print(f"\nTraining records: {len(X_train)}")
print(f"Testing records: {len(X_test)}")

model = RandomForestRegressor(
    n_estimators=200,
    max_depth=14,
    min_samples_leaf=3,
    random_state=RANDOM_SEED,
    n_jobs=-1,
)

model.fit(X_train, y_train)

predictions = model.predict(X_test)

mae = mean_absolute_error(
    y_test,
    predictions,
)

rmse = float(
    np.sqrt(
        mean_squared_error(
            y_test,
            predictions,
        )
    )
)

r2 = r2_score(
    y_test,
    predictions,
)

print("\n------------------------------")
print("MODEL EVALUATION")
print("------------------------------")
print(f"MAE  : {mae:.2f}")
print(f"RMSE : {rmse:.2f}")
print(f"R²   : {r2:.4f}")

importance = pd.DataFrame(
    {
        "feature": FEATURES,
        "importance": model.feature_importances_,
    }
).sort_values(
    by="importance",
    ascending=False,
)

print("\nFeature importance:")
print(importance.to_string(index=False))


# ============================================================
# Save the bundle expected by backend/app.py
# ============================================================

joblib.dump(
    {
        "model": model,
        "features": FEATURES,
    },
    MODEL_FILE,
)

print("\nEnergy model saved successfully.")
print(f"Model: {MODEL_FILE}")
print("The model is trained on simulated energy data.")