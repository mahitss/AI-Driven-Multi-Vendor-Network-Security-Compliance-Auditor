"""
Evidence-Based Compliance Finding Domain Model
Captures deterministic proof, expected vs actual values, and vendor remediation commands.
"""
from typing import Any, Dict, Optional
from sqlalchemy import ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin


class Finding(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "findings"

    audit_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("audits.id", ondelete="CASCADE"), nullable=False, index=True
    )
    control_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("controls.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    # Status: PASS, FAIL, MANUAL_REVIEW, NOT_APPLICABLE
    severity: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    # Severity: CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidence: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Raw configuration excerpt
    expected_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    actual_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    remediation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Vendor-specific CLI syntax
    finding_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict, nullable=True)

    # Relationships
    audit: Mapped["Audit"] = relationship("Audit", back_populates="findings")
    control: Mapped["Control"] = relationship("Control", back_populates="findings")
