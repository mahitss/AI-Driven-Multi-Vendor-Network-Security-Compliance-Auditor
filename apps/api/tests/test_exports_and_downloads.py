"""
Test Suite: Authentic File Downloads & Export HTTP Endpoints
Problem Statement: SIH26155 (NTRO)

Verifies that all export/download endpoints return:
1. HTTP 200 OK
2. Content-Disposition: attachment; filename="..."
3. Accurate file format and media type
4. Correct uncorrupted file contents
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.seed import seed_database_if_empty
from app.models.audit import Audit
from app.models.configuration import Configuration
from app.models.remediation import RemediationProposal
from app.api.routes.reports import GENERATED_REPORTS, generate_report, GenerateReportRequest
from sqlalchemy import select


@pytest.mark.asyncio
async def test_report_export_json_and_markdown(client: AsyncClient, db_session: AsyncSession):
    """Verifies that report export returns Content-Disposition attachment headers for JSON and Markdown."""
    await seed_database_if_empty(db_session)
    
    # Ensure at least one report exists
    first_audit = (await db_session.execute(select(Audit))).scalars().first()
    assert first_audit is not None

    rep = await generate_report(
        payload=GenerateReportRequest(
            report_type="EXECUTIVE_AUDIT_SUMMARY",
            audit_id=first_audit.id,
            title="NTRO Security Baseline Assessment",
            notes="Automated evaluation report.",
        ),
        db=db_session,
    )
    report_id = rep["id"]

    # 1. Test JSON Export
    res_json = await client.get(f"/api/v1/reports/{report_id}/export?format=json")
    assert res_json.status_code == 200
    assert "Content-Disposition" in res_json.headers
    assert "attachment" in res_json.headers["Content-Disposition"]
    assert ".json" in res_json.headers["Content-Disposition"]
    assert res_json.headers["content-type"].startswith("application/json")
    json_data = res_json.json()
    assert json_data["id"] == report_id

    # 2. Test Markdown Export
    res_md = await client.get(f"/api/v1/reports/{report_id}/export?format=markdown")
    assert res_md.status_code == 200
    assert "Content-Disposition" in res_md.headers
    assert "attachment" in res_md.headers["Content-Disposition"]
    assert ".md" in res_md.headers["Content-Disposition"]
    assert res_md.headers["content-type"].startswith("text/markdown")
    assert "# NTRO Security Baseline Assessment" in res_md.text


@pytest.mark.asyncio
async def test_remediation_export_script(client: AsyncClient, db_session: AsyncSession):
    """Verifies that remediation export returns proper vendor script attachment."""
    await seed_database_if_empty(db_session)

    rem = (await db_session.execute(select(RemediationProposal))).scalars().first()
    assert rem is not None

    res = await client.get(f"/api/v1/remediations/{rem.id}/export")
    assert res.status_code == 200
    assert "Content-Disposition" in res.headers
    assert "attachment" in res.headers["Content-Disposition"]
    assert "remediation_" in res.headers["Content-Disposition"]
    assert res.headers["content-type"].startswith("text/plain")
    assert "! NetVigil Remediation Catalog Export" in res.text


@pytest.mark.asyncio
async def test_audit_export_json_and_csv(client: AsyncClient, db_session: AsyncSession):
    """Verifies that audit export returns JSON and CSV attachments with findings."""
    await seed_database_if_empty(db_session)

    audit = (await db_session.execute(select(Audit))).scalars().first()
    assert audit is not None

    # JSON export
    res_json = await client.get(f"/api/v1/audits/{audit.id}/export?format=json")
    assert res_json.status_code == 200
    assert "Content-Disposition" in res_json.headers
    assert "attachment" in res_json.headers["Content-Disposition"]
    assert ".json" in res_json.headers["Content-Disposition"]
    assert res_json.headers["content-type"].startswith("application/json")
    data = res_json.json()
    assert "findings" in data

    # CSV export
    res_csv = await client.get(f"/api/v1/audits/{audit.id}/export?format=csv")
    assert res_csv.status_code == 200
    assert "Content-Disposition" in res_csv.headers
    assert "attachment" in res_csv.headers["Content-Disposition"]
    assert ".csv" in res_csv.headers["Content-Disposition"]
    assert "control_id,title,framework" in res_csv.text


@pytest.mark.asyncio
async def test_configuration_export_raw(client: AsyncClient, db_session: AsyncSession):
    """Verifies that configuration export returns raw config text as an attachment."""
    await seed_database_if_empty(db_session)

    cfg = (await db_session.execute(select(Configuration))).scalars().first()
    assert cfg is not None

    res = await client.get(f"/api/v1/configurations/{cfg.id}/export")
    assert res.status_code == 200
    assert "Content-Disposition" in res.headers
    assert "attachment" in res.headers["Content-Disposition"]
    assert cfg.original_filename in res.headers["Content-Disposition"]
    assert res.text == cfg.raw_content
