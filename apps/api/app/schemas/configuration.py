"""
Configuration & Vendor Detection API Schemas
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class VendorDetectionResult(BaseModel):
    vendor: str = Field(..., description="Detected vendor name: cisco, juniper, fortinet, unknown")
    platform: Optional[str] = Field(default=None, description="Detected OS/platform: ios, junos, fortios, etc.")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection confidence score (0.0 to 1.0)")
    method: str = Field(default="signature", description="Detection method: 'signature', 'heuristic', 'ai'")
    detected_patterns: List[str] = Field(
        default_factory=list, description="Key syntax patterns that contributed to signature match"
    )
    details: Dict[str, Any] = Field(
        default_factory=dict, description="Detailed vendor metadata extracted during detection"
    )


class VendorDetectionRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=10_485_760, description="Raw configuration text to detect")
    filename: Optional[str] = Field(default=None, max_length=255, description="Optional filename for heuristic guidance")


class ConfigurationResponse(BaseModel):
    id: str = Field(..., description="Unique configuration identifier (UUID)")
    filename: str = Field(..., description="Sanitized storage filename")
    original_filename: str = Field(..., description="Original client-provided filename")
    file_size_bytes: int = Field(..., description="Total size in bytes")
    hash: str = Field(..., description="Cryptographic SHA-256 digest")
    detected_vendor: str = Field(..., description="Detected vendor identity")
    detected_platform: Optional[str] = Field(default=None, description="Detected platform/OS")
    detection_confidence: float = Field(..., description="Detection confidence rating")
    detection_method: str = Field(..., description="Method used for vendor detection")
    parser_status: str = Field(..., description="Lifecycle parsing state")
    uploaded_at: datetime = Field(..., description="UTC timestamp of ingestion")

    class Config:
        from_attributes = True


class ConfigurationDetailResponse(ConfigurationResponse):
    raw_content: str = Field(..., description="Full text content of the network configuration")
    detection_details: Optional[Dict[str, Any]] = Field(default=None, description="Matched pattern diagnostics")
    device_id: Optional[str] = Field(default=None, description="Linked device inventory ID")

    class Config:
        from_attributes = True
