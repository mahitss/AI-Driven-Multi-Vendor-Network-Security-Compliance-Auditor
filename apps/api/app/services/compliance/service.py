"""
Compliance Audit Orchestration Service
Problem Statement: SIH26155 (NTRO)

Orchestrates multi-framework audit execution, score computation, and database persistence.
"""
from datetime import datetime, timezone
import json
from typing import List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.errors import NetVigilException, ResourceNotFoundError
from app.models.audit import Audit
from app.models.configuration import Configuration
from app.models.finding import Finding
from app.services.compliance.catalog import compliance_catalog
from app.services.compliance.evaluator import RuleEvaluator
from app.services.compliance.models import (
    AuditScoreSummary,
    RuleEvaluationResult,
)
from app.services.compliance.scorer import ComplianceScoringEngine
from app.services.parser.models import NormalizedSecurityProfile
from app.services.parser.registry import parser_registry


class ComplianceAuditService:
    """Orchestrates deterministic compliance audits across multiple frameworks."""

    @classmethod
    async def run_audit(
        cls,
        configuration_id: str,
        frameworks: Optional[List[str]],
        db: AsyncSession,
    ) -> Tuple[Audit, AuditScoreSummary, List[RuleEvaluationResult]]:
        """
        Executes a deterministic compliance audit against an ingested configuration.
        """
        # 1. Fetch configuration
        stmt = select(Configuration).where(Configuration.id == configuration_id)
        res = await db.execute(stmt)
        config = res.scalars().first()

        if not config:
            raise ResourceNotFoundError(resource="Configuration", identifier=configuration_id)

        # 2. Obtain NormalizedSecurityProfile
        if config.normalized_profile and config.parser_status == "parsed":
            profile = NormalizedSecurityProfile.model_validate(config.normalized_profile)
        else:
            # Parse on-the-fly
            parser = parser_registry.get_parser(
                content=config.raw_content,
                vendor_hint=config.detected_vendor if config.detected_vendor != "unknown" else None,
                filename=config.original_filename,
            )
            profile = parser.parse(config.raw_content, filename=config.original_filename)
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

        # 3. Determine target frameworks
        target_frameworks = [fw.upper() for fw in (frameworks or ["CIS", "NIST", "STIG", "ISO"])]

        # 4. Evaluate rules
        all_results: List[RuleEvaluationResult] = []
        for fw in target_frameworks:
            rules = compliance_catalog.get_rules_for_framework(fw)
            for rule in rules:
                eval_res = RuleEvaluator.evaluate_rule(rule=rule, profile=profile, framework=fw)
                all_results.append(eval_res)

        # 5. Create Audit DB Record
        audit_record = Audit(
            configuration_id=config.id,
            device_id=config.device_id,
            status="RUNNING",
            started_at=datetime.now(timezone.utc),
        )
        db.add(audit_record)
        await db.flush()  # Populates audit_record.id

        # 6. Calculate Scores
        summary = ComplianceScoringEngine.calculate_scores(
            audit_id=audit_record.id,
            configuration_id=config.id,
            results=all_results,
        )

        audit_record.score = summary.overall_score
        audit_record.status = "COMPLETED"
        audit_record.completed_at = datetime.now(timezone.utc)
        audit_record.summary_stats = summary.model_dump(mode="json")

        # 7. Persist Individual Finding Records
        for r in all_results:
            finding = Finding(
                audit_id=audit_record.id,
                framework=r.framework,
                control_id=r.control_id,
                category=r.category,
                status=r.status.value,
                severity=r.severity.value,
                title=r.title,
                description=r.explanation,
                evidence="\n".join(r.evidence) if r.evidence else None,
                expected_value=str(r.expected_value),
                actual_value=str(r.actual_value) if r.actual_value is not None else "None / Unconfigured",
                remediation=r.remediation,
                finding_metadata={
                    "rule_id": r.rule_id,
                    "source_lines": r.source_lines,
                    "evidence_list": r.evidence,
                    "source": r.source,
                    "confidence": r.confidence,
                },
            )
            db.add(finding)

        await db.commit()
        await db.refresh(audit_record)

        # Populate correlated risks and allowlisted remediations for the audit
        try:
            from app.services.risk.service import RiskIntelligenceService
            from app.services.remediation.service import RemediationService
            await RiskIntelligenceService.generate_audit_risks(audit_record.id, db)
            await RemediationService.generate_audit_remediations(audit_record.id, db)
        except Exception as e:
            logger.warning(f"Notice during post-audit risk/remediation generation: {e}")

        return audit_record, summary, all_results
