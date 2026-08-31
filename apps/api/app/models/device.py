"""
Device Domain Model
Represents network infrastructure elements (routers, switches, firewalls).
"""
from typing import Any, Dict, List, Optional
from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, UUIDMixin


class Device(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "devices"

    user_id: Mapped[str] = mapped_column(String(64), default="default_tenant", index=True, nullable=False)
    hostname: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    vendor: Mapped[str] = mapped_column(String(100), index=True, nullable=False)  # cisco, juniper, fortinet
    platform: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)   # ios, junos, fortios
    model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)      # catalyst-9300, srx-345, fortigate-60f
    serial_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    firmware_version: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    device_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default=dict, nullable=True)

    # Relationships
    configurations: Mapped[List["Configuration"]] = relationship(
        "Configuration", back_populates="device", cascade="all, delete-orphan"
    )
    audits: Mapped[List["Audit"]] = relationship(
        "Audit", back_populates="device", cascade="all, delete-orphan"
    )
