from database import (
    initialize_database,
    get_latest_sensor_reading,
    insert_sensor_reading
)


# ============================================================
# INITIALIZE DATABASE
# ============================================================

initialize_database()

print("Database initialized successfully.")


# ============================================================
# CHECK WHETHER DATA EXISTS
# ============================================================

latest = get_latest_sensor_reading()


if latest is None:

    print(
        "No sensor data found."
    )

    print(
        "Adding initial development sensor reading..."
    )

    reading_id = insert_sensor_reading(

        occupancy=66,

        energy=1376,

        temperature=27,

        humidity=55,

        class_schedule=1
    )

    print(
        f"Initial sensor reading added. "
        f"ID: {reading_id}"
    )

else:

    print(
        "Existing sensor data found."
    )

    print(
        latest
    )


print(
    "Database setup completed."
)