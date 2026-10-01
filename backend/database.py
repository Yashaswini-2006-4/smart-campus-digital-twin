import sqlite3
from pathlib import Path
from datetime import datetime


BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "campus.db"


def get_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS sensor_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            occupancy REAL NOT NULL,
            energy REAL NOT NULL,
            temperature REAL NOT NULL,
            humidity REAL NOT NULL,
            class_schedule INTEGER NOT NULL
        )
        """
    )

    connection.commit()
    connection.close()


def insert_sensor_reading(
    occupancy,
    energy,
    temperature,
    humidity,
    class_schedule
):
    connection = get_connection()
    cursor = connection.cursor()

    timestamp = datetime.now().isoformat()

    cursor.execute(
        """
        INSERT INTO sensor_readings (
            timestamp,
            occupancy,
            energy,
            temperature,
            humidity,
            class_schedule
        )
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            timestamp,
            occupancy,
            energy,
            temperature,
            humidity,
            class_schedule
        )
    )

    connection.commit()

    reading_id = cursor.lastrowid

    connection.close()

    return reading_id


def get_latest_sensor_reading():
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT
            id,
            timestamp,
            occupancy,
            energy,
            temperature,
            humidity,
            class_schedule
        FROM sensor_readings
        ORDER BY id DESC
        LIMIT 1
        """
    )

    row = cursor.fetchone()

    connection.close()

    if row is None:
        return None

    return dict(row)


def get_previous_sensor_reading():
    """
    Returns the sensor reading immediately before
    the latest reading.
    """

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT
            id,
            timestamp,
            occupancy,
            energy,
            temperature,
            humidity,
            class_schedule
        FROM sensor_readings
        ORDER BY id DESC
        LIMIT 1 OFFSET 1
        """
    )

    row = cursor.fetchone()

    connection.close()

    if row is None:
        return None

    return dict(row)


def get_recent_sensor_readings(limit=20):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT
            id,
            timestamp,
            occupancy,
            energy,
            temperature,
            humidity,
            class_schedule
        FROM sensor_readings
        ORDER BY id DESC
        LIMIT ?
        """,
        (limit,)
    )

    rows = cursor.fetchall()

    connection.close()

    return [dict(row) for row in rows]