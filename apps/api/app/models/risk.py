"""
Risk Intelligence Domain Model
Problem Statement: SIH26155 (NTRO)

Encapsulates prioritized, correlated security risks computed deterministically from compliance findings.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import DateTime, Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin, utc_now


class RiskItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "risk_items"

    audit_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("audits.id", ondelete="CASCADE"), nullable=False, index=True
    )
    device_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(100), index=True, default="Remote Administration", nullable=False)

    severity: Mapped[str] = mapped_column(String(50), index=True, default="HIGH", nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, default=75.0, index=True, nullable=False)  # 0 - 100
    priority: Mapped[str] = mapped_column(String(10), index=True, default="P1", nullable=False)  # P0, P1, P2, P3

    likelihood: Mapped[str] = mapped_column(String(50), default="HIGH", nullable=False)  # HIGH, MEDIUM, LOW
    impact: Mapped[str] = mapped_column(String(50), default="HIGH", nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW, UNKNOWN
    exposure: Mapped[str] = mapped_column(String(50), default="MANAGEMENT_PLANE", nullable=False)  # INTERNET_FACING, EXTERNAL, INTERNAL, MANAGEMENT_PLANE, LOCAL_ONLY, UNKNOWN

    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    finding_ids: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    affected_assets: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    evidence_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Status: OPEN, ACKNOWLEDGED, REMEDIATION_RECOMMENDED, REMEDIATED, ACCEPTED_RISK, FALSE_POSITIVE
    status: Mapped[str] = mapped_column(String(50), index=True, default="OPEN", nullable=False)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )
