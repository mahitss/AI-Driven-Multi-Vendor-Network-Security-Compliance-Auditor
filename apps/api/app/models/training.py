"""
Adaptive Training & Knowledge Mapping Domain Models
Problem Statement: SIH26155 (NTRO)

Stores human-in-the-loop validated and learned semantic mappings from vendor-specific CLI
directives to canonical Universal Security Model properties.
"""
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin, utc_now


class TrainingMapping(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "training_mappings"

    vendor: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    platform: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    os_version_range: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    raw_pattern: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    normalized_pattern: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    normalized_control: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    semantic_meaning: Mapped[str] = mapped_column(Text, nullable=False)
    candidate_property: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    candidate_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON-encoded value
    category: Mapped[str] = mapped_column(String(100), index=True, default="remote_access", nullable=False)

    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    human_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    # Status: PENDING, APPROVED, REJECTED, DISABLED
    status: Mapped[str] = mapped_column(String(50), default="APPROVED", index=True, nullable=False)
    # Source: ai_suggested, human_created, human_corrected
    source: Mapped[str] = mapped_column(String(50), default="human_created", nullable=False)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_by_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    created_by_email: Mapped[Optional[str]] = mapped_column(String(255), default="admin@ntro.gov.in", nullable=True)

    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    usage_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )

    mapping_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict, nullable=True)

    # Relationships
    audit_trails: Mapped[list["TrainingAuditTrail"]] = relationship(
        "TrainingAuditTrail", back_populates="mapping", cascade="all, delete-orphan"
    )


class TrainingAuditTrail(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "training_audit_trails"

    mapping_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("training_mappings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Action: APPROVED, EDITED, REJECTED, DISABLED, RE_ENABLED
    action: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    user_email: Mapped[Optional[str]] = mapped_column(String(255), default="admin@ntro.gov.in", nullable=True)

    old_value: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    new_value: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    mapping: Mapped["TrainingMapping"] = relationship("TrainingMapping", back_populates="audit_trails")
