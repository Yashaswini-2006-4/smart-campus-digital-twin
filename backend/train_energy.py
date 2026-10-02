import os

import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split


# =========================================================
# Configuration
# =========================================================

DATA_DIR = "data"
MODEL_DIR = "models"

DATA_FILE = os.path.join(
    DATA_DIR,
    "energy_data.csv"
)

MODEL_FILE = os.path.join(
    MODEL_DIR,
    "energy_model.pkl"
)


# =========================================================
# Create folders
# =========================================================

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)


# =========================================================
# Create development dataset
# =========================================================

np.random.seed(42)

rows = []

for day_of_week in range(7):

    for hour in range(8, 19):

        for sample in range(10):

            # Weekend
            is_weekend = 1 if day_of_week >= 5 else 0

            # Working/class hours
            if not is_weekend and 9 <= hour <= 17:
                class_schedule = 1
            else:
                class_schedule = 0

            # Simulated campus temperature
            temperature = round(
                np.random.uniform(20, 34),
                1
            )

            # Simulated occupancy
            if is_weekend:
                occupancy = np.random.uniform(
                    10,
                    35
                )

            elif hour in [9, 10]:
                occupancy = np.random.uniform(
                    55,
                    75
                )

            elif hour in [11, 12]:
                occupancy = np.random.uniform(
                    65,
                    85
                )

            elif hour in [13, 14]:
                occupancy = np.random.uniform(
                    70,
                    90
                )

            elif hour in [15, 16]:
                occupancy = np.random.uniform(
                    60,
                    80
                )

            elif hour in [17, 18]:
                occupancy = np.random.uniform(
                    35,
                    60
                )

            else:
                occupancy = np.random.uniform(
                    15,
                    40
                )

            # Previous energy consumption
            previous_energy = np.random.uniform(
                700,
                1500
            )

            # -------------------------------------------------
            # Energy consumption pattern
            # -------------------------------------------------

            base_energy = 500

            occupancy_effect = occupancy * 8

            temperature_effect = (
                abs(temperature - 24) * 15
            )

            schedule_effect = (
                300 if class_schedule == 1 else 50
            )

            weekend_effect = (
                -200 if is_weekend else 0
            )

            noise = np.random.normal(
                0,
                80
            )

            energy = (
                base_energy
                + occupancy_effect
                + temperature_effect
                + schedule_effect
                + weekend_effect
                + noise
            )

            energy = max(
                100,
                energy
            )

            rows.append({
                "day_of_week": day_of_week,
                "hour": hour,
                "temperature": temperature,
                "is_weekend": is_weekend,
                "class_schedule": class_schedule,
                "occupancy": round(
                    occupancy,
                    2
                ),
                "previous_energy": round(
                    previous_energy,
                    2
                ),
                "energy": round(
                    energy,
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
print(f"Dataset location: {DATA_FILE}")
print(f"Number of records: {len(df)}")


# =========================================================
# Features and target
# =========================================================

features = [
    "day_of_week",
    "hour",
    "temperature",
    "is_weekend",
    "class_schedule",
    "occupancy",
    "previous_energy",
]

target = "energy"


X = df[features]
y = df[target]


# =========================================================
# Train/Test Split
# =========================================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42
)


print("\nTraining records:", len(X_train))
print("Testing records:", len(X_test))


# =========================================================
# Train Random Forest model
# =========================================================

model = RandomForestRegressor(
    n_estimators=200,
    max_depth=14,
    random_state=42,
    n_jobs=-1
)

model.fit(
    X_train,
    y_train
)


# =========================================================
# Predictions
# =========================================================

predictions = model.predict(
    X_test
)


# =========================================================
# Evaluation
# =========================================================

mae = mean_absolute_error(
    y_test,
    predictions
)

rmse = np.sqrt(
    mean_squared_error(
        y_test,
        predictions
    )
)

r2 = r2_score(
    y_test,
    predictions
)


print("\n------------------------------")
print("MODEL EVALUATION")
print("------------------------------")

print(
    f"MAE  : {mae:.2f}"
)

print(
    f"RMSE : {rmse:.2f}"
)

print(
    f"R²   : {r2:.4f}"
)


# =========================================================
# Feature Importance
# =========================================================

importance = pd.DataFrame({
    "feature": features,
    "importance": model.feature_importances_,
})

importance = importance.sort_values(
    by="importance",
    ascending=False
)


print("\n------------------------------")
print("FEATURE IMPORTANCE")
print("------------------------------")

print(
    importance.to_string(
        index=False
    )
)


# =========================================================
# Save Model
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
    "\nEnergy ML training completed successfully!"
)