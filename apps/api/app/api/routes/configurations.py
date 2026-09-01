"""
Configuration Management, Upload & Analysis Routes
"""
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, File, Query, Response, UploadFile, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUserDep, DatabaseDep
from app.core.config import settings
from app.core.errors import FileSizeExceededError, ResourceNotFoundError
from app.models.configuration import Configuration
from app.schemas.analysis import (
    ConfigurationAnalysisDetailResponse,
    ConfigurationAnalysisSummaryResponse,
)
from app.schemas.configuration import (
    ConfigurationDetailResponse,
    ConfigurationResponse,
    VendorDetectionRequest,
    VendorDetectionResult,
)
from app.services.ingestion.config_ingestion import ConfigurationIngestionService
# Import vendor parsers to ensure registration in parser_registry
import app.services.parser.vendors
from app.services.parser.registry import parser_registry
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
    current_user: CurrentUserDep,
    file: UploadFile = File(...),
) -> ConfigurationResponse:
    """
    Ingests a raw configuration file (.cfg, .conf, .txt, .log) under authenticated user:
    - Enforces streaming max file size bounds before in-memory buffering
    - Validates file extension and content safety (rejects binaries/nulls/scripts)
    - Computes cryptographic SHA-256 hash
    - Persists file safely in isolated storage
    - Executes deterministic vendor detection
    - Returns configuration entity with detected vendor and confidence
    """
    chunk_size = 64 * 1024  # 64 KB chunks
    max_bytes = settings.max_file_size_bytes
    total_bytes = 0
    chunks: List[bytes] = []

    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > max_bytes:
            raise FileSizeExceededError(
                message=f"File size exceeds maximum limit of {settings.MAX_FILE_SIZE_MB}MB.",
                details={"max_bytes": max_bytes, "max_mb": settings.MAX_FILE_SIZE_MB},
            )
        chunks.append(chunk)

    content_bytes = b"".join(chunks)
    filename = file.filename or "unknown_config.cfg"

    config_record = await ConfigurationIngestionService.ingest_file(
        filename=filename,
        content_bytes=content_bytes,
        db=db,
        user_id=current_user.id,
    )
    return config_record


@router.get(
    "",
    response_model=List[ConfigurationResponse],
    summary="List all uploaded configurations",
)
async def list_configurations(
    db: DatabaseDep,
    current_user: CurrentUserDep,
    vendor: Optional[str] = Query(None, description="Filter by detected vendor"),
    limit: int = Query(50, ge=1, le=200, description="Max items to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
) -> List[ConfigurationResponse]:
    """Retrieve list of ingested configurations for authenticated user with optional vendor filtering."""
    query = (
        select(Configuration)
        .where(Configuration.user_id == current_user.id)
        .order_by(desc(Configuration.created_at))
        .offset(offset)
        .limit(limit)
    )

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
    current_user: CurrentUserDep,
) -> ConfigurationDetailResponse:
    """Fetch complete configuration record for current user including full text content."""
    stmt = select(Configuration).where(Configuration.id == config_id, Configuration.user_id == current_user.id)
    result = await db.execute(stmt)
    config = result.scalars().first()

    if not config:
        raise ResourceNotFoundError(resource="Configuration", identifier=config_id)

    return config


@router.get(
    "/{config_id}/export",
    summary="Export raw configuration file as a downloadable file attachment",
)
async def export_configuration_file(
    config_id: str,
    db: DatabaseDep,
    current_user: CurrentUserDep,
):
    """Returns raw configuration file with Content-Disposition: attachment for native browser download."""
    stmt = select(Configuration).where(Configuration.id == config_id, Configuration.user_id == current_user.id)
    cfg = (await db.execute(stmt)).scalars().first()
    if not cfg:
        raise ResourceNotFoundError(resource="Configuration", identifier=config_id)

    filename = cfg.original_filename or f"config_{config_id[:8]}.cfg"
    content = cfg.raw_content or ""

    return Response(
        content=content,
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.post(
    "/{config_id}/analyze",
    response_model=ConfigurationAnalysisDetailResponse,
    summary="Execute deterministic parsing and Universal Security Normalization",
)
async def analyze_configuration(
    config_id: str,
    db: DatabaseDep,
    current_user: CurrentUserDep,
) -> ConfigurationAnalysisDetailResponse:
    """
    Executes the Configuration Intelligence Pipeline:
    1. Loads configuration text
    2. Dynamically selects registered vendor parser
    3. Extracts security facts with source line evidence
    4. Identifies and preserves unparsed/unknown directives
    5. Normalizes facts into the Universal Security Model
    6. Persists normalized security profile and analysis metrics to database
    """
    stmt = select(Configuration).where(Configuration.id == config_id, Configuration.user_id == current_user.id)
    result = await db.execute(stmt)
    config = result.scalars().first()

    if not config:
        raise ResourceNotFoundError(resource="Configuration", identifier=config_id)

    # Dynamic parser selection
    parser = parser_registry.get_parser(
        content=config.raw_content,
        vendor_hint=config.detected_vendor if config.detected_vendor != "unknown" else None,
        filename=config.original_filename,
    )

    # Execute deterministic parsing & normalization
    profile = parser.parse(config.raw_content, filename=config.original_filename)

    # Persist results in DB
    config.parser_status = "parsed"
    config.parser_name = profile.parser_name
    config.parser_version = profile.parser_version
    config.facts_extracted_count = profile.facts_extracted_count
    config.unknown_items_count = profile.unknown_items_count
    config.normalized_profile = profile.model_dump(mode="json")
    config.unknown_items = [u.model_dump(mode="json") for u in profile.unknown_items]
    config.processed_at = datetime.now(timezone.utc)
    config.detected_vendor = profile.vendor
    if profile.platform:
        config.detected_platform = profile.platform

    await db.commit()
    await db.refresh(config)

    return ConfigurationAnalysisDetailResponse(
        configuration_id=config.id,
        filename=config.original_filename,
        vendor=profile.vendor,
        platform=profile.platform,
        status="completed",
        facts_extracted=profile.facts_extracted_count,
        unknown_items_count=profile.unknown_items_count,
        parser_confidence=profile.parser_confidence,
        parser_name=profile.parser_name,
        parser_version=profile.parser_version,
        processed_at=config.processed_at or datetime.now(timezone.utc),
        normalized_profile=profile,
        unknown_items=profile.unknown_items,
    )


@router.get(
    "/{config_id}/analysis",
    response_model=ConfigurationAnalysisDetailResponse,
    summary="Get existing Universal Security Normalization analysis",
)
async def get_configuration_analysis(
    config_id: str,
    db: DatabaseDep,
    current_user: CurrentUserDep,
) -> ConfigurationAnalysisDetailResponse:
    """Fetch cached or compute on-the-fly Universal Security Normalization profile."""
    stmt = select(Configuration).where(Configuration.id == config_id, Configuration.user_id == current_user.id)
    result = await db.execute(stmt)
    config = result.scalars().first()

    if not config:
        raise ResourceNotFoundError(resource="Configuration", identifier=config_id)

    # If already parsed, reconstruct response from saved profile
    if config.normalized_profile and config.parser_status == "parsed":
        from app.services.parser.models import NormalizedSecurityProfile, UnknownItem

        profile = NormalizedSecurityProfile.model_validate(config.normalized_profile)
        unknowns = [UnknownItem.model_validate(u) for u in (config.unknown_items or [])]

        return ConfigurationAnalysisDetailResponse(
            configuration_id=config.id,
            filename=config.original_filename,
            vendor=config.detected_vendor,
            platform=config.detected_platform,
            status="completed",
            facts_extracted=config.facts_extracted_count,
            unknown_items_count=config.unknown_items_count,
            parser_confidence=profile.parser_confidence,
            parser_name=config.parser_name or profile.parser_name,
            parser_version=config.parser_version or profile.parser_version,
            processed_at=config.processed_at or config.uploaded_at,
            normalized_profile=profile,
            unknown_items=unknowns,
        )

    # Otherwise compute analysis
    return await analyze_configuration(config_id=config_id, db=db, current_user=current_user)


@router.delete(
    "/{config_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a configuration and its associated audits",
)
async def delete_configuration(
    config_id: str,
    db: DatabaseDep,
    current_user: CurrentUserDep,
):
    """Deletes a configuration strictly owned by the authenticated user."""
    stmt = select(Configuration).where(Configuration.id == config_id, Configuration.user_id == current_user.id)
    config = (await db.execute(stmt)).scalars().first()
    if not config:
        raise ResourceNotFoundError(resource="Configuration", identifier=config_id)

    await db.delete(config)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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
