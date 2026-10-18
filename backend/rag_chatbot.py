from pathlib import Path
import re
import sys
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

router = APIRouter(tags=["RAG Chatbot"])

BASE_DIR = Path(__file__).resolve().parent
KNOWLEDGE_FILE = BASE_DIR / "knowledge_base" / "campus_faq.md"


class ChatRequest(BaseModel):
    message: str = Field(min_length=2, max_length=1000)


def load_knowledge():
    if not KNOWLEDGE_FILE.exists():
        return []

    text = KNOWLEDGE_FILE.read_text(encoding="utf-8")

    # Clean accidental escaping before Markdown headings and bullets.
    text = re.sub(r"(?m)^\\(?=#)", "", text)
    text = re.sub(r"(?m)^\\(?=-\s)", "", text)

    sections = re.split(r"(?m)(?=^##\s+)", text)

    return [
        section.strip()
        for section in sections
        if section.strip()
        and not section.strip().startswith("# Smart Campus")
    ]


def retrieve_context(question: str, top_k: int = 2):
    sections = load_knowledge()

    if not sections:
        return []

    vectorizer = TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        ngram_range=(1, 2),
    )

    try:
        matrix = vectorizer.fit_transform(sections + [question])
    except ValueError:
        return []

    scores = cosine_similarity(
        matrix[-1],
        matrix[:-1],
    ).flatten()

    ranked = scores.argsort()[::-1][:top_k]

    return [
        {
            "content": sections[index],
            "score": round(float(scores[index]), 3),
        }
        for index in ranked
        if scores[index] > 0
    ]


def get_campus_api():
    """
    Find the already-loaded FastAPI app module.
    This avoids importing app.py while it is still initializing.
    """
    for module_name in ("app", "backend.app"):
        module = sys.modules.get(module_name)

        if module and hasattr(module, "occupancy_prediction"):
            return module

    try:
        import app
        return app
    except ImportError:
        return None


def get_live_data(question: str):
    q = question.lower()
    campus_api = get_campus_api()

    if campus_api is None:
        return None

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
        if any(keyword in q for keyword in keywords):
            function = getattr(campus_api, function_name, None)

            if function is None:
                continue

            try:
                return {
                    "label": label,
                    "data": function(),
                }
            except Exception:
                return {
                    "label": label,
                    "error": (
                        "Live campus data is unavailable. "
                        "Please check that sensor data has been added."
                    ),
                }

    return None


def format_data(value: Any, indent: int = 0) -> str:
    prefix = " " * indent

    if isinstance(value, dict):
        lines = []

        for key, item in value.items():
            label = key.replace("_", " ").capitalize()

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
            if isinstance(item, dict):
                lines.append(f"{prefix}•")
                lines.append(format_data(item, indent + 2))
            else:
                lines.append(f"{prefix}• {item}")

        return "\n".join(lines)

    return f"{prefix}{value}"


def clean_markdown(text: str) -> str:
    text = re.sub(r"(?m)^\s*#{1,6}\s*", "", text)
    text = re.sub(r"(?m)^\s*\\?[-*]\s+", "• ", text)
    text = re.sub(r"(?m)^\s*\\?\d+[.)]\s+", "• ", text)
    text = text.replace("\\-", "• ")
    text = text.replace("\\", "")
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


@router.post("/chat")
def chat(request: ChatRequest):
    question = request.message.strip()

    # 1. Answer questions about live campus data.
    live = get_live_data(question)

    if live is not None:
        if "error" in live:
            answer = live["error"]
        else:
            answer = (
                f"{live['label']} (live campus data)\n\n"
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

    # 2. Otherwise, search the campus knowledge base.
    matches = retrieve_context(question, top_k=2)

    if not matches:
        return {
            "answer": (
                "I couldn't find that information in the campus "
                "knowledge base. Try asking about campus AI features, "
                "occupancy prediction, energy prediction, anomaly "
                "detection, or what-if simulation."
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
                "section": clean_markdown(
                    item["content"].splitlines()[0]
                ),
                "score": item["score"],
                "type": "knowledge_base",
            }
            for item in matches
        ],
        "mode": "knowledge_base",
    }