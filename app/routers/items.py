"""
Synapse — Items Router
CRUD operations and CSV export for triaged items.
"""

import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.item import TriagedItem

router = APIRouter(prefix="/api", tags=["items"])


# ── Schemas ──

class ItemUpdate(BaseModel):
    content: Optional[dict] = None
    status: Optional[str] = Field(None, pattern="^(active|completed)$")


# ── Endpoints ──

@router.get("/items")
async def get_items(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch all triaged items for the current user, grouped by category."""
    items = (
        db.query(TriagedItem)
        .filter(TriagedItem.user_id == current_user.id)
        .order_by(TriagedItem.created_at.desc())
        .all()
    )

    # Group by category → API response key
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


@router.put("/items/{item_id}")
async def update_item(
    item_id: int,
    update: ItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update an item's content or status."""
    item = (
        db.query(TriagedItem)
        .filter(TriagedItem.id == item_id, TriagedItem.user_id == current_user.id)
        .first()
    )

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if update.content is not None:
        item.content = update.content
    if update.status is not None:
        item.status = update.status

    db.commit()
    db.refresh(item)

    return JSONResponse(content=item.to_dict())


@router.delete("/items/{item_id}")
async def delete_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an item permanently."""
    item = (
        db.query(TriagedItem)
        .filter(TriagedItem.id == item_id, TriagedItem.user_id == current_user.id)
        .first()
    )

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(item)
    db.commit()

    return JSONResponse(content={"detail": "Item deleted", "id": item_id})


@router.get("/items/export")
async def export_items_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Export all active To-Dos and Notes as a CSV file."""
    items = (
        db.query(TriagedItem)
        .filter(
            TriagedItem.user_id == current_user.id,
            TriagedItem.status == "active",
            TriagedItem.category.in_(["todo", "note"]),
        )
        .order_by(TriagedItem.created_at.desc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Category", "Content", "Status", "Created At"])

    for item in items:
        content_str = ""
        if item.category == "todo":
            content_str = item.content.get("task", "")
            priority = item.content.get("priority", "")
            content_str = f"[{priority.upper()}] {content_str}"
        elif item.category == "note":
            content_str = item.content.get("content", "")

        writer.writerow([
            item.id,
            item.category,
            content_str,
            item.status,
            item.created_at.isoformat() if item.created_at else "",
        ])

    output.seek(0)
    filename = f"synapse_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
