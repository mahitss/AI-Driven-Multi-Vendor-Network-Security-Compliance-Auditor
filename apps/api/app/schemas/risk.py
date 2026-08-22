"""
Risk Intelligence Pydantic Schemas
Problem Statement: SIH26155 (NTRO)
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class RiskItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    audit_id: str
    device_id: Optional[str] = None
    title: str
    description: str
    category: str
    severity: str
    risk_score: float
    priority: str
    likelihood: str
    impact: str
    exposure: str
    confidence: float
    finding_ids: List[str]
    affected_assets: List[str]
    evidence_summary: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime


class RiskGraphResponse(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    summary: Dict[str, Any]


class RiskSummaryStatsResponse(BaseModel):
    total_risks: int
    p0_count: int
    p1_count: int
    p2_count: int
    p3_count: int
    average_risk_score: float
