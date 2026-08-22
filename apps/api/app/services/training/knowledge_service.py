"""
Adaptive Knowledge Base Management Service
Problem Statement: SIH26155 (NTRO)

Authoritative lifecycle management for learned vendor syntax mappings, audit trails, and review queues.
"""
from datetime import datetime, timezone
import json
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import NetVigilException, ResourceNotFoundError, ValidationError
from app.models.training import TrainingAuditTrail, TrainingMapping
from app.services.training.allowlist import (
    is_property_allowlisted,
    validate_and_cast_property_value,
)


class KnowledgeService:
    """Authoritative management for persistent multi-vendor configuration knowledge mappings."""

    @classmethod
    async def get_approved_mappings(
        cls,
        db: AsyncSession,
        vendor: Optional[str] = None,
    ) -> List[TrainingMapping]:
        """Fetches all active APPROVED mappings for parser ingestion."""
        query = select(TrainingMapping).where(TrainingMapping.status == "APPROVED")
        if vendor:
            query = query.where(
                (TrainingMapping.vendor == vendor.lower()) | (TrainingMapping.vendor == "generic")
            )
        res = await db.execute(query)
        return res.scalars().all()

    @classmethod
    async def get_all_mappings(
        cls,
        db: AsyncSession,
        status_filter: Optional[str] = None,
        vendor: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[TrainingMapping]:
        """List mappings with multi-dimensional filtering."""
        query = select(TrainingMapping).order_by(desc(TrainingMapping.created_at)).offset(offset).limit(limit)

        if status_filter and status_filter.upper() != "ALL":
            query = query.where(TrainingMapping.status == status_filter.upper())
        if vendor and vendor.lower() != "all":
            query = query.where(TrainingMapping.vendor == vendor.lower())
        if category and category.lower() != "all":
            query = query.where(TrainingMapping.category == category)

        res = await db.execute(query)
        return res.scalars().all()

    @classmethod
    async def get_mapping_by_id(cls, mapping_id: str, db: AsyncSession) -> TrainingMapping:
        stmt = select(TrainingMapping).where(TrainingMapping.id == mapping_id)
        res = await db.execute(stmt)
        mapping = res.scalars().first()
        if not mapping:
            raise ResourceNotFoundError(resource="TrainingMapping", identifier=mapping_id)
        return mapping

    @classmethod
    async def create_mapping(
        cls,
        vendor: str,
        raw_pattern: str,
        candidate_property: str,
        candidate_value: Any,
        semantic_meaning: str,
        category: str = "remote_access",
        platform: Optional[str] = None,
        normalized_pattern: Optional[str] = None,
        confidence: float = 1.0,
        status: str = "APPROVED",
        source: str = "human_created",
        user_email: str = "admin@ntro.gov.in",
        db: Optional[AsyncSession] = None,
    ) -> TrainingMapping:
        """Creates and persists a validated training mapping."""
        # 1. Allowlist and Type Safety Validation
        is_valid, err_msg, cast_val = validate_and_cast_property_value(candidate_property, candidate_value)
        if not is_valid:
            raise ValidationError(message=err_msg, details={"property": candidate_property})

        mapping = TrainingMapping(
            vendor=vendor.lower().strip(),
            platform=platform.strip() if platform else None,
            raw_pattern=raw_pattern.strip(),
            normalized_pattern=normalized_pattern.strip() if normalized_pattern else None,
            normalized_control=candidate_property.strip(),
            semantic_meaning=semantic_meaning.strip(),
            candidate_property=candidate_property.strip(),
            candidate_value=json.dumps(cast_val),
            category=category.strip(),
            confidence=confidence,
            status=status.upper(),
            source=source,
            created_by_email=user_email,
            version=1,
            usage_count=0,
        )

        if db:
            db.add(mapping)
            await db.flush()

            # Record audit trail
            audit = TrainingAuditTrail(
                mapping_id=mapping.id,
                action="CREATED" if status == "APPROVED" else "PROPOSED",
                user_email=user_email,
                new_value={
                    "pattern": raw_pattern,
                    "property": candidate_property,
                    "value": cast_val,
                    "status": status,
                },
            )
            db.add(audit)
            await db.commit()
            await db.refresh(mapping)

        return mapping

    @classmethod
    async def approve_mapping(
        cls,
        mapping_id: str,
        db: AsyncSession,
        user_email: str = "admin@ntro.gov.in",
    ) -> TrainingMapping:
        """Approves a pending candidate mapping for active normalization use."""
        mapping = await cls.get_mapping_by_id(mapping_id, db)
        old_status = mapping.status

        mapping.status = "APPROVED"
        mapping.source = "human_approved" if mapping.source == "ai_suggested" else mapping.source

        audit = TrainingAuditTrail(
            mapping_id=mapping.id,
            action="APPROVED",
            user_email=user_email,
            old_value={"status": old_status},
            new_value={"status": "APPROVED"},
            reason="Administrator verified AI candidate mapping.",
        )
        db.add(audit)
        await db.commit()
        await db.refresh(mapping)
        return mapping

    @classmethod
    async def edit_mapping(
        cls,
        mapping_id: str,
        candidate_property: str,
        candidate_value: Any,
        semantic_meaning: str,
        category: str,
        normalized_pattern: Optional[str],
        db: AsyncSession,
        user_email: str = "admin@ntro.gov.in",
        reason: Optional[str] = None,
    ) -> TrainingMapping:
        """Edits and increments revision of an existing mapping."""
        mapping = await cls.get_mapping_by_id(mapping_id, db)

        # Allowlist safety validation
        is_valid, err_msg, cast_val = validate_and_cast_property_value(candidate_property, candidate_value)
        if not is_valid:
            raise ValidationError(message=err_msg, details={"property": candidate_property})

        old_state = {
            "property": mapping.candidate_property,
            "value": mapping.candidate_value,
            "category": mapping.category,
            "semantic_meaning": mapping.semantic_meaning,
            "version": mapping.version,
        }

        mapping.candidate_property = candidate_property.strip()
        mapping.normalized_control = candidate_property.strip()
        mapping.candidate_value = json.dumps(cast_val)
        mapping.semantic_meaning = semantic_meaning.strip()
        mapping.category = category.strip()
        if normalized_pattern is not None:
            mapping.normalized_pattern = normalized_pattern.strip()
        mapping.source = "human_corrected"
        mapping.status = "APPROVED"
        mapping.version += 1

        audit = TrainingAuditTrail(
            mapping_id=mapping.id,
            action="EDITED",
            user_email=user_email,
            old_value=old_state,
            new_value={
                "property": candidate_property,
                "value": cast_val,
                "category": category,
                "version": mapping.version,
            },
            reason=reason or "Human correction applied to candidate mapping.",
        )
        db.add(audit)
        await db.commit()
        await db.refresh(mapping)
        return mapping

    @classmethod
    async def reject_mapping(
        cls,
        mapping_id: str,
        db: AsyncSession,
        reason: Optional[str] = None,
        user_email: str = "admin@ntro.gov.in",
    ) -> TrainingMapping:
        """Marks a candidate mapping as REJECTED with optional rejection reason."""
        mapping = await cls.get_mapping_by_id(mapping_id, db)
        old_status = mapping.status

        mapping.status = "REJECTED"
        mapping.rejection_reason = reason or "Rejected by security administrator."

        audit = TrainingAuditTrail(
            mapping_id=mapping.id,
            action="REJECTED",
            user_email=user_email,
            old_value={"status": old_status},
            new_value={"status": "REJECTED", "rejection_reason": mapping.rejection_reason},
            reason=reason,
        )
        db.add(audit)
        await db.commit()
        await db.refresh(mapping)
        return mapping

    @classmethod
    async def toggle_mapping_status(
        cls,
        mapping_id: str,
        enable: bool,
        db: AsyncSession,
        user_email: str = "admin@ntro.gov.in",
    ) -> TrainingMapping:
        """Enables or disables an approved mapping."""
        mapping = await cls.get_mapping_by_id(mapping_id, db)
        old_status = mapping.status
        new_status = "APPROVED" if enable else "DISABLED"

        mapping.status = new_status

        audit = TrainingAuditTrail(
            mapping_id=mapping.id,
            action="RE_ENABLED" if enable else "DISABLED",
            user_email=user_email,
            old_value={"status": old_status},
            new_value={"status": new_status},
        )
        db.add(audit)
        await db.commit()
        await db.refresh(mapping)
        return mapping

    @classmethod
    async def record_mapping_usage(cls, mapping_id: str, db: AsyncSession) -> None:
        """Increments usage counter and updates last_used_at timestamp."""
        stmt = select(TrainingMapping).where(TrainingMapping.id == mapping_id)
        res = await db.execute(stmt)
        mapping = res.scalars().first()
        if mapping:
            mapping.usage_count += 1
            mapping.last_used_at = datetime.now(timezone.utc)
            await db.commit()

    @classmethod
    async def get_training_stats(cls, db: AsyncSession) -> Dict[str, Any]:
        """Calculates global adaptive training metrics."""
        pending_count = await db.scalar(
            select(func.count(TrainingMapping.id)).where(TrainingMapping.status == "PENDING")
        ) or 0
        approved_count = await db.scalar(
            select(func.count(TrainingMapping.id)).where(TrainingMapping.status == "APPROVED")
        ) or 0
        rejected_count = await db.scalar(
            select(func.count(TrainingMapping.id)).where(TrainingMapping.status == "REJECTED")
        ) or 0
        disabled_count = await db.scalar(
            select(func.count(TrainingMapping.id)).where(TrainingMapping.status == "DISABLED")
        ) or 0

        # Unique learned vendors
        vendors_res = await db.execute(
            select(TrainingMapping.vendor).where(TrainingMapping.status == "APPROVED").distinct()
        )
        learned_vendors = [v for v in vendors_res.scalars().all() if v != "generic"]

        return {
            "pending_count": pending_count,
            "approved_count": approved_count,
            "rejected_count": rejected_count,
            "disabled_count": disabled_count,
            "total_mappings": pending_count + approved_count + rejected_count + disabled_count,
            "vendors_learned_count": len(learned_vendors),
            "vendors_learned": learned_vendors,
        }
