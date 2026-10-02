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

    try:
        cursor = connection.cursor()

        # Existing campus readings table
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

        # New table for live outdoor weather
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS environment_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fetched_at TEXT NOT NULL,
                location TEXT NOT NULL,
                region TEXT,
                country TEXT,
                temperature_c REAL NOT NULL,
                humidity REAL NOT NULL,
                condition TEXT NOT NULL,
                feels_like_c REAL,
                wind_kph REAL,
                last_updated TEXT,
                source TEXT NOT NULL
            )
            """
        )


        # Daily class-wise occupancy. One row per class/section per date.
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS class_occupancy (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                record_date TEXT NOT NULL,
                class_section TEXT NOT NULL COLLATE NOCASE,
                room_number TEXT NOT NULL,
                student_count INTEGER NOT NULL CHECK (student_count >= 0),
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE (record_date, class_section)
            )
            """
        )

        connection.commit()

    finally:
        connection.close()


# ============================================================
# EXISTING CAMPUS SENSOR READINGS
# ============================================================

def insert_sensor_reading(
    occupancy,
    energy,
    temperature,
    humidity,
    class_schedule
):
    connection = get_connection()

    try:
        cursor = connection.cursor()
        timestamp = datetime.now().astimezone().isoformat()

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
                class_schedule,
            )
        )

        connection.commit()
        return cursor.lastrowid

    finally:
        connection.close()


def get_latest_sensor_reading():
    connection = get_connection()

    try:
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
        return dict(row) if row else None

    finally:
        connection.close()


def get_previous_sensor_reading():
    connection = get_connection()

    try:
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
        return dict(row) if row else None

    finally:
        connection.close()


def get_recent_sensor_readings(limit=20):
    limit = max(1, min(int(limit), 100))

    connection = get_connection()

    try:
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

        return [dict(row) for row in cursor.fetchall()]

    finally:
        connection.close()


# ============================================================
# WEATHERAPI ENVIRONMENT READINGS
# ============================================================

def insert_environment_reading(
    location,
    region,
    country,
    temperature_c,
    humidity,
    condition,
    feels_like_c,
    wind_kph,
    last_updated,
    source="WeatherAPI"
):
    connection = get_connection()

    try:
        cursor = connection.cursor()
        fetched_at = datetime.now().astimezone().isoformat()

        cursor.execute(
            """
            INSERT INTO environment_readings (
                fetched_at,
                location,
                region,
                country,
                temperature_c,
                humidity,
                condition,
                feels_like_c,
                wind_kph,
                last_updated,
                source
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                fetched_at,
                location,
                region,
                country,
                temperature_c,
                humidity,
                condition,
                feels_like_c,
                wind_kph,
                last_updated,
                source,
            )
        )

        connection.commit()
        return cursor.lastrowid

    finally:
        connection.close()


def get_latest_environment_reading():
    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                id,
                fetched_at,
                location,
                region,
                country,
                temperature_c,
                humidity,
                condition,
                feels_like_c,
                wind_kph,
                last_updated,
                source
            FROM environment_readings
            ORDER BY id DESC
            LIMIT 1
            """
        )

        row = cursor.fetchone()
        return dict(row) if row else None

    finally:
        connection.close()


def get_recent_environment_readings(limit=20):
    limit = max(1, min(int(limit), 100))

    connection = get_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                id,
                fetched_at,
                location,
                region,
                country,
                temperature_c,
                humidity,
                condition,
                feels_like_c,
                wind_kph,
                last_updated,
                source
            FROM environment_readings
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,)
        )

        return [dict(row) for row in cursor.fetchall()]

    finally:
        connection.close()

# ============================================================
# DAILY CLASS-WISE OCCUPANCY
# ============================================================

def save_class_occupancy(record_date, class_section, room_number, student_count):
    """Insert a daily class occupancy record or update the existing class/date."""
    record_date = str(record_date).strip()
    class_section = str(class_section).strip()
    room_number = str(room_number).strip()
    student_count = int(student_count)

    if not record_date:
        raise ValueError("Date is required.")
    if not class_section:
        raise ValueError("Class/section is required.")
    if not room_number:
        raise ValueError("Room number is required.")
    if student_count < 0:
        raise ValueError("Student count cannot be negative.")

    now = datetime.now().astimezone().isoformat()
    connection = get_connection()
    try:
        connection.execute(
            """
            INSERT INTO class_occupancy (
                record_date, class_section, room_number,
                student_count, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(record_date, class_section)
            DO UPDATE SET
                room_number = excluded.room_number,
                student_count = excluded.student_count,
                updated_at = excluded.updated_at
            """,
            (record_date, class_section, room_number, student_count, now, now),
        )
        connection.commit()
        row = connection.execute(
            """
            SELECT id, record_date, class_section, room_number,
                   student_count, created_at, updated_at
            FROM class_occupancy
            WHERE record_date = ? AND class_section = ? COLLATE NOCASE
            """,
            (record_date, class_section),
        ).fetchone()
        return dict(row)
    finally:
        connection.close()


def get_class_occupancy_history(record_date=None, limit=200):
    """Return occupancy records for a date, or the most recent records."""
    limit = max(1, min(int(limit), 500))
    connection = get_connection()
    try:
        if record_date:
            rows = connection.execute(
                """
                SELECT id, record_date, class_section, room_number,
                       student_count, created_at, updated_at
                FROM class_occupancy
                WHERE record_date = ?
                ORDER BY class_section COLLATE NOCASE
                LIMIT ?
                """,
                (str(record_date), limit),
            ).fetchall()
        else:
            rows = connection.execute(
                """
                SELECT id, record_date, class_section, room_number,
                       student_count, created_at, updated_at
                FROM class_occupancy
                ORDER BY record_date DESC, class_section COLLATE NOCASE
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]
    finally:
        connection.close()
