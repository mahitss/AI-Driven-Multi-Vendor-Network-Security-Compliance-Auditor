"""
Configuration Re-Analysis & Training Impact Service
Problem Statement: SIH26155 (NTRO)

Re-parses configurations with newly approved knowledge mappings, re-evaluates deterministic
compliance rules, and computes before/after impact analytics.
"""
from datetime import datetime, timezone
import json
from typing import Any, Dict, List, Optional
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import ResourceNotFoundError
from app.models.audit import Audit
from app.models.configuration import Configuration
from app.models.finding import Finding
from app.services.compliance.service import ComplianceAuditService
from app.services.parser.registry import parser_registry
from app.services.training.knowledge_service import KnowledgeService
from app.services.training.matcher import enrich_profile_with_learned_mappings


class ReanalysisService:
    """Orchestrates configuration re-parsing and compliance re-audit after human training actions."""

    @classmethod
    async def reanalyze_configuration(
        cls,
        configuration_id: str,
        db: AsyncSession,
        frameworks: Optional[List[str]] = None,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        1. Fetches configuration and its latest audit results.
        2. Retrieves approved knowledge mappings.
        3. Re-parses configuration with knowledge enrichment.
        4. Re-executes multi-framework compliance audit.
        5. Computes before/after impact analytics.
        """
        # 1. Fetch configuration scoped to user if provided
        stmt = select(Configuration).where(Configuration.id == configuration_id)
        if user_id:
            stmt = stmt.where(Configuration.user_id == user_id)
        res = await db.execute(stmt)
        config = res.scalars().first()
        if not config:
            raise ResourceNotFoundError(resource="Configuration", identifier=configuration_id)

        # 2. Get latest prior audit for baseline comparison
        audit_stmt = (
            select(Audit)
            .where(Audit.configuration_id == configuration_id)
        )
        if user_id:
            audit_stmt = audit_stmt.where(Audit.user_id == user_id)
        audit_stmt = audit_stmt.order_by(desc(Audit.created_at)).limit(1)
        audit_res = await db.execute(audit_stmt)
        prior_audit = audit_res.scalars().first()

        prior_score = prior_audit.score if prior_audit and prior_audit.score is not None else 0.0
        prior_unknown_items_count = config.unknown_items_count or len(config.unknown_items or [])
        prior_findings: Dict[str, str] = {}

        if prior_audit:
            f_stmt = select(Finding).where(Finding.audit_id == prior_audit.id)
            if user_id:
                f_stmt = f_stmt.where(Finding.user_id == user_id)
            f_res = await db.execute(f_stmt)
            for f in f_res.scalars().all():
                prior_findings[f"{f.framework}:{f.control_id}"] = f.status

        # 3. Retrieve approved knowledge mappings
        approved_mappings = await KnowledgeService.get_approved_mappings(
            db=db, vendor=config.detected_vendor if config.detected_vendor != "unknown" else None
        )

        # 4. Re-parse raw configuration
        parser = parser_registry.get_parser(
            content=config.raw_content,
            vendor_hint=config.detected_vendor if config.detected_vendor != "unknown" else None,
            filename=config.original_filename,
        )
        fresh_profile = parser.parse(config.raw_content, filename=config.original_filename)

        # 5. Enrich profile with learned mappings
        enriched_profile = enrich_profile_with_learned_mappings(
            profile=fresh_profile, approved_mappings=approved_mappings
        )

        # Update configuration record in DB
        config.parser_status = "parsed"
        config.facts_extracted_count = enriched_profile.facts_extracted_count
        config.unknown_items_count = enriched_profile.unknown_items_count
        config.normalized_profile = enriched_profile.model_dump(mode="json")
        config.unknown_items = [u.model_dump(mode="json") for u in enriched_profile.unknown_items]
        config.processed_at = datetime.now(timezone.utc)
        await db.commit()

        # 6. Re-run compliance audit
        target_frameworks = frameworks or ["CIS", "NIST", "STIG", "ISO"]
        new_audit, score_summary, rule_results = await ComplianceAuditService.run_audit(
            configuration_id=configuration_id,
            frameworks=target_frameworks,
            db=db,
            user_id=user_id or config.user_id,
        )

        # 7. Compute Before/After Impact Delta
        new_score = new_audit.score if new_audit.score is not None else 0.0
        new_unknown_items_count = enriched_profile.unknown_items_count
        resolved_directives_count = max(0, prior_unknown_items_count - new_unknown_items_count)

        # Finding transitions (e.g. UNKNOWN -> PASS)
        finding_transitions = []
        for result in rule_results:
            key = f"{result.framework}:{result.rule_id}"
            old_st = prior_findings.get(key, "UNKNOWN")
            if old_st != result.status:
                finding_transitions.append({
                    "framework": result.framework,
                    "control_id": result.rule_id,
                    "title": result.title,
                    "previous_status": old_st,
                    "new_status": result.status,
                    "severity": result.severity,
                    "actual_value": result.actual_value,
                })

        # Track usage on matched mappings
        for m in approved_mappings:
            await KnowledgeService.record_mapping_usage(m.id, db)

        return {
            "configuration_id": configuration_id,
            "audit_id": new_audit.id,
            "previous_score": prior_score,
            "new_score": new_score,
            "score_delta": round(new_score - prior_score, 2),
            "previous_unknown_directives": prior_unknown_items_count,
            "new_unknown_directives": new_unknown_items_count,
            "resolved_directives_count": resolved_directives_count,
            "evaluated_controls_count": len(finding_transitions),
            "finding_transitions": finding_transitions,
            "mappings_applied_count": len(approved_mappings),
            "reanalyzed_at": datetime.now(timezone.utc).isoformat(),
        }
