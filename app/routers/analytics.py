"""
Synapse — Analytics & History Router
Dashboard statistics, triage history, and search endpoints.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.item import TriagedItem
from app.models.triage_session import TriageSession

router = APIRouter(prefix="/api", tags=["analytics"])


# ── Dashboard Stats ──

@router.get("/analytics/dashboard")
async def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get comprehensive dashboard statistics for the current user."""

    # Total items
    total_items = db.query(func.count(TriagedItem.id)).filter(
        TriagedItem.user_id == current_user.id
    ).scalar() or 0

    # Category breakdown
    category_counts = db.query(
        TriagedItem.category,
        func.count(TriagedItem.id)
    ).filter(
        TriagedItem.user_id == current_user.id
    ).group_by(TriagedItem.category).all()

    categories = {cat: count for cat, count in category_counts}

    # Todo completion rate
    total_todos = categories.get("todo", 0)
    completed_todos = db.query(func.count(TriagedItem.id)).filter(
        TriagedItem.user_id == current_user.id,
        TriagedItem.category == "todo",
        TriagedItem.status == "completed",
    ).scalar() or 0

    completion_rate = round((completed_todos / total_todos * 100), 1) if total_todos > 0 else 0

    # Total triage sessions
    total_sessions = db.query(func.count(TriageSession.id)).filter(
        TriageSession.user_id == current_user.id
    ).scalar() or 0

    # Activity over last 7 days
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    daily_activity = db.query(
        func.date(TriagedItem.created_at),
        func.count(TriagedItem.id)
    ).filter(
        TriagedItem.user_id == current_user.id,
        TriagedItem.created_at >= seven_days_ago,
    ).group_by(func.date(TriagedItem.created_at)).all()

    activity_map = {}
    for i in range(7):
        day = (datetime.now(timezone.utc) - timedelta(days=6 - i)).strftime("%Y-%m-%d")
        activity_map[day] = 0
    for date_val, count in daily_activity:
        date_str = str(date_val)
        if date_str in activity_map:
            activity_map[date_str] = count

    # Productivity score (weighted: completion rate 40%, consistency 30%, volume 30%)
    consistency_score = min(len([v for v in activity_map.values() if v > 0]) / 7 * 100, 100)
    volume_score = min(total_items / 50 * 100, 100)  # Cap at 50 items = 100%
    productivity_score = round(
        completion_rate * 0.4 + consistency_score * 0.3 + volume_score * 0.3, 1
    )

    return JSONResponse(content={
        "total_items": total_items,
        "total_sessions": total_sessions,
        "categories": {
            "todo": categories.get("todo", 0),
            "calendar": categories.get("calendar", 0),
            "draft": categories.get("draft", 0),
            "note": categories.get("note", 0),
        },
        "completion": {
            "total_todos": total_todos,
            "completed_todos": completed_todos,
            "rate": completion_rate,
        },
        "activity": activity_map,
        "productivity_score": productivity_score,
    })


# ── Triage History ──

@router.get("/history")
async def get_triage_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Get paginated triage session history."""
    sessions = (
        db.query(TriageSession)
        .filter(TriageSession.user_id == current_user.id)
        .order_by(TriageSession.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    total = db.query(func.count(TriageSession.id)).filter(
        TriageSession.user_id == current_user.id
    ).scalar() or 0

    return JSONResponse(content={
        "sessions": [s.to_dict() for s in sessions],
        "total": total,
        "limit": limit,
        "offset": offset,
    })


@router.delete("/history/{session_id}")
async def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a triage session from history."""
    session = (
        db.query(TriageSession)
        .filter(TriageSession.id == session_id, TriageSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    db.delete(session)
    db.commit()
    return JSONResponse(content={"detail": "Session deleted", "id": session_id})


# ── Search ──

@router.get("/search")
async def search_items(
    q: str = Query(..., min_length=1, max_length=200),
    category: str = Query(None),
    status: str = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Search across all triaged items by content (JSON text search)."""
    query = db.query(TriagedItem).filter(TriagedItem.user_id == current_user.id)

    if category:
        query = query.filter(TriagedItem.category == category)
    if status:
        query = query.filter(TriagedItem.status == status)

    # For SQLite, cast JSON content to text for searching
    from sqlalchemy import cast, String as SAString
    query = query.filter(
        cast(TriagedItem.content, SAString).ilike(f"%{q}%")
    )

    items = query.order_by(TriagedItem.created_at.desc()).limit(50).all()

    # Group results by category
    category_to_key = {
        "todo": "todos",
        "calendar": "calendar_events",
        "draft": "drafts",
        "note": "notes",
    }

    grouped = {"todos": [], "calendar_events": [], "drafts": [], "notes": []}
    for item in items:
        key = category_to_key.get(item.category, item.category)
        if key in grouped:
            grouped[key].append(item.to_dict())

    return JSONResponse(content=grouped)
