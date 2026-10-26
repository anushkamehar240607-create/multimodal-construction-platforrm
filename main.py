"""AI-Powered Multimodal Construction Intelligence Platform - FastAPI backend.

Epics: 2 (image analysis), 3 (planning & valuation), 4 (centralized AI layer),
5 (assistant & advisory). Run:  uvicorn main:app --reload --port 8000
"""
import copy
import io
import json
import logging
import os
import re
from typing import List, Optional

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field

load_dotenv()
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("construction-ai")

API_KEY = os.getenv("GEMINI_API_KEY", "")
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_DOC_CHARS = 6000

if API_KEY and not API_KEY.startswith("your_"):
    genai.configure(api_key=API_KEY)
    AI_READY = True
else:
    AI_READY = False
    log.warning("GEMINI_API_KEY not set - endpoints will return safe fallback responses.")

app = FastAPI(title="Construction Intelligence Platform", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Epic 4 - Feature registry: role prompt + safe default (also the JSON schema)
# ---------------------------------------------------------------------------
FEATURES = {
    "safety": {
        "role": "You are a certified construction safety officer (OSHA 1926 and Indian BOCW/IS codes). "
                "Analyse the site observations, image and documents for hazards and PPE compliance.",
        "default": {
            "hazards": [], "risk_level": "Unknown", "ppe": [], "missing_ppe": [],
            "corrective_actions": ["AI analysis incomplete. Have a qualified safety officer inspect the site before work continues."],
            "osha_standards": [],
        },
        "enums": {"risk_level": ["Low", "Medium", "High", "Critical"]},
    },
    "crack": {
        "role": "You are a licensed structural engineer specialising in concrete and masonry defects. "
                "Classify the crack, its cause, and repair method.",
        "default": {
            "crack_type": "Undetermined", "severity": "Moderate",
            "probable_cause": "Could not be determined from the supplied input.",
            "structural_risk": "Unknown - consult a structural engineer for an on-site assessment.",
            "remediation": ["Monitor the crack with a tell-tale gauge.", "Get a structural engineer to inspect in person."],
        },
        "enums": {"severity": ["Minor", "Moderate", "Severe"]},
    },
    "planner": {
        "role": "You are a senior quantity surveyor in India. Estimate materials, costs in INR and a weekly "
                "schedule using current regional rates and standard thumb rules.",
        "default": {
            "materials": {"cement_bags": 0, "steel_kg": 0, "sand": "N/A", "aggregate": "N/A"},
            "cost_breakdown_inr": {"total": 0, "material": 0, "labor": 0, "permits": 0},
            "task_schedule": [],
        },
    },
    "valuation": {
        "role": "You are an Indian real-estate valuer. Give realistic market valuation in INR for the stated "
                "location, using typical circle-rate and market-rate knowledge.",
        "default": {
            "valuation_range_inr": {"min": 0, "max": 0, "avg": 0},
            "price_per_sqft": 0, "rental_yield_percentage": 0,
            "appreciation_outlook_5yr": "Unavailable", "roi_analysis": "Unavailable",
        },
    },
    "chatbot": {
        "role": "You are a construction standards and site-safety expert (IS codes, NBC 2016, OSHA). "
                "Answer concisely and practically. Use the conversation history for context.",
        "default": {
            "reply": "I couldn't generate a complete answer. Please rephrase your question.",
            "action_suggestions": [],
        },
    },
    "site_assistant": {
        "role": "You are an experienced construction site manager. Break today's activity into a practical plan.",
        "default": {"daily_task_breakdown": [], "required_equipment": [], "safety_precautions": [], "risk_alerts": []},
    },
    "weather": {
        "role": "You are a construction scheduling and weather-risk expert. Decide if the activity can proceed.",
        "default": {
            "recommendation": "NO-GO", "identified_risks": [],
            "safety_precautions": [], "scheduling_advice": "Insufficient data - postpone until conditions are verified.",
        },
        "enums": {"recommendation": ["GO", "NO-GO"]},
    },
}

# ---------------------------------------------------------------------------
# Epic 4 helpers: JSON cleaning, schema enforcement
# ---------------------------------------------------------------------------
def clean_json(text: str) -> dict:
    """Strip ```json fences / prose and parse the first JSON object."""
    text = re.sub(r"```(?:json)?", "", text or "", flags=re.IGNORECASE).strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        raise ValueError("No JSON object found in model output")
    return json.loads(text[start:end + 1])


def enforce_schema(result, default):
    """Recursively coerce result to the default's keys and types; fill gaps with defaults."""
    if isinstance(default, dict):
        result = result if isinstance(result, dict) else {}
        return {k: enforce_schema(result.get(k), v) for k, v in default.items()}
    if isinstance(default, list):
        if isinstance(result, list):
            return result
        return [result] if isinstance(result, str) and result else copy.deepcopy(default)
    if isinstance(default, (int, float)) and not isinstance(default, bool):
        try:
            return float(result) if isinstance(default, float) else (int(float(result)) if result is not None else default)
        except (TypeError, ValueError):
            return default
    if isinstance(default, str):
        return str(result) if result not in (None, "") else default
    return result if result is not None else default


def apply_enums(result: dict, enums: dict, default: dict) -> dict:
    """Force enum fields onto allowed values, falling back to the safe default."""
    for key, allowed in (enums or {}).items():
        norm = re.sub(r"[\s_]+", "-", str(result.get(key, "")).strip().lower()).replace("nogo", "no-go")
        result[key] = next((a for a in allowed if a.lower() == norm), default[key])
    return result


async def read_image(image_file: UploadFile) -> Image.Image:
    data = await image_file.read()
    if not data:
        raise HTTPException(400, "Uploaded image is empty.")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "Image exceeds the 10 MB limit.")
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(400, "Unsupported or corrupted image file. Use JPG, PNG or WEBP.")
    img = img.convert("RGB")
    img.thumbnail((1600, 1600))
    return img


async def query_ai(feature: str, user_inputs: dict, image_file: UploadFile = None) -> dict:
    """Single entry point for all Gemini calls (text-only or image + text)."""
    spec = FEATURES[feature]
    default = spec["default"]
    fallback = copy.deepcopy(default)

    image = None
    if image_file is not None and image_file.filename:
        image = await read_image(image_file)  # raises HTTP 4xx on bad uploads

    if not AI_READY:
        fallback["fallback_used"] = True
        fallback["note"] = "GEMINI_API_KEY is not configured on the server."
        return fallback

    prompt = (
        f"{spec['role']}\n\n"
        "Respond with ONLY one valid JSON object that exactly matches this schema (same keys, same types). "
        "No markdown, no commentary. Use INR (₹) for currency, numbers as plain numbers.\n"
        f"SCHEMA:\n{json.dumps(default, ensure_ascii=False)}\n"
        + (f"Allowed values: {json.dumps(spec['enums'])}\n" if spec.get("enums") else "")
        + f"\nINPUTS:\n{json.dumps(user_inputs, ensure_ascii=False, default=str)}\n"
        + ("\nAn image is attached; base your analysis on it together with the inputs.\n" if image else "")
    )
    contents = [prompt, image] if image else [prompt]

    try:
        model = genai.GenerativeModel(
            MODEL_NAME,
            generation_config={"temperature": 0.3, "response_mime_type": "application/json"},
        )
        response = await model.generate_content_async(contents)
        parsed = clean_json(response.text)
        result = enforce_schema(parsed, default)
        result = apply_enums(result, spec.get("enums"), default)
        result["fallback_used"] = False
        return result
    except HTTPException:
        raise
    except Exception as exc:  # blocked content, quota, malformed JSON, network...
        log.exception("AI call failed for %s: %s", feature, exc)
        fallback["fallback_used"] = True
        fallback["note"] = "The AI response was incomplete or unavailable; showing safe defaults."
        return fallback


async def read_doc(doc_file: Optional[UploadFile]) -> str:
    if doc_file is None or not doc_file.filename:
        return ""
    raw = await doc_file.read()
    return raw.decode("utf-8", errors="ignore")[:MAX_DOC_CHARS]

# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------
class PlannerIn(BaseModel):
    plot_size_sqft: float = Field(..., gt=0, le=1_000_000)
    construction_type: str = Field(..., min_length=2, max_length=80)
    location: str = Field(..., min_length=2, max_length=120)

class ValuationIn(BaseModel):
    location: str = Field(..., min_length=2, max_length=120)
    area_sqft: float = Field(..., gt=0, le=1_000_000)
    property_type: str = Field(..., min_length=2, max_length=80)
    building_age_years: float = Field(0, ge=0, le=200)
    amenities: List[str] = []

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatIn(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: List[ChatMessage] = []

class SiteAssistantIn(BaseModel):
    activity: str = Field(..., min_length=2, max_length=200)
    worker_count: int = Field(..., gt=0, le=5000)
    site_conditions: str = Field("", max_length=1000)

class WeatherIn(BaseModel):
    activity: str = Field(..., min_length=2, max_length=200)
    forecast: str = Field(..., min_length=2, max_length=500)

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/api/health")
async def health():
    return {"status": "ok", "ai_ready": AI_READY, "model": MODEL_NAME}


@app.post("/api/safety-monitor")  # Activity 2.1
async def safety_monitor(
    observations: str = Form(""),
    site_image: Optional[UploadFile] = File(None),
    doc_file: Optional[UploadFile] = File(None),
):
    has_image = site_image is not None and bool(site_image.filename)
    if not observations.strip() and not has_image and not (doc_file and doc_file.filename):
        raise HTTPException(400, "Provide observations, a site image, or a document.")
    inputs = {"observations": observations.strip(), "document_text": await read_doc(doc_file)}
    return await query_ai("safety", inputs, site_image)


@app.post("/api/crack-detection")  # Activity 2.2
async def crack_detection(
    context: str = Form(""),
    crack_image: Optional[UploadFile] = File(None),
):
    if not (crack_image and crack_image.filename):
        raise HTTPException(400, "A crack photo is required.")
    return await query_ai("crack", {"context": context.strip()}, crack_image)


@app.post("/api/project-planner")  # Activity 3.1
async def project_planner(body: PlannerIn):
    return await query_ai("planner", body.model_dump())


@app.post("/api/real-estate-valuation")  # Activity 3.2
async def real_estate_valuation(body: ValuationIn):
    return await query_ai("valuation", body.model_dump())


@app.post("/api/chatbot")  # Activity 5.1
async def chatbot(body: ChatIn):
    return await query_ai("chatbot", {"message": body.message,
                                      "history": [m.model_dump() for m in body.history[-10:]]})


@app.post("/api/site-assistant")  # Activity 5.2
async def site_assistant(body: SiteAssistantIn):
    return await query_ai("site_assistant", body.model_dump())


@app.post("/api/weather-advisor")  # Activity 5.3
async def weather_advisor(body: WeatherIn):
    return await query_ai("weather", body.model_dump())
