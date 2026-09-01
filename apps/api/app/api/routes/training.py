"""
Adaptive Training & Knowledge Base API Routes
Problem Statement: SIH26155 (NTRO)
"""
import json
from typing import List, Optional
from fastapi import APIRouter, Query, status
from sqlalchemy import select
from app.api.dependencies import CurrentUserDep, DatabaseDep
from app.core.errors import ResourceNotFoundError
from app.models.configuration import Configuration
from app.schemas.training import (
    AllowlistPropertyResponse,
    ApproveMappingRequest,
    CreateMappingRequest,
    EditMappingRequest,
    RejectMappingRequest,
    TrainingAuditTrailResponse,
    TrainingImpactResponse,
    TrainingMappingResponse,
    TrainingStatsResponse,
)
from app.services.training.allowlist import get_allowlist_metadata
from app.services.training.knowledge_service import KnowledgeService
from app.services.training.reanalysis_service import ReanalysisService

router = APIRouter(prefix="/training", tags=["Adaptive Training & Knowledge"])


def _to_mapping_response(m) -> TrainingMappingResponse:
    val = json.loads(m.candidate_value) if m.candidate_value else None
    return TrainingMappingResponse(
        id=m.id,
        vendor=m.vendor,
        platform=m.platform,
        raw_pattern=m.raw_pattern,
        normalized_pattern=m.normalized_pattern,
        candidate_property=m.candidate_property,
        candidate_value=val,
        semantic_meaning=m.semantic_meaning,
        category=m.category,
        confidence=m.confidence,
        status=m.status,
        source=m.source,
        rejection_reason=m.rejection_reason,
        created_by_email=m.created_by_email,
        version=m.version,
        usage_count=m.usage_count,
        last_used_at=m.last_used_at,
        created_at=m.created_at,
        updated_at=m.updated_at,
    )


@router.get("/pending", response_model=List[TrainingMappingResponse])
async def get_pending_reviews(
    db: DatabaseDep,
    vendor: Optional[str] = Query(default=None),
):
    """Retrieves all pending candidate mappings awaiting human administrator review."""
    mappings = await KnowledgeService.get_all_mappings(db=db, status_filter="PENDING", vendor=vendor)
    return [_to_mapping_response(m) for m in mappings]


@router.get("/mappings", response_model=List[TrainingMappingResponse])
async def list_knowledge_mappings(
    db: DatabaseDep,
    status: Optional[str] = Query(default=None),
    vendor: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
):
    """Lists persistent multi-vendor configuration knowledge mappings with filtering."""
    mappings = await KnowledgeService.get_all_mappings(
        db=db,
        status_filter=status,
        vendor=vendor,
        category=category,
        limit=limit,
        offset=offset,
    )
    return [_to_mapping_response(m) for m in mappings]


@router.get("/mappings/{mapping_id}", response_model=TrainingMappingResponse)
async def get_knowledge_mapping(
    mapping_id: str,
    db: DatabaseDep,
):
    """Retrieves single training mapping by ID."""
    m = await KnowledgeService.get_mapping_by_id(mapping_id, db)
    return _to_mapping_response(m)


@router.post("/mappings", response_model=TrainingMappingResponse, status_code=status.HTTP_201_CREATED)
async def create_knowledge_mapping(
    payload: CreateMappingRequest,
    db: DatabaseDep,
):
    """Creates a new knowledge mapping with strict allowlist safety validation."""
    m = await KnowledgeService.create_mapping(
        vendor=payload.vendor,
        raw_pattern=payload.raw_pattern,
        candidate_property=payload.candidate_property,
        candidate_value=payload.candidate_value,
        semantic_meaning=payload.semantic_meaning,
        category=payload.category,
        platform=payload.platform,
        normalized_pattern=payload.normalized_pattern,
        confidence=payload.confidence,
        status=payload.status,
        source="human_created",
        db=db,
    )
    return _to_mapping_response(m)


@router.post("/mappings/{mapping_id}/approve", response_model=TrainingMappingResponse)
async def approve_candidate_mapping(
    mapping_id: str,
    db: DatabaseDep,
    payload: ApproveMappingRequest = ApproveMappingRequest(),
):
    """Human administrator approves a pending AI suggestion into active trusted knowledge."""
    m = await KnowledgeService.approve_mapping(
        mapping_id=mapping_id,
        db=db,
        user_email=payload.user_email or "admin@ntro.gov.in",
    )
    return _to_mapping_response(m)


@router.post("/mappings/{mapping_id}/edit", response_model=TrainingMappingResponse)
async def edit_and_approve_mapping(
    mapping_id: str,
    payload: EditMappingRequest,
    db: DatabaseDep,
):
    """Human administrator corrects an AI candidate mapping and approves it (increments version)."""
    m = await KnowledgeService.edit_mapping(
        mapping_id=mapping_id,
        candidate_property=payload.candidate_property,
        candidate_value=payload.candidate_value,
        semantic_meaning=payload.semantic_meaning,
        category=payload.category,
        normalized_pattern=payload.normalized_pattern,
        reason=payload.reason,
        user_email=payload.user_email or "admin@ntro.gov.in",
        db=db,
    )
    return _to_mapping_response(m)


@router.post("/mappings/{mapping_id}/reject", response_model=TrainingMappingResponse)
async def reject_candidate_mapping(
    mapping_id: str,
    db: DatabaseDep,
    payload: RejectMappingRequest = RejectMappingRequest(),
):
    """Human administrator rejects an invalid candidate mapping."""
    m = await KnowledgeService.reject_mapping(
        mapping_id=mapping_id,
        db=db,
        reason=payload.reason,
        user_email=payload.user_email or "admin@ntro.gov.in",
    )
    return _to_mapping_response(m)


@router.post("/mappings/{mapping_id}/disable", response_model=TrainingMappingResponse)
async def disable_knowledge_mapping(
    mapping_id: str,
    db: DatabaseDep,
):
    """Disables an approved mapping from active normalization use."""
    m = await KnowledgeService.toggle_mapping_status(
        mapping_id=mapping_id,
        enable=False,
        db=db,
    )
    return _to_mapping_response(m)


@router.post("/mappings/{mapping_id}/re-enable", response_model=TrainingMappingResponse)
async def re_enable_knowledge_mapping(
    mapping_id: str,
    db: DatabaseDep,
):
    """Re-enables a disabled knowledge mapping."""
    m = await KnowledgeService.toggle_mapping_status(
        mapping_id=mapping_id,
        enable=True,
        db=db,
    )
    return _to_mapping_response(m)


from app.api.dependencies import CurrentUserDep, DatabaseDep

@router.post("/reanalyze/{configuration_id}", response_model=TrainingImpactResponse)
async def reanalyze_configuration(
    configuration_id: str,
    db: DatabaseDep,
    current_user: CurrentUserDep,
    frameworks: Optional[List[str]] = Query(default=None),
):
    """Re-evaluates a configuration with approved training mappings and returns Before/After impact for current user."""
    stmt = select(Configuration).where(Configuration.id == configuration_id, Configuration.user_id == current_user.id)
    config = (await db.execute(stmt)).scalars().first()
    if not config:
        raise ResourceNotFoundError(resource="Configuration", identifier=configuration_id)

    impact = await ReanalysisService.reanalyze_configuration(
        configuration_id=configuration_id,
        db=db,
        frameworks=frameworks,
        user_id=current_user.id,
    )
    return TrainingImpactResponse(**impact)


@router.get("/stats", response_model=TrainingStatsResponse)
async def get_adaptive_training_stats(
    db: DatabaseDep,
):
    """Calculates global adaptive training statistics."""
    stats = await KnowledgeService.get_training_stats(db)
    return TrainingStatsResponse(**stats)


@router.get("/allowlist", response_model=List[AllowlistPropertyResponse])
async def get_allowlist_catalog():
    """Returns the safety allowlist of normalized security property paths."""
    return [AllowlistPropertyResponse(**item) for item in get_allowlist_metadata()]
