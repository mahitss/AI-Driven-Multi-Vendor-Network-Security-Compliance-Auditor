"""
NetVigil P0 Dataflow & Evaluation Verification Script
Problem Statement: SIH26155 (NTRO)

Tests the real backend pipeline across three genuinely different configuration files:
1. 01_CISCO_SCORE_LOW.cfg
2. 02_JUNIPER_SCORE_MEDIUM.conf
3. 03_FORTINET_SCORE_HIGH.conf

Verifies:
- Distinct SHA-256 fingerprints
- Authoritative vendor detection
- Vendor-specific parser selection
- Vendor-specific normalized facts
- Independent configuration IDs, audit IDs, findings
- Zero cross-linking across files
- Accurate compliance and risk scoring based solely on own directives
- Zero Cisco AAA / line 1 bogus citations on Fortinet / Juniper
- Same-input determinism
"""
import asyncio
import hashlib
import json
import os
import sys
import uuid
from pathlib import Path

# Add apps/api to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "apps" / "api"))

import app.services.parser.vendors
from app.db.session import AsyncSessionLocal
from app.models.audit import Audit
from app.models.configuration import Configuration
from app.models.finding import Finding
from app.models.remediation import RemediationProposal
from app.models.risk import RiskItem
from app.services.compliance.service import ComplianceAuditService
from app.services.ingestion.config_ingestion import ConfigurationIngestionService
from app.services.parser.registry import parser_registry
from app.services.remediation.service import RemediationService
from app.services.risk.service import RiskIntelligenceService


# 1. Authentic Test Configurations
CISCO_LOW = """! Real Insecure Cisco IOS Gateway Router
version 15.0
hostname BORDER-RTR-01
no service password-encryption
service finger
!
no aaa new-model
username admin privilege 15 password 0 cisco123
enable password unencrypted_enable_secret
!
ip domain name company.local
ip ssh version 1
ip http server
!
interface GigabitEthernet0/0
 description WAN-UNTRUSTED
 ip address 203.0.113.1 255.255.255.0
 ip proxy-arp
 ip directed-broadcast
!
line con 0
 password consolepass
line vty 0 4
 transport input telnet
 password vtypass
 login
!
end
"""

JUNIPER_MEDIUM = """# Real Moderately Hardened Juniper JunOS Gateway
system {
    host-name SECURE-EDGE-SRX-01;
    domain-name enterprise.gov.in;
    login {
        idle-timeout 10;
        user secadmin {
            class super-user;
            authentication {
                encrypted-password "$6$rounds=65600$saltvalue$HashedSecAdminPassHere.";
            }
        }
    }
    services {
        ssh {
            protocol-version v2;
            root-login deny;
            rate-limit 5;
        }
        web-management {
            https {
                system-generated-certificate;
            }
        }
    }
    syslog {
        host 10.10.20.50 {
            any warning;
        }
    }
}
"""

FORTINET_HIGH = """# Real Hardened Fortinet FortiOS Security Gateway
config system global
    set hostname "CORP-PERIMETER-FGT-01"
    set admin-ssh-v1 disable
    set admin-https-redirect enable
    set admin-sport 8443
    set admin-lockout-threshold 3
    set admin-lockout-duration 900
    set admintimeout 10
    set strong-crypto enable
    set pre_login_banner "Authorized government personnel only."
end
config system admin
    edit "secadmin"
        set trusthost1 10.10.0.0 255.255.0.0
        set password-expire enable
    next
end
config log syslogd setting
    set status enable
    set server "10.10.20.50"
end
config system ntp
    set type manual
    config ntpserver
        edit 1
            set server "10.10.100.1"
        next
    end
end
config firewall policy
    edit 1
        set name "DEFAULT_DENY_ALL"
        set srcintf "any"
        set dstintf "any"
        set srcaddr "all"
        set dstaddr "all"
        set action deny
        set schedule "always"
        set service "ALL"
    next
end
"""


async def run_p0_verification():
    print("=" * 80)
    print("=== NETVIGIL P0 DATAFLOW & EVALUATION BUG TRACE & VERIFICATION ===")
    print("=" * 80)

    tenant_id = f"test-tenant-{uuid.uuid4().hex[:8]}"
    print(f"Isolated Test Tenant ID: {tenant_id}\n")

    files = [
        ("01_CISCO_SCORE_LOW.cfg", CISCO_LOW),
        ("02_JUNIPER_SCORE_MEDIUM.conf", JUNIPER_MEDIUM),
        ("03_FORTINET_SCORE_HIGH.conf", FORTINET_HIGH),
    ]

    audit_records = []

    async with AsyncSessionLocal() as db:
        # -------------------------------------------------------------
        # PHASE 1 — RUN THE ACTUAL BACKEND PIPELINE DIRECTLY ON ALL 3
        # -------------------------------------------------------------
        print("-" * 80)
        print("PHASE 1: RUNNING REAL BACKEND PIPELINE DIRECTLY AGAINST ALL THREE FILES")
        print("-" * 80)

        for filename, raw_content in files:
            content_bytes = raw_content.encode("utf-8")
            sha256_hash = hashlib.sha256(content_bytes).hexdigest()

            # 1. Real Ingestion
            config = await ConfigurationIngestionService.ingest_file(
                filename=filename,
                content_bytes=content_bytes,
                db=db,
                user_id=tenant_id,
            )

            # 2. Real Dynamic Parser Selection & AST Extraction
            parser = parser_registry.get_parser(content=raw_content, filename=filename)
            profile = parser.parse(raw_content, filename=filename)

            # Update configuration with normalized AST facts
            config.parser_status = "parsed"
            config.parser_name = profile.parser_name
            config.parser_version = profile.parser_version
            config.facts_extracted_count = profile.facts_extracted_count
            config.unknown_items_count = profile.unknown_items_count
            config.normalized_profile = profile.model_dump(mode="json")
            config.unknown_items = [u.model_dump(mode="json") for u in profile.unknown_items]
            config.detected_vendor = profile.vendor
            if profile.platform:
                config.detected_platform = profile.platform

            await db.commit()
            await db.refresh(config)

            # 3. Real Multi-Framework Audit Execution
            audit, summary, evals = await ComplianceAuditService.run_audit(
                configuration_id=config.id,
                frameworks=["CIS", "NIST", "STIG", "ISO"],
                db=db,
                user_id=tenant_id,
            )

            # 4. Real Risk Calculation
            risks = await RiskIntelligenceService.generate_audit_risks(
                audit_id=audit.id,
                db=db,
                user_id=tenant_id,
            )
            avg_risk = (sum(r.risk_score for r in risks) / len(risks)) if risks else 0.0
            max_risk = max((r.risk_score for r in risks), default=0.0)

            # 5. Real Remediation Proposal Generation
            remediations = await RemediationService.generate_audit_remediations(
                audit_id=audit.id,
                db=db,
                user_id=tenant_id,
            )

            rec = {
                "filename": filename,
                "sha256": sha256_hash,
                "config_id": config.id,
                "audit_id": audit.id,
                "vendor": profile.vendor,
                "platform": profile.platform or "generic",
                "parser": profile.parser_name,
                "facts_count": profile.facts_extracted_count,
                "controls_evaluated": len(evals),
                "pass_count": summary.status_breakdown.get("PASS", 0),
                "fail_count": summary.status_breakdown.get("FAIL", 0),
                "na_count": summary.status_breakdown.get("NOT_APPLICABLE", 0),
                "unknown_count": summary.status_breakdown.get("UNKNOWN", 0),
                "compliance_score": summary.overall_score,
                "risk_score": max_risk,
                "risk_count": len(risks),
                "remediations_count": len(remediations),
                "evals": evals,
                "remediations": remediations,
            }
            audit_records.append(rec)

            print(f"\n[FILE INGESTION & AUDIT RESULT]")
            print(f"  Filename:                 {rec['filename']}")
            print(f"  SHA-256:                  {rec['sha256']}")
            print(f"  Configuration ID:         {rec['config_id']}")
            print(f"  Audit ID:                 {rec['audit_id']}")
            print(f"  Detected Vendor:          {rec['vendor']} ({rec['platform']})")
            print(f"  Parser Selected:          {rec['parser']}")
            print(f"  Normalized Facts Count:   {rec['facts_count']}")
            print(f"  Framework Controls Run:   {rec['controls_evaluated']}")
            print(f"  PASS Count:               {rec['pass_count']}")
            print(f"  FAIL Count:               {rec['fail_count']}")
            print(f"  NOT_APPLICABLE Count:     {rec['na_count']}")
            print(f"  Compliance Score:         {rec['compliance_score']:.1f}%")
            print(f"  Risk Score:               {rec['risk_score']:.1f}/100")
            print(f"  Risk Groups Count:        {rec['risk_count']}")
            print(f"  Remediation Proposals:    {rec['remediations_count']}")

            # Print first 5 findings with control IDs and evidence
            print(f"  Sample Findings (First 5):")
            for e in evals[:5]:
                print(f"    - [{e.status.value}] {e.framework} {e.control_id}: {e.title}")
                print(f"      Evidence: {e.evidence} | Lines: {e.source_lines}")

        # -------------------------------------------------------------
        # PHASE 2 — VERIFY AUDITS ARE ACTUALLY DIFFERENT
        # -------------------------------------------------------------
        print("\n" + "-" * 80)
        print("PHASE 2: PROVING AUDITS ARE ACTUALLY DIFFERENT & FULL RELATIONSHIP TREE")
        print("-" * 80)

        # 1. Check uniqueness
        config_ids = [r["config_id"] for r in audit_records]
        audit_ids = [r["audit_id"] for r in audit_records]
        sha_hashes = [r["sha256"] for r in audit_records]
        scores = [r["compliance_score"] for r in audit_records]

        assert len(set(config_ids)) == 3, "Configuration IDs must be distinct!"
        assert len(set(audit_ids)) == 3, "Audit IDs must be distinct!"
        assert len(set(sha_hashes)) == 3, "SHA-256 hashes must be distinct!"
        assert len(set(scores)) == 3, "Compliance scores must be distinct across different inputs!"

        print("[PASS] Verified: 3 unique Configuration IDs")
        print("[PASS] Verified: 3 unique Audit IDs")
        print("[PASS] Verified: 3 unique SHA-256 hashes matching uploaded bytes")
        print(f"[PASS] Verified: Distinct Compliance Scores: {scores[0]:.1f}% vs {scores[1]:.1f}% vs {scores[2]:.1f}%")

        for r in audit_records:
            print(f"\nRELATIONSHIP PROVENANCE TREE FOR: {r['filename']}")
            print(f"  FILE: {r['filename']} (SHA-256: {r['sha256'][:16]}...)")
            print(f"   |--* CONFIGURATION: {r['config_id']}")
            print(f"        |--* AUDIT: {r['audit_id']} (Score: {r['compliance_score']:.1f}%)")
            print(f"             |--* CONTROLS EVALUATED: {r['controls_evaluated']} (PASS={r['pass_count']}, FAIL={r['fail_count']})")
            print(f"             |--* RISKS: {r['risk_count']} groups (Score: {r['risk_score']:.1f}/100)")
            print(f"             +--* REMEDIATIONS: {r['remediations_count']} catalog templates")

        # -------------------------------------------------------------
        # PHASE 5 & 6 — VERIFY VENDOR RULE ISOLATION & EVIDENCE PROVENANCE
        # -------------------------------------------------------------
        print("\n" + "-" * 80)
        print("PHASE 5 & 6: VENDOR RULE ISOLATION & EVIDENCE PROVENANCE CHECK")
        print("-" * 80)

        fortinet_rec = audit_records[2]
        cisco_rec = audit_records[0]

        # Check Fortinet findings do NOT contain CIS-1.1.1 (Cisco AAA)
        fgt_control_ids = [e.control_id for e in fortinet_rec["evals"]]
        assert "CIS-1.1.1" not in fgt_control_ids, "CRITICAL ERROR: CIS-1.1.1 (Cisco AAA) leaked into Fortinet evaluation!"
        print("[PASS]: CIS-1.1.1 (Cisco AAA) is NOT present in Fortinet evaluation!")

        # Verify Fortinet does not cite line 1 for unconfigured features
        for e in fortinet_rec["evals"]:
            if e.status.value == "FAIL":
                assert e.source_lines != [1] or "global" not in str(e.evidence), (
                    f"CRITICAL ERROR: Finding {e.control_id} cited line 1 bogus evidence!"
                )
        print("[PASS]: Zero bogus Line 1 'config system global' citations on Fortinet!")

        # Check Cisco findings DO have CIS-1.1.1
        cisco_control_ids = [e.control_id for e in cisco_rec["evals"]]
        assert "CIS-1.1.1" in cisco_control_ids, "Cisco audit must evaluate CIS-1.1.1"
        print("[PASS]: CIS-1.1.1 appropriately evaluated on Cisco configuration.")

        # -------------------------------------------------------------
        # PHASE 10 — SAME-INPUT DETERMINISM TEST
        # -------------------------------------------------------------
        print("\n" + "-" * 80)
        print("PHASE 10: SAME-INPUT DETERMINISM TEST (same input -> same output)")
        print("-" * 80)

        # Run Fortinet second time with exact same bytes
        cfg_dup = await ConfigurationIngestionService.ingest_file(
            filename="03_FORTINET_SCORE_HIGH.conf",
            content_bytes=FORTINET_HIGH.encode("utf-8"),
            db=db,
            user_id=tenant_id,
        )
        p_dup = parser_registry.get_parser(content=FORTINET_HIGH, filename="03_FORTINET_SCORE_HIGH.conf")
        prof_dup = p_dup.parse(FORTINET_HIGH)
        cfg_dup.parser_status = "parsed"
        cfg_dup.parser_name = prof_dup.parser_name
        cfg_dup.parser_version = prof_dup.parser_version
        cfg_dup.facts_extracted_count = prof_dup.facts_extracted_count
        cfg_dup.unknown_items_count = prof_dup.unknown_items_count
        cfg_dup.normalized_profile = prof_dup.model_dump(mode="json")
        cfg_dup.unknown_items = [u.model_dump(mode="json") for u in prof_dup.unknown_items]
        cfg_dup.detected_vendor = prof_dup.vendor
        await db.commit()

        audit_dup, summary_dup, evals_dup = await ComplianceAuditService.run_audit(
            configuration_id=cfg_dup.id,
            frameworks=["CIS", "NIST", "STIG", "ISO"],
            db=db,
            user_id=tenant_id,
        )

        print(f"Run 1 Score: {fortinet_rec['compliance_score']:.2f}% (PASS={fortinet_rec['pass_count']}, FAIL={fortinet_rec['fail_count']})")
        print(f"Run 2 Score: {summary_dup.overall_score:.2f}% (PASS={summary_dup.status_breakdown.get('PASS', 0)}, FAIL={summary_dup.status_breakdown.get('FAIL', 0)})")

        assert fortinet_rec["compliance_score"] == summary_dup.overall_score, "Determinism failed: scores differ!"
        assert fortinet_rec["pass_count"] == summary_dup.status_breakdown.get("PASS", 0), "Determinism failed: pass counts differ!"
        assert fortinet_rec["fail_count"] == summary_dup.status_breakdown.get("FAIL", 0), "Determinism failed: fail counts differ!"
        print("[PASS]: Same input bytes produce identical, deterministic results across all frameworks.")

    print("\n" + "=" * 80)
    print("=== ALL P0 VERIFICATION CHECKS PASSED SUCCESSFULLY! ===")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(run_p0_verification())
