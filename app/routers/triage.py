"""
Synapse — Triage Router
AI-powered text triage endpoint with database persistence.
"""

import os
import json
import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from google import genai

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.item import TriagedItem
from app.models.triage_session import TriageSession

router = APIRouter(prefix="/api", tags=["triage"])


# ── Request Schema ──

class TriageRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Raw text to triage")


# ── Enhanced System Prompt with ISO 8601 dates ──

SYSTEM_PROMPT = """You are Synapse, an intelligent text triage assistant. Your job is to analyze raw, unstructured text (a "brain dump") and categorize it into four structured categories.

Today's date and time is: {today}

You MUST respond with ONLY a valid JSON object — no markdown fences, no explanation, no extra text. The JSON must have exactly these four keys:

{{
  "todos": [
    {{ "task": "description of the task", "priority": "high|medium|low" }}
  ],
  "calendar_events": [
    {{ "title": "event name", "date": "YYYY-MM-DDTHH:MM:SS ISO 8601 format", "time": "HH:MM in 24h format or empty string" }}
  ],
  "drafts": [
    {{ "recipient": "person or group name", "subject": "email/message subject", "body": "drafted message content" }}
  ],
  "notes": [
    {{ "content": "the idea or note, you may use **bold** and *italic* markdown" }}
  ]
}}

Rules:
1. Every piece of information from the input MUST be categorized into exactly one category.
2. For calendar_events, ALWAYS infer and output concrete ISO 8601 dates and times. Convert relative references:
   - "tomorrow" → the next day's date
   - "next Monday" → the actual date of next Monday
   - "at 3pm" → T15:00:00
   - If no time is specified, use T09:00:00 as default
3. For drafts, write a professional, concise draft ready to send.
4. For todos, assign priority based on urgency/importance signals in the text.
5. For notes, capture ideas, reminders, and thoughts that don't fit the other categories. You may use light markdown formatting.
6. If a category has no items, return an empty array for that key.
7. Output ONLY the JSON object. No other text."""


# ── Gemini Client ──

def get_gemini_client():
    """Get or create the Gemini client."""
    api_key = settings.GEMINI_API_KEY
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


# ── Category mapping for DB storage ──

CATEGORY_MAP = {
    "todos": "todo",
    "calendar_events": "calendar",
    "drafts": "draft",
    "notes": "note",
}


# ── Endpoint ──

@router.post("/triage")
async def triage_text(
    request: TriageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Triage raw text using Gemini AI, persist results, and return structured JSON."""

    # Check for API key
    client = get_gemini_client()
    if client is None:
        raise HTTPException(
            status_code=503,
            detail="Gemini API key is not configured. Please set GEMINI_API_KEY in your environment.",
        )

    # Build the prompt with today's date
    today = datetime.now().strftime("%A, %B %d, %Y at %H:%M")
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

        # Persist each item to the database
        saved_items = {"todos": [], "calendar_events": [], "drafts": [], "notes": []}
        total_item_count = 0

        for category_key, items in result.items():
            db_category = CATEGORY_MAP.get(category_key, category_key)
            for item_data in items:
                db_item = TriagedItem(
                    user_id=current_user.id,
                    category=db_category,
                    content=item_data,
                    status="active",
                )
                db.add(db_item)
                db.flush()  # Get the ID without committing
                total_item_count += 1

                saved_item = db_item.to_dict()
                saved_items[category_key].append(saved_item)

        # Save triage session for history
        session_record = TriageSession(
            user_id=current_user.id,
            raw_text=request.text,
            item_count=total_item_count,
        )
        db.add(session_record)

        db.commit()

        return JSONResponse(content=saved_items)

    except ValueError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to parse AI response: {str(e)}",
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=502,
            detail=f"Gemini API error: {str(e)}",
        )
