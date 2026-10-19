
"""Use local SQLite or hosted PostgreSQL based on DATABASE_URL."""

import os
import re
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR / "campus.db"

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
IS_POSTGRES = bool(DATABASE_URL)


def _prepare_postgres_sql(query):
    """Translate the SQLite SQL syntax currently used by this application."""

        # Convert SQLite auto-increment IDs to PostgreSQL syntax.
    query = re.sub(
        r"\bINTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT\b",
        "BIGSERIAL PRIMARY KEY",
        query,
        flags=re.IGNORECASE,
    )

    # Preserve case-insensitive class-section lookups where requested.
    query = re.sub(
        r"\bclass_section\s*=\s*\?\s+COLLATE\s+NOCASE\b",
        "LOWER(class_section) = LOWER(?)",
        query,
        flags=re.IGNORECASE,
    )
    query = re.sub(
        r"\bclass_section\s+COLLATE\s+NOCASE\b",
        "LOWER(class_section)",
        query,
        flags=re.IGNORECASE,
    )

    # PostgreSQL does not support SQLite's NOCASE collation.
    query = re.sub(r"\s+COLLATE\s+NOCASE\b", "", query, flags=re.IGNORECASE)

    # Existing application queries use SQLite-style placeholders.
    return query.replace("?", "%s")


class PostgresCursorAdapter:
    """Provide cursor behavior required by existing application code."""

    def __init__(self, cursor):
        self._cursor = cursor
        self._lastrowid = None

    def execute(self, query, params=()):
        query = _prepare_postgres_sql(query)
        is_insert = bool(
            re.match(r"^\s*INSERT\s+INTO\b", query, flags=re.IGNORECASE)
        )
        has_returning = bool(
            re.search(r"\bRETURNING\b", query, flags=re.IGNORECASE)
        )

        # PostgreSQL uses RETURNING to obtain a newly generated ID.
        if is_insert and not has_returning:
            query = query.rstrip().rstrip(";") + " RETURNING id"

        self._cursor.execute(query, params)

        if is_insert and not has_returning:
            row = self._cursor.fetchone()
            if row is not None:
                self._lastrowid = row["id"] if isinstance(row, dict) else row[0]

        return self

    @property
    def lastrowid(self):
        return self._lastrowid

    @property
    def rowcount(self):
        return self._cursor.rowcount

    def fetchone(self):
        row = self._cursor.fetchone()
        return row

    def fetchall(self):
        return self._cursor.fetchall()

    def close(self):
        self._cursor.close()


class PostgresConnectionAdapter:
    """Adapt psycopg connections to the interface used by this application."""

    def __init__(self, connection):
        self._connection = connection

    def cursor(self):
        return PostgresCursorAdapter(self._connection.cursor())

    def execute(self, query, params=()):
        return self.cursor().execute(query, params)

    def executescript(self, script):
        # Convert common SQLite table ID definitions to PostgreSQL syntax.
        script = re.sub(
            r"INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT",
            "BIGSERIAL PRIMARY KEY",
            script,
            flags=re.IGNORECASE,
        )
        script = re.sub(
            r"\s+COLLATE\s+NOCASE\b",
            "",
            script,
            flags=re.IGNORECASE,
        )

        # The current schema scripts contain ordinary CREATE TABLE statements.
        for statement in script.split(";"):
            statement = statement.strip()
            if statement:
                self.execute(statement)

    def commit(self):
        self._connection.commit()

    def close(self):
        self._connection.close()


def get_connection():
    """Return SQLite locally unless a PostgreSQL URL is configured."""

    if not DATABASE_URL:
        connection = sqlite3.connect(DATABASE_PATH)
        connection.row_factory = sqlite3.Row
        return connection

    try:
        import psycopg
        from psycopg.rows import dict_row
    except ImportError as exc:
        raise RuntimeError(
            "PostgreSQL is configured, but psycopg is missing. "
            "Install the backend requirements first."
        ) from exc

    url = DATABASE_URL
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]

    connection = psycopg.connect(
        url,
        row_factory=dict_row,
        connect_timeout=10,
    )
    return PostgresConnectionAdapter(connection)
