
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from db_compat import get_connection as connect

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])


def initialize_tables():
    """Create maintenance tables if they do not already exist."""
    db = connect()

    try:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS maintenance_complaints (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                location TEXT NOT NULL,
                priority TEXT NOT NULL DEFAULT 'Medium',
                status TEXT NOT NULL DEFAULT 'Open',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS maintenance_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL DEFAULT '',
                location TEXT NOT NULL DEFAULT '',
                assigned_to TEXT NOT NULL DEFAULT '',
                priority TEXT NOT NULL DEFAULT 'Medium',
                status TEXT NOT NULL DEFAULT 'Pending',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            """
        )
        db.commit()

    finally:
        db.close()


# Initialize maintenance tables when this module is imported.
initialize_tables()


class ComplaintCreate(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    description: str = Field(min_length=2, max_length=2000)
    location: str = Field(min_length=1, max_length=160)
    priority: Literal["Low", "Medium", "High", "Urgent"] = "Medium"


class TaskCreate(BaseModel):
    title: str = Field(min_length=2, max_length=120)
    description: str = ""
    location: str = ""
    assigned_to: str = ""
    priority: Literal["Low", "Medium", "High", "Urgent"] = "Medium"


class StatusUpdate(BaseModel):
    status: str


def get_rows(query, params=()):
    db = connect()

    try:
        rows = db.execute(query, params).fetchall()
        return [dict(row) for row in rows]

    finally:
        db.close()


def update_status(table, item_id, status, allowed):
    if status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status: {status}",
        )

    db = connect()

    try:
        cursor = db.execute(
            f"""
            UPDATE {table}
            SET status = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                status,
                datetime.now().astimezone().isoformat(),
                item_id,
            ),
        )

        db.commit()

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Record not found",
            )

        row = db.execute(
            f"SELECT * FROM {table} WHERE id = ?",
            (item_id,),
        ).fetchone()

        return dict(row)

    finally:
        db.close()


@router.get("/summary")
def summary():
    complaints = get_rows(
        "SELECT status, priority FROM maintenance_complaints"
    )
    tasks = get_rows(
        "SELECT status FROM maintenance_tasks"
    )

    return {
        "open_complaints": sum(
            item["status"] != "Resolved"
            for item in complaints
        ),
        "high_priority": sum(
            item["priority"] in ("High", "Urgent")
            and item["status"] != "Resolved"
            for item in complaints
        ),
        "tasks": sum(
            item["status"] != "Completed"
            for item in tasks
        ),
        "completed": sum(
            item["status"] == "Completed"
            for item in tasks
        ),
    }


@router.get("/complaints")
def complaints():
    items = get_rows(
        """
        SELECT *
        FROM maintenance_complaints
        ORDER BY
            CASE priority
                WHEN 'Urgent' THEN 0
                WHEN 'High' THEN 1
                WHEN 'Medium' THEN 2
                ELSE 3
            END,
            id DESC
        """
    )

    return {
        "count": len(items),
        "complaints": items,
    }


@router.post("/complaints", status_code=201)
def create_complaint(data: ComplaintCreate):
    now = datetime.now().astimezone().isoformat()
    db = connect()

    try:
        cursor = db.execute(
            """
            INSERT INTO maintenance_complaints (
                title,
                description,
                location,
                priority,
                status,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, 'Open', ?, ?)
            """,
            (
                data.title.strip(),
                data.description.strip(),
                data.location.strip(),
                data.priority,
                now,
                now,
            ),
        )

        db.commit()

        row = db.execute(
            "SELECT * FROM maintenance_complaints WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()

        return dict(row)

    finally:
        db.close()


@router.patch("/complaints/{item_id}/status")
def complaint_status(item_id: int, data: StatusUpdate):
    return update_status(
        "maintenance_complaints",
        item_id,
        data.status,
        {"Open", "In Progress", "Resolved"},
    )


@router.get("/priority-issues")
def priority_issues():
    items = get_rows(
        """
        SELECT *
        FROM maintenance_complaints
        WHERE priority IN ('High', 'Urgent')
          AND status != 'Resolved'
        ORDER BY
            CASE priority
                WHEN 'Urgent' THEN 0
                ELSE 1
            END,
            id DESC
        """
    )

    return {
        "count": len(items),
        "issues": items,
    }


@router.get("/tasks")
def tasks():
    items = get_rows(
        """
        SELECT *
        FROM maintenance_tasks
        ORDER BY
            CASE status
                WHEN 'Pending' THEN 0
                WHEN 'In Progress' THEN 1
                ELSE 2
            END,
            id DESC
        """
    )

    return {
        "count": len(items),
        "tasks": items,
    }


@router.post("/tasks", status_code=201)
def create_task(data: TaskCreate):
    now = datetime.now().astimezone().isoformat()
    db = connect()

    try:
        cursor = db.execute(
            """
            INSERT INTO maintenance_tasks (
                title,
                description,
                location,
                assigned_to,
                priority,
                status,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?)
            """,
            (
                data.title.strip(),
                data.description.strip(),
                data.location.strip(),
                data.assigned_to.strip(),
                data.priority,
                now,
                now,
            ),
        )

        db.commit()

        row = db.execute(
            "SELECT * FROM maintenance_tasks WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()

        return dict(row)

    finally:
        db.close()


@router.patch("/tasks/{item_id}/status")
def task_status(item_id: int, data: StatusUpdate):
    return update_status(
        "maintenance_tasks",
        item_id,
        data.status,
        {"Pending", "In Progress", "Completed"},
    )
