import os

import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import IsolationForest


# =========================================================
# Configuration
# =========================================================

DATA_DIR = "data"
MODEL_DIR = "models"

DATA_FILE = os.path.join(
    DATA_DIR,
    "anomaly_data.csv"
)

MODEL_FILE = os.path.join(
    MODEL_DIR,
    "anomaly_model.pkl"
)


# =========================================================
# Create folders
# =========================================================

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)


# =========================================================
# Generate development sensor dataset
# =========================================================

np.random.seed(42)

rows = []

for i in range(1000):

    # -----------------------------------------------------
    # Normal campus values
    # -----------------------------------------------------

    occupancy = np.random.normal(
        60,
        12
    )

    energy = (
        1000
        + occupancy * 5
        + np.random.normal(0, 80)
    )

    temperature = np.random.normal(
        27,
        2
    )

    humidity = np.random.normal(
        55,
        8
    )

    # Keep values in realistic ranges
    occupancy = np.clip(
        occupancy,
        0,
        100
    )

    energy = max(
        100,
        energy
    )

    temperature = np.clip(
        temperature,
        15,
        40
    )

    humidity = np.clip(
        humidity,
        20,
        90
    )

    rows.append({
        "occupancy": round(
            occupancy,
            2
        ),
        "energy": round(
            energy,
            2
        ),
        "temperature": round(
            temperature,
            2
        ),
        "humidity": round(
            humidity,
            2
        ),
    })


# =========================================================
# Add abnormal observations
# =========================================================

for i in range(50):

    # Extremely unusual occupancy
    occupancy = np.random.choice([
        np.random.uniform(0, 5),
        np.random.uniform(95, 100),
    ])

    # Unusual energy consumption
    energy = np.random.choice([
        np.random.uniform(200, 400),
        np.random.uniform(1800, 2500),
    ])

    # Unusual temperature
    temperature = np.random.choice([
        np.random.uniform(10, 15),
        np.random.uniform(38, 45),
    ])

    # Unusual humidity
    humidity = np.random.choice([
        np.random.uniform(5, 20),
        np.random.uniform(90, 100),
    ])

    rows.append({
        "occupancy": round(
            occupancy,
            2
        ),
        "energy": round(
            energy,
            2
        ),
        "temperature": round(
            temperature,
            2
        ),
        "humidity": round(
            humidity,
            2
        ),
    })


df = pd.DataFrame(rows)


# =========================================================
# Save dataset
# =========================================================

df.to_csv(
    DATA_FILE,
    index=False
)

print("\nDataset created successfully.")

print(
    f"Dataset location: {DATA_FILE}"
)

print(
    f"Number of records: {len(df)}"
)


# =========================================================
# Features
# =========================================================

features = [
    "occupancy",
    "energy",
    "temperature",
    "humidity",
]

X = df[features]


# =========================================================
# Train Isolation Forest
# =========================================================

model = IsolationForest(
    n_estimators=200,
    contamination=0.05,
    random_state=42,
    n_jobs=-1,
)


model.fit(X)


# =========================================================
# Detect anomalies in development data
# =========================================================

predictions = model.predict(X)

anomaly_count = int(
    np.sum(predictions == -1)
)

normal_count = int(
    np.sum(predictions == 1)
)


# =========================================================
# Results
# =========================================================

print("\n------------------------------")
print("ANOMALY DETECTION RESULTS")
print("------------------------------")

print(
    f"Normal observations  : {normal_count}"
)

print(
    f"Anomalous observations: {anomaly_count}"
)


# =========================================================
# Save model
# =========================================================

joblib.dump(
    {
        "model": model,
        "features": features,
    },
    MODEL_FILE
)


print("\n------------------------------")
print("MODEL SAVED")
print("------------------------------")

print(
    f"Model location: {MODEL_FILE}"
)

print(
    "\nAnomaly Detection ML training completed successfully!"
)