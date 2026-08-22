"""
NetVigil Demo Dataset & Environment Seeder
Problem Statement: SIH26155 (NTRO)

Usage:
    python seed_demo.py
"""
import asyncio
import os
import sys
from pathlib import Path

# Set PYTHONPATH to apps/api
sys.path.insert(0, str(Path(__file__).parent / "apps" / "api"))

from app.db.session import AsyncSessionLocal, async_engine
from app.models.base import Base
from app.services.ingestion.config_ingestion import ConfigurationIngestionService
from app.services.compliance.service import ComplianceAuditService
from app.services.risk.service import RiskIntelligenceService
from app.services.remediation.service import RemediationService
from datetime import datetime, timezone
import app.services.parser.vendors
from app.services.parser.registry import parser_registry

DEMO_DIR = Path(__file__).parent / "data" / "demo"


async def seed():
    print("=" * 60)
    print("NetVigil (SIH26155 - NTRO) Demo Environment Seeder")
    print("=" * 60)

    # 1. Initialize DB Schema
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[+] Database schema initialized.")

    demo_files = [
        DEMO_DIR / "cisco" / "insecure-router.cfg",
        DEMO_DIR / "cisco" / "secure-router.cfg",
        DEMO_DIR / "cisco" / "mixed-router.cfg",
        DEMO_DIR / "cisco" / "unknown-directive-router.cfg",
        DEMO_DIR / "juniper" / "insecure-srx.conf",
        DEMO_DIR / "juniper" / "secure-srx.conf",
        DEMO_DIR / "fortinet" / "insecure-firewall.conf",
        DEMO_DIR / "fortinet" / "secure-firewall.conf",
    ]

    async with AsyncSessionLocal() as db:
        for file_path in demo_files:
            if not file_path.exists():
                print(f"[-] Skipping missing file: {file_path}")
                continue

            filename = file_path.name
            with open(file_path, "rb") as f:
                content_bytes = f.read()

            print(f"[*] Ingesting {filename}...")
            config_record = await ConfigurationIngestionService.ingest_file(
                filename=filename,
                content_bytes=content_bytes,
                db=db,
            )

            # Parse & Normalize
            print(f"    - Parsing & Universal Normalization...")
            parser = parser_registry.get_parser(
                content=config_record.raw_content,
                vendor_hint=config_record.detected_vendor if config_record.detected_vendor != "unknown" else None,
                filename=config_record.original_filename,
            )
            profile = parser.parse(config_record.raw_content, filename=config_record.original_filename)

            config_record.parser_status = "parsed"
            config_record.parser_name = profile.parser_name
            config_record.parser_version = profile.parser_version
            config_record.facts_extracted_count = profile.facts_extracted_count
            config_record.unknown_items_count = profile.unknown_items_count
            config_record.normalized_profile = profile.model_dump(mode="json")
            config_record.unknown_items = [u.model_dump(mode="json") for u in profile.unknown_items]
            config_record.processed_at = datetime.now(timezone.utc)
            config_record.detected_vendor = profile.vendor
            if profile.platform:
                config_record.detected_platform = profile.platform

            await db.commit()
            await db.refresh(config_record)

            # Run Multi-Framework Compliance Audit
            print(f"    - Running Compliance Audit (CIS, NIST, STIG, ISO)...")
            audit, summary, results = await ComplianceAuditService.run_audit(
                configuration_id=config_record.id,
                frameworks=["CIS", "NIST", "STIG", "ISO"],
                db=db,
            )

            # Generate Prioritized Risk Intelligence & Relationship Graph
            print(f"    - Computing Prioritized Risk Intelligence...")
            risks = await RiskIntelligenceService.generate_audit_risks(audit.id, db)

            # Generate Vendor-Specific Allowlisted Remediation Proposals
            print(f"    - Synthesizing Vendor Remediation Proposals & Diffs...")
            remediations = await RemediationService.generate_audit_remediations(audit.id, db)

            print(
                f"[+] {filename} Ready -> Score: {audit.score}% | Risks: {len(risks)} | Remediations: {len(remediations)}"
            )

    print("=" * 60)
    print("[+] All Demo Datasets Successfully Seeded into NetVigil!")
    print("[+] Launch the Frontend at http://localhost:3000 to begin demo.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed())
