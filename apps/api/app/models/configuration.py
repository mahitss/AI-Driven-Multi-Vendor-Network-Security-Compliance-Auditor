"""
Configuration Domain Model
Stores uploaded raw network configs, cryptographic digests, storage paths, and vendor detection outcomes.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin, utc_now


class Configuration(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "configurations"

    device_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("devices.id", ondelete="SET NULL"), nullable=True, index=True
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    hash: Mapped[str] = mapped_column(String(64), index=True, unique=True, nullable=False)  # SHA-256

    raw_content: Mapped[str] = mapped_column(Text, nullable=False)

    # Vendor Detection Metadata
    detected_vendor: Mapped[str] = mapped_column(String(100), default="unknown", index=True, nullable=False)
    detected_platform: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    detection_confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    detection_method: Mapped[str] = mapped_column(String(50), default="signature", nullable=False)
    detection_details: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict, nullable=True)

    # Parsing & Lifecycle Status
    parser_status: Mapped[str] = mapped_column(String(50), default="pending", index=True, nullable=False)
    # Statuses: pending, parsed, failed, unparsed
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    # Analysis & Universal Normalization Data
    parser_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    parser_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    facts_extracted_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    unknown_items_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    normalized_profile: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=None, nullable=True)
    unknown_items: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, default=list, nullable=True)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    device: Mapped[Optional["Device"]] = relationship("Device", back_populates="configurations")
    audits: Mapped[List["Audit"]] = relationship(
        "Audit", back_populates="configuration", cascade="all, delete-orphan"
    )
