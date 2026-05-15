"""
Synapse — AI-Powered Text Triage Tool
FastAPI Backend Entry Point
"""

import os
import json
import re
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from google import genai

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Synapse",
    description="AI-Powered Text Triage Tool",
    version="1.0.0",
)

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Resolve paths
BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"


# ── Pydantic Models ──

class TriageRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Raw text to triage")


# ── System Prompt ──

SYSTEM_PROMPT = """You are Synapse, an intelligent text triage assistant. Your job is to analyze raw, unstructured text (a "brain dump") and categorize it into four structured categories.

Today's date is: {today}

You MUST respond with ONLY a valid JSON object — no markdown fences, no explanation, no extra text. The JSON must have exactly these four keys:

{{
  "todos": [
    {{ "task": "description of the task", "priority": "high|medium|low" }}
  ],
  "calendar_events": [
    {{ "title": "event name", "date": "YYYY-MM-DD or descriptive date", "time": "HH:MM or descriptive time or empty string" }}
  ],
  "drafts": [
    {{ "recipient": "person or group name", "subject": "email/message subject", "body": "drafted message content" }}
  ],
  "notes": [
    {{ "content": "the idea or note" }}
  ]
}}

Rules:
1. Every piece of information from the input MUST be categorized into exactly one category.
2. For calendar_events, infer dates and times from context (e.g., "tomorrow" → actual date, "next Monday" → actual date).
3. For drafts, write a professional, concise draft ready to send.
4. For todos, assign priority based on urgency/importance signals in the text.
5. For notes, capture ideas, reminders, and thoughts that don't fit the other categories.
6. If a category has no items, return an empty array for that key.
7. Output ONLY the JSON object. No other text."""


# ── Gemini Client ──

def get_gemini_client():
    """Get or create the Gemini client."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_api_key_here":
        return None
    return genai.Client(api_key=api_key)


def parse_gemini_response(text: str) -> dict:
    """Extract and parse JSON from the Gemini response text."""
    # Try direct JSON parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try extracting from markdown code fences
    json_match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', text, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group(1))
        except json.JSONDecodeError:
            pass

    # Try finding the first { ... } block
    brace_match = re.search(r'\{.*\}', text, re.DOTALL)
    if brace_match:
        try:
            return json.loads(brace_match.group(0))
        except json.JSONDecodeError:
            pass

    raise ValueError("Could not parse JSON from Gemini response")


# ── API Endpoints ──

@app.get("/")
async def serve_index():
    """Serve the main frontend."""
    index_path = STATIC_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Frontend not found")
    return FileResponse(str(index_path))


@app.get("/health")
async def health_check():
    """Health check endpoint for Cloud Run."""
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}


@app.post("/api/triage")
async def triage_text(request: TriageRequest):
    """Triage raw text using Gemini AI and return structured JSON."""

    # Check for API key
    client = get_gemini_client()
    if client is None:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key is not configured. Please set GEMINI_API_KEY in your environment.",
        )

    # Build the prompt with today's date
    today = datetime.now().strftime("%A, %B %d, %Y")
    system_instruction = SYSTEM_PROMPT.format(today=today)

    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=request.text,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.3,
                max_output_tokens=4096,
            ),
        )

        # Parse the response
        result = parse_gemini_response(response.text)

        # Validate structure — ensure all four keys exist
        default_structure = {"todos": [], "calendar_events": [], "drafts": [], "notes": []}
        for key in default_structure:
            if key not in result:
                result[key] = []

        return JSONResponse(content=result)

    except ValueError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to parse AI response: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini API error: {str(e)}",
        )


# Mount static files AFTER API routes to avoid route conflicts
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
