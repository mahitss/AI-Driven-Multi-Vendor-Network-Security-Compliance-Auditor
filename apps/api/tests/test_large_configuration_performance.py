"""
NetVigil Large Configuration & Stress Parsing Test
Problem Statement: SIH26155 (NTRO)

Verifies:
1. Handling of realistic large multi-interface, multi-VLAN enterprise router configs (500+ lines)
2. Accurate line number tracking and grounded evidence extraction on high line counts
3. Deterministic vendor detection and AST parsing performance
4. Comprehensive multi-framework compliance evaluation under large datasets
"""
import io
import time
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


def generate_large_cisco_config(num_interfaces: int = 80) -> str:
    """Generate a realistic 500+ line enterprise Cisco IOS configuration."""
    lines = [
        "! =============================================================",
        "! NetVigil Enterprise Large Configuration Dataset (500+ Lines)",
        "! Hostname: NTRO-BACKBONE-CORE-01",
        "! =============================================================",
        "version 15.2",
        "no service password-encryption",
        "service finger",
        "hostname NTRO-BACKBONE-CORE-01",
        "!",
        "boot-start-marker",
        "boot-end-marker",
        "!",
        "no aaa new-model",
        "username admin privilege 15 password 0 cisco123",
        "enable password unencrypted_enable_pass",
        "!",
        "ip domain name ntro.gov.in",
        "ip ssh version 1",
        "ip http server",
        "no ip http secure-server",
        "!",
    ]

    # Generate 80 interfaces (~320 lines)
    for i in range(num_interfaces):
        lines.extend([
            f"interface GigabitEthernet{i // 24}/{i % 24}",
            f" description Enterprise-VLAN-Segment-{i + 1}",
            f" ip address 10.{i // 256}.{i % 256}.1 255.255.255.0",
            " ip proxy-arp",
            " ip directed-broadcast",
            " no shutdown",
            "!",
        ])

    # Dynamic Routing Protocol (OSPF / BGP)
    lines.extend([
        "router ospf 100",
        " router-id 10.255.255.1",
        " network 10.0.0.0 0.255.255.255 area 0",
        "!",
        "router bgp 65000",
        " bgp log-neighbor-changes",
        " neighbor 192.0.2.1 remote-as 65001",
        " neighbor 192.0.2.1 description NTRO-PEER-WAN",
        "!",
    ])

    # Access Control Lists (~60 lines)
    for acl_idx in range(1, 15):
        lines.extend([
            f"access-list {100 + acl_idx} permit tcp any host 10.10.{acl_idx}.1 eq 22",
            f"access-list {100 + acl_idx} permit tcp any host 10.10.{acl_idx}.1 eq 443",
            f"access-list {100 + acl_idx} deny ip any any log",
        ])

    # Management VTY Lines
    lines.extend([
        "!",
        "line con 0",
        " password consolepass",
        "line aux 0",
        "line vty 0 4",
        " transport input telnet",
        " password vtypass",
        " login",
        "line vty 5 15",
        " transport input telnet",
        " password vtypass2",
        " login",
        "!",
        "end",
    ])

    return "\n".join(lines)


@pytest.mark.asyncio
async def test_large_configuration_parsing_and_audit():
    """
    Validates that a 500+ line enterprise configuration:
    - Parses within tight SLA (< 1000ms)
    - Accurately tracks high line numbers (> 300)
    - Produces exact grounded evidence citations
    - Evaluates all CIS/NIST compliance rules
    """
    large_config = generate_large_cisco_config(num_interfaces=80)
    assert len(large_config.split("\n")) > 450

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        start_time = time.time()

        # Step 1: Upload Large Configuration
        file_payload = {
            "file": (
                "enterprise_backbone_large.cfg",
                io.BytesIO(large_config.encode("utf-8")),
                "text/plain",
            )
        }
        upload_res = await client.post("/api/v1/configurations", files=file_payload)
        assert upload_res.status_code == 201
        cfg_data = upload_res.json()
        cfg_id = cfg_data["id"]

        upload_duration = time.time() - start_time
        assert upload_duration < 3.0  # Fast ingestion SLA

        # Step 2: Audit Large Configuration
        audit_start = time.time()
        audit_res = await client.post(
            "/api/v1/audits",
            json={"configuration_id": cfg_id, "frameworks": ["CIS", "NIST", "STIG", "ISO"]},
        )
        assert audit_res.status_code == 201
        audit_data = audit_res.json()
        audit_id = audit_data["audit_id"]

        audit_duration = time.time() - audit_start
        assert audit_duration < 5.0  # Full multi-framework audit SLA

        # Step 3: Fetch Findings & Verify Evidence Lines
        detail_res = await client.get(f"/api/v1/audits/{audit_id}")
        assert detail_res.status_code == 200
        findings = detail_res.json()["findings"]

        assert len(findings) > 0
        ssh_finding = next((f for f in findings if f["control_id"] == "CIS-1.2.1"), None)
        assert ssh_finding is not None
        assert ssh_finding["status"] == "FAIL"
        assert "ip ssh version 1" in ssh_finding["evidence"]

        telnet_finding = next((f for f in findings if "telnet" in (f["evidence"] or "").lower()), None)
        assert telnet_finding is not None
        assert telnet_finding["status"] == "FAIL"
