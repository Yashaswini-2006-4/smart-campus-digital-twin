
from pathlib import Path
import inspect
import json
import re
import sys
from typing import Any, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

router = APIRouter(tags=["RAG Chatbot"])

BASE_DIR = Path(__file__).resolve().parent
KNOWLEDGE_DIR = BASE_DIR / "knowledge_base"
TIMETABLE_FILE = (
    KNOWLEDGE_DIR / "timetable_semester_vii_b_2026_27.json"
)


class ChatRequest(BaseModel):
    message: str = Field(min_length=2, max_length=1000)


# ---------------------------------------------------------
# Knowledge base
# ---------------------------------------------------------

def load_knowledge() -> list[dict[str, str]]:
    """Load searchable Markdown documents from knowledge_base."""
    documents: list[dict[str, str]] = []

    if not KNOWLEDGE_DIR.exists():
        return documents

    for file_path in sorted(KNOWLEDGE_DIR.glob("*.md")):
        try:
            text = file_path.read_text(encoding="utf-8")
        except OSError:
            continue

        # Correct common accidental escapes from Markdown exports.
        text = text.replace("\\#", "#")
        text = text.replace("\\-", "-")

        sections = re.split(
            r"(?m)(?=^##\s+)",
            text,
        )

        for section in sections:
            section = section.strip()

            if not section:
                continue

            # Ignore document preambles without a section heading.
            heading = re.search(
                r"(?m)^##\s+(.+)$",
                section,
            )

            if not heading:
                continue

            documents.append(
                {
                    "source": file_path.name,
                    "section": heading.group(1).strip(),
                    "content": section,
                }
            )

    return documents


def retrieve_context(
    question: str,
    top_k: int = 3,
) -> list[dict[str, Any]]:
    documents = load_knowledge()

    if not documents:
        return []

    # Include headings in searchable text so questions about
    # feature names can find the relevant section.
    searchable_text = [
        f"{item['section']}\n{item['content']}"
        for item in documents
    ]

    vectorizer = TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        ngram_range=(1, 2),
    )

    try:
        matrix = vectorizer.fit_transform(
            searchable_text + [question]
        )
    except ValueError:
        return []

    scores = cosine_similarity(
        matrix[-1],
        matrix[:-1],
    ).flatten()

    ranked = scores.argsort()[::-1][:top_k]

    return [
        {
            **documents[index],
            "score": round(float(scores[index]), 3),
        }
        for index in ranked
        if scores[index] > 0.01
    ]


def clean_markdown(text: str) -> str:
    """Convert basic Markdown formatting into readable chat text."""
    text = re.sub(r"(?m)^\s*#{1,6}\s*", "", text)
    text = re.sub(r"(?m)^\s*[-*]\s+", "• ", text)
    text = re.sub(r"(?m)^\s*\d+[.)]\s+", "• ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


# ---------------------------------------------------------
# Structured timetable
# ---------------------------------------------------------

def load_timetable() -> Optional[dict[str, Any]]:
    if not TIMETABLE_FILE.exists():
        return None

    try:
        return json.loads(
            TIMETABLE_FILE.read_text(encoding="utf-8")
        )
    except (OSError, json.JSONDecodeError) as error:
        print(f"Could not load timetable: {error}")
        return None


DAYS = {
    "monday": "Monday",
    "tuesday": "Tuesday",
    "wednesday": "Wednesday",
    "thursday": "Thursday",
    "friday": "Friday",
    "saturday": "Saturday",
    "sunday": "Sunday",
}


def find_day(question: str) -> Optional[str]:
    q = question.lower()

    for key, label in DAYS.items():
        if re.search(rf"\b{key}\b", q):
            return label

    return None


def parse_time(question: str) -> Optional[int]:
    """
    Return requested time in minutes after midnight.

    Explicit AM/PM is respected. Without a suffix, an hour
    from 1 through 6 is interpreted as afternoon because
    this timetable contains daytime classes only.
    """
    q = question.lower().replace(".", ":")

    patterns = [
        r"\b(?:at|around|by|during)\s+"
        r"(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\b",
        r"\b(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)?\b",
        r"\b(\d{1,2})\s*(a\.?m\.?|p\.?m\.?)\b",
    ]

    for index, pattern in enumerate(patterns):
        match = re.search(pattern, q)

        if not match:
            continue

        if index == 2:
            hour = int(match.group(1))
            minute = 0
            suffix = match.group(2)
        else:
            hour = int(match.group(1))
            minute = int(match.group(2) or 0)
            suffix = match.group(3) if len(match.groups()) >= 3 else None

        if hour < 1 or hour > 12 or minute > 59:
            return None

        if suffix:
            suffix = suffix.replace(".", "")
            if suffix == "pm" and hour != 12:
                hour += 12
            elif suffix == "am" and hour == 12:
                hour = 0
        elif 1 <= hour <= 6:
            hour += 12

        return hour * 60 + minute

    return None


def clock_minutes(value: str) -> int:
    hour, minute = map(int, value.split(":"))
    return hour * 60 + minute


def format_clock(value: str) -> str:
    hour, minute = map(int, value.split(":"))
    suffix = "AM" if hour < 12 else "PM"
    display_hour = hour % 12 or 12

    return f"{display_hour}:{minute:02d} {suffix}"


def normalize_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def find_course(
    question: str,
    timetable: dict[str, Any],
) -> Optional[dict[str, Any]]:
    q = normalize_text(question)

    for course in timetable.get("courses", []):
        code = normalize_text(course.get("code", ""))

        if code and re.search(
            rf"\b{re.escape(code)}\b",
            q,
        ):
            return course

        searchable_names = [
            course.get("title", ""),
            *course.get("aliases", []),
        ]

        for name in searchable_names:
            normalized_name = normalize_text(name)

            if normalized_name and normalized_name in q:
                return course

    return None


def get_course_map(
    timetable: dict[str, Any],
) -> dict[str, dict[str, Any]]:
    return {
        str(course.get("code", "")).upper(): course
        for course in timetable.get("courses", [])
    }


def render_session(
    session: dict[str, Any],
    courses: dict[str, dict[str, Any]],
) -> str:
    start = format_clock(session["start"])
    end = format_clock(session["end"])

    code = session.get("course_code")
    activity = session.get("activity")

    if code:
        course = courses.get(str(code).upper(), {})
        title = course.get("title")

        label = (
            f"{code} — {title}"
            if title
            else str(code)
        )
    else:
        label = activity or "Scheduled activity"

    parts = [f"{start}–{end}: {label}"]

    if session.get("room"):
        parts.append(f"Room: {session['room']}")

    if session.get("note"):
        parts.append(session["note"])

    return " | ".join(parts)


def timetable_source(timetable: dict[str, Any]) -> dict[str, str]:
    return {
        "section": (
            f"{timetable.get('semester', 'Unknown semester')}, "
            f"Section {timetable.get('section', 'Unknown')}"
        ),
        "type": "structured_timetable",
        "file": TIMETABLE_FILE.name,
    }


def is_timetable_question(
    question: str,
    timetable: dict[str, Any],
) -> bool:
    q = question.lower()

    timetable_terms = (
        "timetable",
        "time table",
        "class timing",
        "class schedule",
        "lecture",
        "which class",
        "what class",
        "what do i have",
        "class teacher",
        "who teaches",
        "who is teaching",
        "faculty for",
        "which subject",
        "subject code",
        "period",
    )

    return (
        any(term in q for term in timetable_terms)
        or find_day(question) is not None
        and any(
            term in q
            for term in ("class", "schedule", "subject", "timetable", "period")
        )
        or find_course(question, timetable) is not None
    )


def get_timetable_answer(
    question: str,
) -> Optional[dict[str, Any]]:
    timetable = load_timetable()

    if not timetable or not is_timetable_question(question, timetable):
        return None

    courses = get_course_map(timetable)
    course = find_course(question, timetable)
    day = find_day(question)
    requested_time = parse_time(question)
    q = question.lower()

    asks_teacher = any(
        phrase in q
        for phrase in (
            "who teaches",
            "who is teaching",
            "faculty for",
            "teacher for",
            "class teacher",
            "who handles",
        )
    )

    # Course directory questions use the course information
    # explicitly stored in the uploaded timetable.
    if course and asks_teacher:
        teachers = course.get("faculty", [])
        answer = (
            f"{course['code']} — {course['title']}\n"
            f"Faculty listed: {', '.join(teachers) if teachers else 'Not specified'}."
        )

        if course.get("faculty_needs_verification"):
            answer += (
                "\nNote: At least one faculty name was difficult "
                "to read in the timetable image and should be verified."
            )

        return {
            "answer": answer,
            "sources": [timetable_source(timetable)],
            "mode": "timetable",
        }

    schedule = timetable.get("schedule", [])
    day_entry = next(
        (
            item for item in schedule
            if item.get("day", "").lower() == (day or "").lower()
        ),
        None,
    )

    # A question such as "What class do I have Monday at 10 AM?"
    if day and requested_time is not None:
        if not day_entry:
            return {
                "answer": (
                    f"No timetable is stored for {day}. "
                    "This timetable covers Monday through Saturday."
                ),
                "sources": [timetable_source(timetable)],
                "mode": "timetable",
            }

        matching = []
        for session in day_entry.get("sessions", []):
            start = clock_minutes(session["start"])
            end = clock_minutes(session["end"])

            if start <= requested_time < end:
                matching.append(session)

        if matching:
            lines = [
                render_session(item, courses)
                for item in matching
            ]
            answer = f"{day} at the requested time:\n" + "\n".join(lines)
        else:
            answer = (
                f"No entry is listed for {day} at that time "
                "in the stored timetable."
            )

        return {
            "answer": answer,
            "sources": [timetable_source(timetable)],
            "mode": "timetable",
        }

    # Questions asking for an entire weekday timetable.
    if day_entry:
        sessions = day_entry.get("sessions", [])
        answer = (
            f"Timetable for {day} — "
            f"Semester {timetable.get('semester')}, "
            f"Section {timetable.get('section')}:\n"
        )

        answer += "\n".join(
            render_session(session, courses)
            for session in sessions
        )

        return {
            "answer": answer,
            "sources": [timetable_source(timetable)],
            "mode": "timetable",
        }

    # Show all scheduled occurrences of a requested course.
    if course:
        code = str(course["code"]).upper()
        occurrences = []

        for day_info in schedule:
            for session in day_info.get("sessions", []):
                session_code = str(
                    session.get("course_code", "")
                ).upper()

                if session_code == code or session_code.startswith(code + " "):
                    occurrences.append(
                        f"{day_info['day']}: "
                        f"{render_session(session, courses)}"
                    )

        course_info = (
            f"{course['code']} — {course['title']}\n"
            f"Faculty: {', '.join(course.get('faculty', [])) or 'Not specified'}"
        )

        if occurrences:
            course_info += "\n\nScheduled sessions:\n" + "\n".join(occurrences)
        else:
            course_info += "\nNo matching schedule entries were found."

        if course.get("faculty_needs_verification"):
            course_info += (
                "\nPlease verify the faculty names against the original image."
            )

        return {
            "answer": course_info,
            "sources": [timetable_source(timetable)],
            "mode": "timetable",
        }

    # If a user asks for the full timetable, return every stored day.
    if any(
        term in q
        for term in ("whole timetable", "full timetable", "entire timetable")
    ):
        answers = []

        for day_info in schedule:
            answers.append(
                f"\n{day_info['day']}\n"
                + "\n".join(
                    render_session(session, courses)
                    for session in day_info.get("sessions", [])
                )
            )

        return {
            "answer": "\n".join(answers),
            "sources": [timetable_source(timetable)],
            "mode": "timetable",
        }

    return {
        "answer": (
            f"The stored timetable is for CSE Semester "
            f"{timetable.get('semester')}, Section "
            f"{timetable.get('section')}.\n"
            "Ask for a weekday, a time, or a course code to get "
            "a specific answer."
        ),
        "sources": [timetable_source(timetable)],
        "mode": "timetable",
    }


# ---------------------------------------------------------
# Existing FastAPI live-data integrations
# ---------------------------------------------------------

def get_campus_api():
    """Find the already-loaded FastAPI app module."""
    for module_name in ("app", "backend.app"):
        module = sys.modules.get(module_name)

        if module and hasattr(module, "occupancy_prediction"):
            return module

    try:
        import app
        return app
    except ImportError:
        return None


def contains_aqi_data(value: Any) -> bool:
    """Detect commonly named AQI and pollutant fields."""
    aqi_keys = {
        "aqi",
        "us_epa_index",
        "gb_defra_index",
        "pm2_5",
        "pm25",
        "pm10",
        "pm2_5_ugm3",
    }

    if isinstance(value, dict):
        for key, item in value.items():
            normalized_key = str(key).lower().replace("-", "_")

            if normalized_key in aqi_keys:
                return True

            if contains_aqi_data(item):
                return True

    elif isinstance(value, list):
        return any(contains_aqi_data(item) for item in value)

    return False


async def call_api_function(function):
    value = function()

    if inspect.isawaitable(value):
        value = await value

    return value


async def get_live_data(question: str):
    q = question.lower()
    campus_api = get_campus_api()

    if campus_api is None:
        return None

    # AQI is deliberately checked separately. It must not be
    # presented as live data unless the API returns AQI fields.
    aqi_keywords = (
        "aqi",
        "air quality",
        "air pollution",
        "pm2.5",
        "pm10",
    )

    if any(keyword in q for keyword in aqi_keywords):
        function = getattr(campus_api, "environment", None)

        if function is None:
            return {
                "label": "Outdoor air quality",
                "error": (
                    "Live AQI is not connected yet. The weather "
                    "service must first be updated to request and "
                    "return air-quality data."
                ),
            }

        try:
            data = await call_api_function(function)

            if not contains_aqi_data(data):
                return {
                    "label": "Outdoor air quality",
                    "error": (
                        "The current weather endpoint did not return "
                        "AQI or pollutant fields. AQI cannot be reported "
                        "until the weather integration provides those values."
                    ),
                }

            return {
                "label": "Outdoor air quality",
                "data": data,
            }
        except Exception as error:
            print(f"AQI retrieval failed: {error}")
            return {
                "label": "Outdoor air quality",
                "error": "Live air-quality data is currently unavailable.",
            }

    # Weather queries use the environment endpoint, if it exists.
    if any(
        keyword in q
        for keyword in (
            "weather",
            "outdoor temperature",
            "outside temperature",
            "feels like",
            "wind speed",
            "chance of rain",
        )
    ):
        function = getattr(campus_api, "environment", None)

        if function is not None:
            try:
                return {
                    "label": "Live outdoor weather",
                    "data": await call_api_function(function),
                }
            except Exception as error:
                print(f"Weather retrieval failed: {error}")
                return {
                    "label": "Live outdoor weather",
                    "error": "Live weather data is currently unavailable.",
                }

    live_routes = [
        (
            ("occupancy", "how many people", "crowded"),
            "Current and predicted occupancy",
            "occupancy_prediction",
        ),
        (
            ("energy", "electricity", "power consumption"),
            "Current and predicted energy",
            "energy_prediction",
        ),
        (
            ("campus health", "health score"),
            "Campus health",
            "campus_health",
        ),
        (
            ("anomaly", "anomalies", "abnormal", "unusual sensor"),
            "Anomaly detection",
            "anomaly_detection",
        ),
        (
            ("recommendation", "suggestions", "what should"),
            "Campus recommendations",
            "recommendations",
        ),
        (
            ("sensor data", "latest sensor", "temperature", "humidity"),
            "Latest sensor readings",
            "sensor_data",
        ),
    ]

    for keywords, label, function_name in live_routes:
        if not any(keyword in q for keyword in keywords):
            continue

        function = getattr(campus_api, function_name, None)

        if function is None:
            continue

        try:
            return {
                "label": label,
                "data": await call_api_function(function),
            }
        except Exception as error:
            print(f"{label} retrieval failed: {error}")
            return {
                "label": label,
                "error": (
                    "Live campus data is unavailable. Please check "
                    "that the backend is running and the relevant data exists."
                ),
            }

    return None


def format_data(value: Any, indent: int = 0) -> str:
    prefix = " " * indent

    if isinstance(value, dict):
        lines = []

        for key, item in value.items():
            label = str(key).replace("_", " ").capitalize()

            if isinstance(item, (dict, list)):
                lines.append(f"{prefix}{label}:")
                lines.append(format_data(item, indent + 2))
            else:
                lines.append(f"{prefix}{label}: {item}")

        return "\n".join(lines)

    if isinstance(value, list):
        if not value:
            return f"{prefix}None available."

        lines = []

        for item in value:
            if isinstance(item, (dict, list)):
                lines.append(f"{prefix}•")
                lines.append(format_data(item, indent + 2))
            else:
                lines.append(f"{prefix}• {item}")

        return "\n".join(lines)

    return f"{prefix}{value}"


# ---------------------------------------------------------
# Chat endpoint
# ---------------------------------------------------------

@router.post("/chat")
async def chat(request: ChatRequest):
    question = request.message.strip()

    if len(question) < 2:
        return {
            "answer": "Please enter a longer question.",
            "sources": [],
            "mode": "fallback",
        }

    # 1. Structured timetable lookup takes priority.
    timetable_result = get_timetable_answer(question)

    if timetable_result is not None:
        return timetable_result

    # 2. Current campus data and weather.
    live = await get_live_data(question)

    if live is not None:
        if "error" in live:
            answer = live["error"]
        else:
            answer = (
                f"{live['label']}:\n\n"
                f"{format_data(live['data'])}"
            )

        return {
            "answer": answer,
            "sources": [
                {
                    "section": live["label"],
                    "type": "live_api",
                }
            ],
            "mode": "live_data",
        }

    # 3. Search all Markdown knowledge documents.
    matches = retrieve_context(question, top_k=3)

    if not matches:
        return {
            "answer": (
                "I couldn't find a reliable answer in the stored "
                "campus knowledge or connected live data. Try naming "
                "the feature, timetable day, course code, or dashboard "
                "you are asking about."
            ),
            "sources": [],
            "mode": "knowledge_base",
        }

    context = "\n\n".join(
        clean_markdown(item["content"])
        for item in matches
    )

    return {
        "answer": (
            "Here is the relevant information from the campus "
            "knowledge base:\n\n"
            + context
        ),
        "sources": [
            {
                "section": item["section"],
                "file": item["source"],
                "score": item["score"],
                "type": "knowledge_base",
            }
            for item in matches
        ],
        "mode": "knowledge_base",
    }
