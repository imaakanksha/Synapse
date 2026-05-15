"""
Synapse — TriagedItem Model
SQLAlchemy ORM model for AI-triaged items.
"""

from datetime import datetime, timezone

from sqlalchemy import Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TriagedItem(Base):
    __tablename__ = "triaged_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    content: Mapped[dict] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # Relationship back to user
    owner = relationship("User", back_populates="items")

    def __repr__(self):
        return f"<TriagedItem(id={self.id}, category='{self.category}', status='{self.status}')>"

    def to_dict(self):
        """Serialize to dictionary for API responses."""
        return {
            "id": self.id,
            "category": self.category,
            "content": self.content,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
