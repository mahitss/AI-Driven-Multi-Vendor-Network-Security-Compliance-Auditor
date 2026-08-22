"""
Configuration Analysis & Normalization API Schemas
Problem Statement: SIH26155 (NTRO)
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.services.parser.models import NormalizedSecurityProfile, UnknownItem


class ConfigurationAnalysisSummaryResponse(BaseModel):
    configuration_id: str = Field(..., description="Configuration unique identifier (UUID)")
    filename: str = Field(..., description="Uploaded file name")
    vendor: str = Field(..., description="Detected vendor: cisco, juniper, fortinet")
    platform: Optional[str] = Field(default=None, description="Detected operating system/platform")
    status: str = Field(default="completed", description="Analysis execution state")
    facts_extracted: int = Field(..., description="Total deterministic security facts extracted")
    unknown_items_count: int = Field(..., description="Count of unparsed directives")
    parser_confidence: float = Field(..., description="Parser confidence rating")
    parser_name: str = Field(..., description="Parser implementation name")
    parser_version: str = Field(..., description="Parser implementation version")
    processed_at: datetime = Field(..., description="Timestamp of analysis completion")


class ConfigurationAnalysisDetailResponse(ConfigurationAnalysisSummaryResponse):
    normalized_profile: NormalizedSecurityProfile = Field(
        ..., description="Complete canonical universal security profile with evidence"
    )
    unknown_items: List[UnknownItem] = Field(
        default_factory=list, description="Preserved unparsed configuration directives for Adaptive Training"
    )
