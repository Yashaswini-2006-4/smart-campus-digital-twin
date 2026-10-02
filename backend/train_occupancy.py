import os

import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split


# ---------------------------------------------------------
# Configuration
# ---------------------------------------------------------

DATA_DIR = "data"
MODEL_DIR = "models"

DATA_FILE = os.path.join(
    DATA_DIR,
    "occupancy_data.csv"
)

MODEL_FILE = os.path.join(
    MODEL_DIR,
    "occupancy_model.pkl"
)


# ---------------------------------------------------------
# Create folders
# ---------------------------------------------------------

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)


# ---------------------------------------------------------
# Create development dataset
# ---------------------------------------------------------

np.random.seed(42)

rows = []

for day_of_week in range(7):

    for hour in range(8, 19):

        for sample in range(10):

            # Weekend indicator
            is_weekend = 1 if day_of_week >= 5 else 0

            # Class schedule indicator
            if not is_weekend and 9 <= hour <= 17:
                class_schedule = 1
            else:
                class_schedule = 0

            # Simulated campus temperature
            temperature = round(
                np.random.uniform(20, 34),
                1
            )

            # Base occupancy pattern
            if is_weekend:
                base_occupancy = np.random.uniform(
                    10,
                    35
                )

            elif hour in [9, 10]:
                base_occupancy = np.random.uniform(
                    55,
                    75
                )

            elif hour in [11, 12]:
                base_occupancy = np.random.uniform(
                    65,
                    85
                )

            elif hour in [13, 14]:
                base_occupancy = np.random.uniform(
                    70,
                    90
                )

            elif hour in [15, 16]:
                base_occupancy = np.random.uniform(
                    60,
                    80
                )

            elif hour in [17, 18]:
                base_occupancy = np.random.uniform(
                    35,
                    60
                )

            else:
                base_occupancy = np.random.uniform(
                    15,
                    40
                )

            # Previous occupancy
            previous_occupancy = max(
                0,
                base_occupancy
                + np.random.normal(0, 5)
            )

            # Temperature effect
            temperature_effect = (
                (temperature - 27) * 0.5
            )

            # Final occupancy
            occupancy = (
                base_occupancy
                + temperature_effect
                + np.random.normal(0, 4)
            )

            occupancy = np.clip(
                occupancy,
                0,
                100
            )

            rows.append({
                "day_of_week": day_of_week,
                "hour": hour,
                "temperature": temperature,
                "is_weekend": is_weekend,
                "class_schedule": class_schedule,
                "previous_occupancy": round(
                    previous_occupancy,
                    2
                ),
                "occupancy": round(
                    occupancy,
                    2
                ),
            })


df = pd.DataFrame(rows)


# ---------------------------------------------------------
# Save dataset
# ---------------------------------------------------------

df.to_csv(
    DATA_FILE,
    index=False
)

print("\nDataset created successfully.")
print(f"Dataset location: {DATA_FILE}")
print(f"Number of records: {len(df)}")


# ---------------------------------------------------------
# Features and target
# ---------------------------------------------------------

features = [
    "day_of_week",
    "hour",
    "temperature",
    "is_weekend",
    "class_schedule",
    "previous_occupancy",
]

target = "occupancy"


X = df[features]
y = df[target]


# ---------------------------------------------------------
# Train/Test Split
# ---------------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42
)


print("\nTraining records:", len(X_train))
print("Testing records:", len(X_test))


# ---------------------------------------------------------
# Train Random Forest model
# ---------------------------------------------------------

model = RandomForestRegressor(
    n_estimators=200,
    max_depth=12,
    random_state=42,
    n_jobs=-1
)

model.fit(
    X_train,
    y_train
)


# ---------------------------------------------------------
# Make predictions
# ---------------------------------------------------------

predictions = model.predict(
    X_test
)


# ---------------------------------------------------------
# Evaluate model
# ---------------------------------------------------------

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


# ---------------------------------------------------------
# Feature Importance
# ---------------------------------------------------------

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


# ---------------------------------------------------------
# Save trained model
# ---------------------------------------------------------

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
    "\nOccupancy ML training completed successfully!"
)