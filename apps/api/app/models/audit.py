"""
Audit Execution Domain Model
Tracks compliance evaluation sessions, overall scores, and execution lifecycle.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import DateTime, Float, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin, utc_now


class Audit(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "audits"

    device_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("devices.id", ondelete="SET NULL"), nullable=True, index=True
    )
    configuration_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("configurations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(50), default="PENDING", index=True, nullable=False)
    # Status: PENDING, RUNNING, COMPLETED, FAILED
    score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    summary_stats: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict, nullable=True)

    # Relationships
    device: Mapped[Optional["Device"]] = relationship("Device", back_populates="audits")
    configuration: Mapped["Configuration"] = relationship("Configuration", back_populates="audits")
    findings: Mapped[List["Finding"]] = relationship(
        "Finding", back_populates="audit", cascade="all, delete-orphan"
    )
