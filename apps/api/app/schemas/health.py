"""
Health Check Schemas
"""
from datetime import datetime, timezone
from typing import Dict, Optional
from pydantic import BaseModel, Field


class DatabaseHealth(BaseModel):
    status: str = Field(..., description="Database connection status: 'connected' or 'disconnected'")
    latency_ms: Optional[float] = Field(default=None, description="Database ping round-trip latency in ms")
    engine: str = Field(..., description="Database driver/dialect in use")


class SystemHealthResponse(BaseModel):
    status: str = Field(default="healthy", description="Overall health state: 'healthy', 'degraded', or 'unhealthy'")
    service: str = Field(default="NetVigil Compliance Auditor", description="Application service name")
    version: str = Field(default="0.1.0", description="Application semantic version")
    environment: str = Field(..., description="Active environment (development, staging, production)")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Server UTC timestamp")
    database: DatabaseHealth = Field(..., description="Database connectivity status")
    components: Dict[str, str] = Field(default_factory=dict, description="Status of auxiliary subsystems")
