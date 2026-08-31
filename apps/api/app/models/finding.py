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

    user_id: Mapped[str] = mapped_column(String(64), default="default_tenant", index=True, nullable=False)
    audit_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("audits.id", ondelete="CASCADE"), nullable=False, index=True
    )
    framework: Mapped[str] = mapped_column(String(50), default="CIS", index=True, nullable=False)
    control_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String(100), index=True, nullable=True)
    status: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    # Status: PASS, FAIL, PARTIAL, NOT_APPLICABLE, UNKNOWN
    severity: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    # Severity: CRITICAL, HIGH, MEDIUM, LOW, INFO

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidence: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Raw configuration excerpt
    expected_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    actual_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    remediation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Vendor-specific CLI syntax
    finding_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict, nullable=True)

    # Relationships
    audit: Mapped["Audit"] = relationship("Audit", back_populates="findings")
