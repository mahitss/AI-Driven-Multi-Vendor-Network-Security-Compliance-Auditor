"""
Vendor-Specific Remediation Proposal Domain Model
Problem Statement: SIH26155 (NTRO)

Stores static-template generated vendor remediation proposals, diffs, warnings, and verification steps.
Strictly read-only & recommendation only — zero automatic command execution.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import Boolean, DateTime, Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin, utc_now


class RemediationProposal(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "remediation_proposals"

    user_id: Mapped[str] = mapped_column(String(64), default="default_tenant", index=True, nullable=False)
    audit_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("audits.id", ondelete="CASCADE"), nullable=False, index=True
    )
    finding_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("findings.id", ondelete="SET NULL"), nullable=True, index=True
    )
    risk_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("risk_items.id", ondelete="SET NULL"), nullable=True, index=True
    )

    vendor: Mapped[str] = mapped_column(String(100), index=True, nullable=False)  # cisco, juniper, fortinet
    platform: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    normalized_control: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)

    # Status: AVAILABLE, REVIEW_REQUIRED, REVIEWED, NOT_AVAILABLE
    status: Mapped[str] = mapped_column(String(50), index=True, default="AVAILABLE", nullable=False)

    remediation_commands: Mapped[str] = mapped_column(Text, nullable=False)
    rollback_commands: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    diff_preview: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict, nullable=True)

    why_recommended: Mapped[str] = mapped_column(Text, nullable=False)
    potential_impact: Mapped[str] = mapped_column(Text, nullable=False)
    verification_steps: Mapped[str] = mapped_column(Text, nullable=False)

    template_id: Mapped[str] = mapped_column(String(100), nullable=False)
    template_version: Mapped[str] = mapped_column(String(50), default="1.0.0", nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    is_reviewed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    reviewed_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )
