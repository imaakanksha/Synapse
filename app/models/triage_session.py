"""
Synapse — TriageSession Model
Stores raw input text and metadata for each triage session.
"""

from datetime import datetime, timezone

from sqlalchemy import Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TriageSession(Base):
    __tablename__ = "triage_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    item_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # Relationship back to user
    owner = relationship("User", back_populates="sessions")

    def __repr__(self):
        return f"<TriageSession(id={self.id}, items={self.item_count})>"

    def to_dict(self):
        """Serialize to dictionary for API responses."""
        return {
            "id": self.id,
            "raw_text": self.raw_text,
            "item_count": self.item_count,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
