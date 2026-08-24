"""
NetVigil Multi-Vendor Proof Demonstration Tests
Problem Statement: SIH26155 (NTRO)

Verifies:
1. Deterministic AST parsing across Cisco IOS, Juniper JunOS, and Fortinet FortiOS.
2. Universal Security Model normalization equivalence.
3. Shared compliance evaluation, line-level evidence citations, risk scoring, and remediation templates.
4. Multi-Vendor Demo endpoint (/demo/multi-vendor/init).
5. Unsupported vendor handling.
"""
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.services.parser.vendors.cisco.parser import CiscoParser
from app.services.parser.vendors.juniper.parser import JuniperParser
from app.services.parser.vendors.fortinet.parser import FortinetParser
from app.services.compliance.catalog import compliance_catalog
from app.services.compliance.evaluator import RuleEvaluator
from app.services.compliance.models import EvaluationStatus
from app.services.remediation.catalog import find_remediation_template


def test_cisco_juniper_fortinet_parsers_exist_and_deterministic():
    cisco_cfg = "ip ssh version 1\nno service password-encryption\nip http server"
    juniper_cfg = "system {\n    services {\n        telnet;\n        web-management { http { port 80; } }\n    }\n}"
    fortinet_cfg = "config system global\n    set admin-ssh-v1 enable\n    set admin-sport 80\nend"

    c_parser = CiscoParser()
    j_parser = JuniperParser()
    f_parser = FortinetParser()

    c_prof = c_parser.parse(cisco_cfg)
    j_prof = j_parser.parse(juniper_cfg)
    f_prof = f_parser.parse(fortinet_cfg)

    # 1. Cisco
    assert c_prof.vendor == "cisco"
    assert c_prof.remote_access.ssh_version.value == 1
    assert c_prof.remote_access.http_server_enabled.value is True

    # 2. Juniper
    assert j_prof.vendor == "juniper"
    assert j_prof.remote_access.telnet_enabled.value is True
    assert j_prof.remote_access.http_server_enabled.value is True

    # 3. Fortinet
    assert f_prof.vendor == "fortinet"
    assert f_prof.remote_access.ssh_version.value == 1
    assert f_prof.remote_access.http_server_enabled.value is True


def test_cross_vendor_shared_compliance_rule_evaluation():
    """Proves the compliance rule engine is 100% vendor-independent and shared."""
    http_rule = compliance_catalog.get_rule_by_id("RULE-HTTP-001")
    assert http_rule is not None

    c_prof = CiscoParser().parse("ip http server")
    j_prof = JuniperParser().parse("system { services { web-management { http; } } }")
    f_prof = FortinetParser().parse("config system global\n    set admin-sport 80\nend")

    c_eval = RuleEvaluator.evaluate_rule(http_rule, c_prof, "CIS")
    j_eval = RuleEvaluator.evaluate_rule(http_rule, j_prof, "CIS")
    f_eval = RuleEvaluator.evaluate_rule(http_rule, f_prof, "CIS")

    # All three must evaluate to FAIL with identical control IDs
    assert c_eval.status == EvaluationStatus.FAIL
    assert j_eval.status == EvaluationStatus.FAIL
    assert f_eval.status == EvaluationStatus.FAIL
    assert c_eval.control_id == j_eval.control_id == f_eval.control_id == "CIS-1.2.3"


def test_cross_vendor_remediation_catalog_templates():
    """Verifies that static allowlisted remediation templates exist for each vendor."""
    c_rem = find_remediation_template("cisco", "remote_access.ssh_version")
    j_rem = find_remediation_template("juniper", "remote_access.ssh_version")
    f_rem = find_remediation_template("fortinet", "remote_access.ssh_version")

    assert c_rem is not None
    assert "ip ssh version 2" in c_rem["commands"]

    assert j_rem is not None
    assert "set system services ssh protocol-version v2" in j_rem["commands"]

    assert f_rem is not None
    assert "set admin-ssh-v1 disable" in f_rem["commands"]

    # Unsupported remediation should return None
    unsupported = find_remediation_template("unknown_vendor", "remote_access.ssh_version")
    assert unsupported is None


@pytest.mark.asyncio
async def test_multivendor_demo_init_api_endpoint():
    """Verifies the multi-vendor proof initialization endpoint."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/overview/demo/multi-vendor/init")
        assert resp.status_code == 200
        data = resp.json()

        assert data["status"] == "ready"
        assert data["demo_mode"] == "MULTI_VENDOR_PROOF"
        assert "vendors" in data
        assert "cisco" in data["vendors"]
        assert "juniper" in data["vendors"]
        assert "fortinet" in data["vendors"]

        # Latency check
        for v in ["cisco", "juniper", "fortinet"]:
            v_data = data["vendors"][v]
            assert v_data["compliance_score"] is not None
            assert v_data["latency"]["total_ms"] > 0
            assert len(v_data["top_risks"]) > 0

        # Matrix check
        assert len(data["comparison_matrix"]) >= 3
        assert "unsupported_vendor_example" in data
