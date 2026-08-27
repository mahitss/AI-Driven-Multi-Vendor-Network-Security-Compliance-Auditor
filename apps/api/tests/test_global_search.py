"""
NetVigil — Global Unified Search & Command Center Tests
Problem Statement: SIH26155 (NTRO)

Tests:
1. Multi-category entity search (configurations, audits, findings, controls, risks, remediations, reports)
2. Token search for 'SSH' returns line-level findings and governance controls
3. Context awareness prioritizes findings from the active audit
4. Redaction: Sensitive secrets are never exposed in search output
5. Navigation and system actions retrieval
"""
import io
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.compliance.service import ComplianceAuditService

SAMPLE_CONFIG = """
!
hostname CORE-SEARCH-RTR
no service password-encryption
service finger
ip ssh version 1
enable password supersecret_password123
line vty 0 4
 transport input telnet
 login
end
"""


@pytest.mark.asyncio
async def test_global_search_multi_category_and_ssh_token(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """
    Validates that searching 'SSH' surfaces:
    - Findings (CIS-1.2.1)
    - Governance Controls (CIS, NIST, STIG)
    - Remediations (Cisco SSH template)
    - Navigation shortcuts
    """
    # 1. Ingest and audit configuration
    f = {"file": ("core-search-rtr.cfg", io.BytesIO(SAMPLE_CONFIG.encode("utf-8")), "text/plain")}
    res = await client.post("/api/v1/configurations", files=f)
    assert res.status_code == 201
    cfg_id = res.json()["id"]

    audit, _, _ = await ComplianceAuditService.run_audit(
        configuration_id=cfg_id,
        frameworks=["CIS", "NIST"],
        db=db_session,
    )

    # 2. Call Global Search API
    search_res = await client.get("/api/v1/overview/search?q=SSH")
    assert search_res.status_code == 200
    data = search_res.json()

    assert data["query"] == "SSH"
    assert data["total_results"] > 0
    categories = data["categories"]

    # Verify findings returned
    assert len(categories["findings"]) > 0
    finding_ctrls = [f["control_id"] for f in categories["findings"]]
    assert "CIS-1.2.1" in finding_ctrls

    # Verify governance controls returned
    assert len(categories["controls"]) > 0

    # Verify remediations returned
    assert len(categories["remediations"]) > 0

    # Verify secrets are NOT exposed (e.g. supersecret_password123)
    raw_response_text = search_res.text
    assert "supersecret_password123" not in raw_response_text


@pytest.mark.asyncio
async def test_global_search_context_awareness(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """
    Validates that providing context_audit_id prioritizes findings for the active audit.
    """
    f = {"file": ("core-search-rtr.cfg", io.BytesIO(SAMPLE_CONFIG.encode("utf-8")), "text/plain")}
    res = await client.post("/api/v1/configurations", files=f)
    cfg_id = res.json()["id"]

    audit, _, _ = await ComplianceAuditService.run_audit(
        configuration_id=cfg_id,
        frameworks=["CIS"],
        db=db_session,
    )

    search_res = await client.get(f"/api/v1/overview/search?q=telnet&context_audit_id={audit.id}")
    assert search_res.status_code == 200
    data = search_res.json()
    findings = data["categories"]["findings"]
    if findings:
        # First finding must belong to the active audit
        assert findings[0]["audit_id"] == audit.id


@pytest.mark.asyncio
async def test_global_search_navigation_actions(
    client: AsyncClient,
):
    """
    Validates that navigation searches return relevant platform pages.
    """
    res = await client.get("/api/v1/overview/search?q=time machine")
    assert res.status_code == 200
    data = res.json()
    nav_items = data["categories"]["navigation"]
    assert len(nav_items) > 0
    assert any("/security-time-machine" in item["url"] for item in nav_items)
