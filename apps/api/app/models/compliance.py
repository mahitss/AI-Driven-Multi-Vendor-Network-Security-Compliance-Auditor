"""
Compliance Framework & Control Models
Represents security baselines (CIS, NIST, DISA STIG, ISO 27001) and granular controls.
"""
from typing import List, Optional
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin


class Framework(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "frameworks"

    name: Mapped[str] = mapped_column(String(100), index=True, nullable=False)  # CIS, NIST, STIG, ISO
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    controls: Mapped[List["Control"]] = relationship(
        "Control", back_populates="framework", cascade="all, delete-orphan"
    )


class Control(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "controls"

    framework_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("frameworks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    control_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)  # e.g., CIS-1.1.1
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String(50), default="MEDIUM", nullable=False)
    # Severity: CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL

    # Relationships
    framework: Mapped["Framework"] = relationship("Framework", back_populates="controls")
    findings: Mapped[List["Finding"]] = relationship(
        "Finding", back_populates="control", cascade="all, delete-orphan"
    )
