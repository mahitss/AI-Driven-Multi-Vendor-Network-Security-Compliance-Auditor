"""
NetVigil Golden-Path End-to-End Integration Test
Problem Statement: SIH26155 (NTRO)

Tests the complete 12-stage SOC operational lifecycle:
1. Configuration Ingestion & SHA-256 Hashing
2. Vendor Detection
3. Parser AST & Universal Security Normalization
4. Multi-Framework Compliance Engine (CIS, NIST, STIG, ISO)
5. Line-Level Evidence Preservation
6. Deterministic Risk Intelligence & Prioritization (P0-P3)
7. Risk Relationship Graph Construction
8. Allowlisted Vendor Remediation Proposals & Diffs
9. AI Audit Co-Pilot Context Interaction
10. Grounded Finding Explanations
11. Adaptive Training & Human-in-the-Loop Re-evaluation
12. Executive Compliance Report Generation
"""
import io
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_netvigil_complete_golden_path_lifecycle(client: AsyncClient):
    # -------------------------------------------------------------
    # Stage 1 & 2: Ingest Insecure Cisco Configuration & Detect Vendor
    # -------------------------------------------------------------
    cisco_insecure_cfg = """! NTRO Perimeter Gateway
version 15.0
no service password-encryption
service finger
hostname CORE-RTR-01
!
username admin privilege 15 password 0 cisco123
enable password unencrypted_pass
!
ip ssh version 1
ip http server
!
line vty 0 4
 transport input telnet
 password vtypass
 login
!
end"""

    files = {"file": ("CORE-RTR-01.cfg", io.BytesIO(cisco_insecure_cfg.encode("utf-8")), "text/plain")}
    upload_res = await client.post("/api/v1/configurations", files=files)
    assert upload_res.status_code == 201
    cfg_data = upload_res.json()
    cfg_id = cfg_data["id"]

    assert cfg_data["detected_vendor"] == "cisco"
    assert cfg_data["detection_confidence"] >= 0.90
    assert "hash" in cfg_data

    # -------------------------------------------------------------
    # Stage 3: Deterministic Parsing & Universal Normalization
    # -------------------------------------------------------------
    parse_res = await client.post(f"/api/v1/configurations/{cfg_id}/analyze")
    assert parse_res.status_code == 200
    parse_data = parse_res.json()
    assert parse_data["vendor"] == "cisco"
    assert parse_data["facts_extracted"] > 0
    assert "normalized_profile" in parse_data

    # -------------------------------------------------------------
    # Stage 4 & 5: Multi-Framework Compliance Audit & Evidence
    # -------------------------------------------------------------
    audit_res = await client.post(
        "/api/v1/audits",
        json={"configuration_id": cfg_id, "frameworks": ["CIS", "NIST", "STIG", "ISO"]},
    )
    assert audit_res.status_code == 201
    audit_data = audit_res.json()
    audit_id = audit_data["audit_id"]

    # Audit Detail & Findings Verification
    audit_detail_res = await client.get(f"/api/v1/audits/{audit_id}")
    assert audit_detail_res.status_code == 200
    audit_detail = audit_detail_res.json()
    assert len(audit_detail["findings"]) > 0
    assert "CIS" in audit_detail["framework_scores"]

    # Find Telnet failure finding
    telnet_finding = next(
        (f for f in audit_detail["findings"] if "telnet" in f["control_id"].lower() or "telnet" in f["title"].lower()),
        None,
    )
    assert telnet_finding is not None
    assert telnet_finding["status"] == "FAIL"
    assert telnet_finding["severity"] in ["CRITICAL", "HIGH"]
    assert "transport input telnet" in telnet_finding["evidence"]

    # -------------------------------------------------------------
    # Stage 6 & 7: Risk Intelligence, Prioritization & Relationship Graph
    # -------------------------------------------------------------
    risks_res = await client.get(f"/api/v1/audits/{audit_id}/risks")
    assert risks_res.status_code == 200
    risks = risks_res.json()
    assert len(risks) > 0

    # Verify P0 / P1 priority presence
    p0_or_p1 = [r for r in risks if r["priority"] in ["P0", "P1"]]
    assert len(p0_or_p1) > 0
    assert all(0 <= r["risk_score"] <= 100 for r in risks)

    # Risk Graph
    graph_res = await client.get(f"/api/v1/audits/{audit_id}/risk-graph")
    assert graph_res.status_code == 200
    graph = graph_res.json()
    assert len(graph["nodes"]) > 0
    assert len(graph["edges"]) > 0
    node_types = {n["type"] for n in graph["nodes"]}
    assert "DEVICE" in node_types
    assert "RISK" in node_types
    assert "FINDING" in node_types

    # -------------------------------------------------------------
    # Stage 8: Allowlisted Vendor Remediation & Visual Diff
    # -------------------------------------------------------------
    rems_res = await client.get(f"/api/v1/audits/{audit_id}/remediations")
    assert rems_res.status_code == 200
    remediations = rems_res.json()
    assert len(remediations) > 0

    cisco_ssh_rem = next((r for r in remediations if r["vendor"] == "cisco" and "ssh" in r["normalized_control"]), None)
    assert cisco_ssh_rem is not None
    assert "ip ssh version 2" in cisco_ssh_rem["remediation_commands"]
    assert cisco_ssh_rem["diff_preview"] is not None

    # Human Review Approval
    review_res = await client.post(
        f"/api/v1/remediations/{cisco_ssh_rem['id']}/review",
        json={"reviewer_email": "auditor@ntro.gov.in", "notes": "Approved for change maintenance window."},
    )
    assert review_res.status_code == 200
    assert review_res.json()["is_reviewed"] is True

    # -------------------------------------------------------------
    # Stage 9 & 10: AI Audit Co-Pilot & Finding Explanation
    # -------------------------------------------------------------
    explain_res = await client.post(f"/api/v1/ai/findings/{telnet_finding['id']}/explanation")
    assert explain_res.status_code == 200
    explanation = explain_res.json()
    assert "summary" in explanation
    assert "why_it_matters" in explanation
    assert "recommended_action" in explanation

    chat_res = await client.post(
        f"/api/v1/ai/audits/{audit_id}/chat",
        json={"query": "What are the most critical risks on this device?"},
    )
    assert chat_res.status_code == 200
    chat_answer = chat_res.json()
    assert "answer" in chat_answer
    assert chat_answer["confidence"] > 0

    # -------------------------------------------------------------
    # Stage 11: Adaptive Training on Unknown Syntax & Human Review
    # -------------------------------------------------------------
    interpret_res = await client.post(
        "/api/v1/ai/interpret-syntax",
        json={
            "raw_command": "crypto ipsec dynamic-map DYN_MAP 10",
            "vendor_hint": "cisco",
            "platform_hint": "ios",
        },
    )
    assert interpret_res.status_code == 200

    create_map_res = await client.post(
        "/api/v1/training/mappings",
        json={
            "vendor": "cisco",
            "raw_pattern": "control-plane policing policy-map COPP_POLICY",
            "semantic_meaning": "Control Plane Policing (CoPP) enforcement",
            "category": "access_control",
            "candidate_property": "access_control.control_plane_policing_enabled",
            "candidate_value": True,
            "confidence": 0.95,
            "status": "PENDING",
        },
    )
    assert create_map_res.status_code == 201
    map_id = create_map_res.json()["id"]

    # Approve Mapping
    approve_res = await client.post(
        f"/api/v1/training/mappings/{map_id}/approve",
        json={"user_email": "admin@ntro.gov.in"},
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "APPROVED"

    # Re-analyze configuration
    reanalyze_res = await client.post(f"/api/v1/training/reanalyze/{cfg_id}")
    assert reanalyze_res.status_code == 200
    assert "new_score" in reanalyze_res.json()

    # -------------------------------------------------------------
    # Stage 12: Executive Report Document Generation
    # -------------------------------------------------------------
    rep_res = await client.post(
        "/api/v1/reports/generate",
        json={
            "report_type": "EXECUTIVE_AUDIT_SUMMARY",
            "audit_id": audit_id,
            "title": "NTRO Perimeter Gateway Official Compliance Report",
        },
    )
    assert rep_res.status_code == 201
    report_doc = rep_res.json()
    assert report_doc["status"] == "COMPLETED"
    assert "executive_summary" in report_doc["sections"]
    assert "top_risks" in report_doc["sections"]
