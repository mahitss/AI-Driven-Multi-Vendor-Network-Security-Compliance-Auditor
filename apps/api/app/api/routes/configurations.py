"""
Configuration Management & Upload Routes
"""
from typing import List, Optional
from fastapi import APIRouter, File, Query, UploadFile, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import DatabaseDep
from app.core.errors import ResourceNotFoundError
from app.models.configuration import Configuration
from app.schemas.configuration import (
    ConfigurationDetailResponse,
    ConfigurationResponse,
    VendorDetectionRequest,
    VendorDetectionResult,
)
from app.services.ingestion.config_ingestion import ConfigurationIngestionService
from app.services.parsing.vendor_detector import VendorDetector

router = APIRouter(prefix="/configurations", tags=["Configurations"])


@router.post(
    "",
    response_model=ConfigurationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and ingest network configuration file",
)
async def upload_configuration(
    db: DatabaseDep,
    file: UploadFile = File(...),
) -> ConfigurationResponse:
    """
    Ingests a raw configuration file (.cfg, .conf, .txt, .log):
    - Validates file size and extension
    - Computes cryptographic SHA-256 hash
    - Persists file safely in isolated storage
    - Executes deterministic vendor detection
    - Returns configuration entity with detected vendor and confidence
    """
    content_bytes = await file.read()
    filename = file.filename or "unknown_config.cfg"

    config_record = await ConfigurationIngestionService.ingest_file(
        filename=filename,
        content_bytes=content_bytes,
        db=db,
    )
    return config_record


@router.get(
    "",
    response_model=List[ConfigurationResponse],
    summary="List all uploaded configurations",
)
async def list_configurations(
    db: DatabaseDep,
    vendor: Optional[str] = Query(None, description="Filter by detected vendor"),
    limit: int = Query(50, ge=1, le=200, description="Max items to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
) -> List[ConfigurationResponse]:
    """Retrieve list of ingested configurations with optional vendor filtering."""
    query = select(Configuration).order_by(desc(Configuration.created_at)).offset(offset).limit(limit)

    if vendor:
        query = query.where(Configuration.detected_vendor == vendor.lower())

    result = await db.execute(query)
    configs = result.scalars().all()
    return configs


@router.get(
    "/{config_id}",
    response_model=ConfigurationDetailResponse,
    summary="Get configuration details and raw text",
)
async def get_configuration(
    config_id: str,
    db: DatabaseDep,
) -> ConfigurationDetailResponse:
    """Fetch complete configuration record including full text content and detection details."""
    stmt = select(Configuration).where(Configuration.id == config_id)
    result = await db.execute(stmt)
    config = result.scalars().first()

    if not config:
        raise ResourceNotFoundError(resource="Configuration", identifier=config_id)

    return config


@router.post(
    "/detect-vendor",
    response_model=VendorDetectionResult,
    summary="Run deterministic vendor detection on raw text",
)
async def detect_vendor_from_text(
    payload: VendorDetectionRequest,
) -> VendorDetectionResult:
    """
    Analyzes raw configuration text and returns detected vendor, platform, confidence score,
    and matched signature patterns.
    """
    result = VendorDetector.detect(payload.content, filename=payload.filename)
    return result
