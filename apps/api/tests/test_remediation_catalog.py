"""
Vendor Remediation Catalog & Diff Generator Tests
Problem Statement: SIH26155 (NTRO)
"""
import pytest
from app.services.remediation.catalog import find_remediation_template, REMEDIATION_CATALOG
from app.services.remediation.diff_generator import generate_remediation_diff


def test_remediation_catalog_cisco_templates():
    tpl = find_remediation_template("cisco", "remote_access.telnet_enabled")
    assert tpl is not None
    assert tpl["template_id"] == "CISCO-TELNET-001"
    assert "transport input ssh" in tpl["commands"]
    assert "verification_steps" in tpl
    assert "why_recommended" in tpl


def test_remediation_catalog_juniper_templates():
    tpl = find_remediation_template("juniper", "remote_access.ssh_version")
    assert tpl is not None
    assert tpl["template_id"] == "JUNIPER-SSH-001"
    assert "set system services ssh protocol-version v2" in tpl["commands"]


def test_remediation_catalog_fortinet_templates():
    tpl = find_remediation_template("fortinet", "remote_access.http_server_enabled")
    assert tpl is not None
    assert tpl["template_id"] == "FORTINET-HTTP-001"
    assert "config system global" in tpl["commands"]


def test_remediation_catalog_unsupported_vendor_returns_none():
    tpl = find_remediation_template("unsupported_vendor_xyz", "remote_access.ssh_version")
    assert tpl is None


def test_remediation_diff_generation():
    evidence = "line vty 0 4\n transport input telnet ssh"
    commands = """configure terminal
line vty 0 4
 transport input ssh
end"""

    diff = generate_remediation_diff(evidence, commands, vendor="cisco")
    assert diff["remove_count"] >= 1
    assert diff["add_count"] >= 1
    assert any("telnet" in d["line"] for d in diff["diff_lines"] if d["type"] == "REMOVE")
    assert any("transport input ssh" in d["line"] for d in diff["diff_lines"] if d["type"] == "ADD")
