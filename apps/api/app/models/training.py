"""
Adaptive Training Mapping Domain Model
Stores human-in-the-loop and learned semantic mappings from vendor-specific CLI to universal controls.
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin, UUIDMixin, utc_now


class TrainingMapping(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "training_mappings"

    vendor: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    platform: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    raw_pattern: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_control: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    semantic_meaning: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    human_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )
