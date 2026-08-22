"""
AI Audit Co-Pilot & Assistant Unit/Integration Tests
Problem Statement: SIH26155 (NTRO)
"""
import io
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_audit_assistant_chat_api(client: AsyncClient):
    # 1. Ingest config & create audit
    config_content = """
    !
    version 17.3
    hostname CORE-ROUTER
    no service password-encryption
    line vty 0 4
     transport input telnet
    end
    """
    files = {"file": ("audit_assistant_target.cfg", io.BytesIO(config_content.encode("utf-8")), "text/plain")}
    upload_res = await client.post("/api/v1/configurations", files=files)
    config_id = upload_res.json()["id"]

    audit_res = await client.post(
        "/api/v1/audits",
        json={"configuration_id": config_id, "frameworks": ["CIS", "NIST"]},
    )
    audit_id = audit_res.json()["audit_id"]

    # 2. Query Audit Assistant: "What are the highest risk findings?"
    query_payload = {
        "query": "What are my highest risk findings and what should I fix first?",
        "audit_id": audit_id,
    }
    chat_res = await client.post(f"/api/v1/ai/audits/{audit_id}/chat", json=query_payload)
    assert chat_res.status_code == 200
    chat_data = chat_res.json()

    assert chat_data["audit_id"] == audit_id
    assert len(chat_data["answer"]) > 20
    assert isinstance(chat_data["supporting_findings"], list)
    assert chat_data["confidence"] >= 0.70


@pytest.mark.asyncio
async def test_audit_assistant_nonexistent_audit_404(client: AsyncClient):
    chat_res = await client.post(
        "/api/v1/ai/audits/nonexistent-audit-uuid/chat",
        json={"query": "Why did it fail?", "audit_id": "nonexistent-audit-uuid"},
    )
    assert chat_res.status_code == 404
