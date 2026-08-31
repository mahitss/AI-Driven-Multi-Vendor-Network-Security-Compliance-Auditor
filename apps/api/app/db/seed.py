"""
NetVigil Idempotent Database Seed Service
Problem Statement: SIH26155 (NTRO)
Ensures full, authentic database records for Devices, Configurations, Audits,
Findings, Risks, Remediations, Training Mappings, and Reports on first launch.
"""
from pathlib import Path
from datetime import datetime, timezone
import json
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.models.configuration import Configuration
from app.core.auth import AuthenticatedUser
from app.models.device import Device
from app.models.audit import Audit
from app.models.finding import Finding
from app.models.risk import RiskItem
from app.models.remediation import RemediationProposal
from app.models.training import TrainingMapping
from app.api.routes.reports import GENERATED_REPORTS, generate_report, GenerateReportRequest
from app.services.ingestion.config_ingestion import ConfigurationIngestionService
from app.services.parser.registry import parser_registry
from app.services.compliance.service import ComplianceAuditService
from app.services.risk.service import RiskIntelligenceService
from app.services.remediation.service import RemediationService
import app.services.parser.vendors  # Register parsers

DEMO_FILENAMES = [
    "cisco-core-router.cfg",
    "juniper-edge-srx.conf",
    "fortinet-perimeter-fgt.conf",
]


async def clean_demo_records(db: AsyncSession) -> int:
    """
    Safely purges legacy automatic seed/demo fixtures from the database
    without touching any genuine user-uploaded configurations or audit records.
    """
    demo_configs_res = await db.execute(
        select(Configuration).where(Configuration.original_filename.in_(DEMO_FILENAMES))
    )
    demo_configs = list(demo_configs_res.scalars().all())
    if not demo_configs:
        return 0

    demo_config_ids = [c.id for c in demo_configs]
    logger.info(f"Cleaning up {len(demo_config_ids)} legacy demo seed configurations: {[c.original_filename for c in demo_configs]}")

    # Find all audit IDs associated with these demo configurations
    audits_res = await db.execute(
        select(Audit).where(Audit.configuration_id.in_(demo_config_ids))
    )
    demo_audits = list(audits_res.scalars().all())
    demo_audit_ids = [a.id for a in demo_audits]

    if demo_audit_ids:
        await db.execute(delete(RemediationProposal).where(RemediationProposal.audit_id.in_(demo_audit_ids)))
        await db.execute(delete(RiskItem).where(RiskItem.audit_id.in_(demo_audit_ids)))
        await db.execute(delete(Finding).where(Finding.audit_id.in_(demo_audit_ids)))
        await db.execute(delete(Audit).where(Audit.id.in_(demo_audit_ids)))

    await db.execute(delete(Configuration).where(Configuration.id.in_(demo_config_ids)))

    # Clean associated devices if no other configs belong to them
    demo_device_ids = [c.device_id for c in demo_configs if c.device_id]
    if demo_device_ids:
        for dev_id in set(demo_device_ids):
            other_cfgs = (await db.execute(
                select(func.count(Configuration.id)).where(Configuration.device_id == dev_id)
            )).scalar() or 0
            if other_cfgs == 0:
                await db.execute(delete(Device).where(Device.id == dev_id))

    await db.commit()
    logger.info("Legacy demo seed data removed successfully.")
    return len(demo_config_ids)


async def seed_database_if_empty(db: AsyncSession) -> None:
    """Idempotently seeds canonical multi-vendor demo fixtures and records if called."""
    current = Path(__file__).resolve()
    root_dir = current.parents[min(4, len(current.parents) - 1)]
    for p in current.parents:
        if (p / "data" / "demo").is_dir():
            root_dir = p
            break

    fixture_files = [
        ("cisco-core-router.cfg", root_dir / "data" / "demo" / "golden" / "cisco-core-router.cfg"),
        ("juniper-edge-srx.conf", root_dir / "data" / "demo" / "juniper" / "insecure-srx.conf"),
        ("fortinet-perimeter-fgt.conf", root_dir / "data" / "demo" / "fortinet" / "insecure-firewall.conf"),
    ]

    for filename, filepath in fixture_files:
        if not filepath.exists():
            logger.warning(f"Seed fixture not found at {filepath}, skipping...")
            continue

        existing = (await db.execute(
            select(Configuration).where(Configuration.original_filename == filename)
        )).scalars().first()

        if existing:
            audit_exists = (await db.execute(
                select(Audit).where(Audit.configuration_id == existing.id)
            )).scalars().first()
            if audit_exists:
                continue
            config = existing
        else:
            with open(filepath, "rb") as f:
                content_bytes = f.read()

            try:
                config = await ConfigurationIngestionService.ingest_file(
                    filename=filename,
                    content_bytes=content_bytes,
                    db=db,
                )
            except Exception as e:
                logger.error(f"Error ingesting seed fixture {filename}: {e}")
                continue

        try:
            # 2. Parse & Extract Facts
            parser = parser_registry.get_parser(
                content=config.raw_content,
                vendor_hint=config.detected_vendor,
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
            await db.commit()
            await db.refresh(config)

            # 3. Execute Compliance Audit
            audit, summary, results = await ComplianceAuditService.run_audit(
                configuration_id=config.id,
                frameworks=["CIS", "NIST", "STIG", "ISO"],
                db=db,
            )

            # 4. Generate Risk Intelligence & Graph
            await RiskIntelligenceService.generate_audit_risks(audit.id, db)

            # 5. Generate Remediation Proposals
            await RemediationService.generate_audit_remediations(audit.id, db)

            logger.info(f"Successfully seeded and audited {filename} (Vendor: {config.detected_vendor.upper()})")
        except Exception as e:
            logger.error(f"Error seeding fixture {filename}: {e}", exc_info=True)

    # 6. Seed Initial Report if empty
    if len(GENERATED_REPORTS) == 0:
        first_audit = (await db.execute(select(Audit).order_by(Audit.created_at))).scalars().first()
        if first_audit:
            try:
                await generate_report(
                    payload=GenerateReportRequest(
                        report_type="EXECUTIVE_AUDIT_SUMMARY",
                        audit_id=first_audit.id,
                        title="NTRO Core Perimeter Baseline Compliance Assessment",
                        notes="Automated executive summary evaluating CIS, NIST, DISA STIG, and ISO controls.",
                    ),
                    db=db,
                    current_user=AuthenticatedUser(id="default_tenant", email="auditor@netvigil.local"),
                )
                logger.info("Successfully generated initial executive compliance report.")
            except Exception as e:
                logger.warning(f"Notice on seeding initial report: {e}")

    # 7. Seed Training Mappings if empty
    training_count = (await db.execute(select(func.count(TrainingMapping.id)))).scalar() or 0
    if training_count == 0:
        logger.info("Seeding initial adaptive training knowledge mappings...")
        now = datetime.now(timezone.utc)
        import json
        sample_mappings = [
            TrainingMapping(
                vendor="cisco",
                platform="ios",
                raw_pattern="ip ssh time-out 60",
                normalized_pattern="ip ssh time-out <seconds>",
                normalized_control="remote_access.inactivity_timeout_minutes",
                candidate_property="remote_access.inactivity_timeout_minutes",
                candidate_value=json.dumps(1),
                semantic_meaning="Configures SSH management session idle timeout to 60 seconds (1 minute)",
                category="remote_access",
                confidence=0.92,
                status="APPROVED",
                source="learned",
                usage_count=4,
                last_used_at=now,
            ),
            TrainingMapping(
                vendor="juniper",
                platform="junos",
                raw_pattern="set system services ssh protocol-version v2",
                normalized_pattern="set system services ssh protocol-version <version>",
                normalized_control="remote_access.ssh_version",
                candidate_property="remote_access.ssh_version",
                candidate_value=json.dumps(2),
                semantic_meaning="Enforces SSH protocol version 2 only on JunOS management plane",
                category="remote_access",
                confidence=0.98,
                status="APPROVED",
                source="learned",
                usage_count=7,
                last_used_at=now,
            ),
            TrainingMapping(
                vendor="fortinet",
                platform="fortios",
                raw_pattern="set admin-lockout-duration 300",
                normalized_pattern="set admin-lockout-duration <seconds>",
                normalized_control="authentication.failed_login_lockout_enabled",
                candidate_property="authentication.failed_login_lockout_enabled",
                candidate_value=json.dumps(True),
                semantic_meaning="Enforces administrator lockout duration of 300 seconds following failed attempts",
                category="authentication",
                confidence=0.89,
                status="PENDING",
                source="ai_suggested",
                usage_count=1,
                last_used_at=now,
            ),
            TrainingMapping(
                vendor="cisco",
                platform="ios",
                raw_pattern="service tcp-keepalives-in",
                normalized_pattern="service tcp-keepalives-in",
                normalized_control="services.tcp_keepalives_inbound",
                candidate_property="services.tcp_keepalives_inbound",
                candidate_value=json.dumps(True),
                semantic_meaning="Enables TCP keepalive packets on incoming terminal sessions to detect orphaned connections",
                category="services",
                confidence=0.85,
                status="PENDING",
                source="ai_suggested",
                usage_count=0,
            ),
        ]
        db.add_all(sample_mappings)
        await db.commit()
        logger.info("Adaptive training knowledge base seeded successfully.")

