"""
Risk Grouping & Correlation Graph Tests
Problem Statement: SIH26155 (NTRO)
"""
import pytest
from app.models.finding import Finding
from app.models.risk import RiskItem
from app.services.risk.grouper import group_findings_into_risks
from app.services.risk.graph import build_risk_graph


def test_group_findings_into_composite_risks():
    f1 = Finding(
        id="f1",
        audit_id="a1",
        framework="CIS",
        control_id="CIS-2.1.1",
        category="remote_access",
        severity="HIGH",
        status="FAIL",
        title="Telnet service is enabled on VTY lines",
        evidence="transport input telnet ssh",
    )
    f2 = Finding(
        id="f2",
        audit_id="a1",
        framework="CIS",
        control_id="CIS-2.1.2",
        category="remote_access",
        severity="HIGH",
        status="FAIL",
        title="SSH version 1 is active",
        evidence="ip ssh version 1",
    )
    f3 = Finding(
        id="f3",
        audit_id="a1",
        framework="NIST",
        control_id="IA-5",
        category="authentication",
        severity="HIGH",
        status="FAIL",
        title="Global password encryption disabled",
        evidence="no service password-encryption",
    )
    f4 = Finding(
        id="f4",
        audit_id="a1",
        framework="ISO",
        control_id="A.12.4.1",
        category="logging",
        severity="MEDIUM",
        status="FAIL",
        title="Remote syslog forwarding not configured",
        evidence="no logging host",
    )

    findings = [f1, f2, f3, f4]
    risks = group_findings_into_risks(findings, audit_id="a1", device_id="CORE-RTR-01")

    assert len(risks) >= 2
    # Remote admin risk should contain both f1 and f2
    admin_risk = next((r for r in risks if r["category"] == "Remote Administration"), None)
    assert admin_risk is not None
    assert "f1" in admin_risk["finding_ids"]
    assert "f2" in admin_risk["finding_ids"]
    assert admin_risk["risk_score"] > 60.0


def test_build_risk_relationship_graph():
    r1 = RiskItem(
        id="r1",
        audit_id="a1",
        device_id="CORE-RTR-01",
        title="Administrative Remote Access & Management Plane Exposure",
        description="Cleartext remote access",
        category="Remote Administration",
        severity="CRITICAL",
        risk_score=94.0,
        priority="P0",
        likelihood="HIGH",
        impact="CRITICAL",
        exposure="MANAGEMENT_PLANE",
        confidence=1.0,
        finding_ids=["f1"],
        affected_assets=["CORE-RTR-01"],
        status="OPEN",
    )

    f1 = Finding(
        id="f1",
        audit_id="a1",
        framework="CIS",
        control_id="CIS-2.1.1",
        category="remote_access",
        severity="CRITICAL",
        status="FAIL",
        title="Telnet service is enabled",
        evidence="transport input telnet",
    )

    graph = build_risk_graph([r1], [f1], device_label="CORE-RTR-01")

    assert "nodes" in graph
    assert "edges" in graph
    assert graph["summary"]["nodes_count"] >= 3
    assert graph["summary"]["edges_count"] >= 2

    node_types = {n["type"] for n in graph["nodes"]}
    assert "DEVICE" in node_types
    assert "EXPOSURE" in node_types
    assert "RISK" in node_types
    assert "FINDING" in node_types
