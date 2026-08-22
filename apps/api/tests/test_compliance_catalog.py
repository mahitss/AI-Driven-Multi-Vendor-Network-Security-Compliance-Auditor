"""
Compliance Catalog Unit Tests
"""
from app.services.compliance.catalog import ComplianceCatalog, compliance_catalog


def test_compliance_catalog_loads_all_rules_and_frameworks():
    rules = compliance_catalog.get_all_rules()
    assert len(rules) >= 10

    # Verify frameworks supported
    for fw in ["CIS", "NIST", "STIG", "ISO"]:
        fw_rules = compliance_catalog.get_rules_for_framework(fw)
        assert len(fw_rules) >= 10

        # Check that mappings contain verified citations
        for r in fw_rules:
            mapping = r.framework_mappings.get(fw)
            assert mapping is not None
            assert mapping.control_id != ""
            assert mapping.document != ""


def test_compliance_catalog_rule_by_id():
    rule = compliance_catalog.get_rule_by_id("RULE-SSH-001")
    assert rule is not None
    assert rule.fact_path == "remote_access.ssh_version.value"
    assert rule.expected_value == 2
    assert "CIS" in rule.framework_mappings
    assert "NIST" in rule.framework_mappings
    assert "STIG" in rule.framework_mappings
    assert "ISO" in rule.framework_mappings
