# NetVigil — Official Test Evidence & Verification Record

**Release:** `NetVigil v1.0.0-SIH2026-RC1`  
**Execution Timestamp:** 2026-08-22 21:52 UTC  
**Environment:** Python 3.13.5 (FastAPI / Pytest 9.1.1) • Node.js 24 (Next.js 15.5.23) • Windows / Ubuntu CI

---

## 1. Backend Pytest Suite Summary

- **Total Tests Executed:** **71**
- **Passed:** **71 (100%)**
- **Failed:** **0**
- **Skipped:** **0**
- **Errors:** **0**
- **Total Execution Time:** **5.46 seconds**

### Detailed Test Execution Log:
```text
apps/api/tests/test_adaptive_learning_end_to_end.py::test_adaptive_learning_end_to_end_workflow PASSED
apps/api/tests/test_ai_audit_assistant.py::test_audit_assistant_chat_api PASSED
apps/api/tests/test_ai_audit_assistant.py::test_audit_assistant_nonexistent_audit_404 PASSED
apps/api/tests/test_ai_finding_explanation.py::test_ai_finding_explanation_api_flow PASSED
apps/api/tests/test_ai_provider.py::test_mock_ai_provider_text_and_structured PASSED
apps/api/tests/test_ai_provider.py::test_ai_provider_manager_factory PASSED
apps/api/tests/test_ai_security.py::test_secret_redaction_hides_passwords_and_hashes PASSED
apps/api/tests/test_ai_security.py::test_prompt_injection_sanitization PASSED
apps/api/tests/test_ai_unknown_interpreter.py::test_unknown_syntax_interpretation_service PASSED
apps/api/tests/test_ai_unknown_interpreter.py::test_unknown_syntax_interpretation_api_endpoint PASSED
apps/api/tests/test_analysis_api.py::test_analyze_cisco_configuration_endpoint PASSED
apps/api/tests/test_audits_api.py::test_full_audit_lifecycle_api PASSED
apps/api/tests/test_cisco_parser.py::test_cisco_parser_extracts_all_security_facts_with_evidence PASSED
apps/api/tests/test_cisco_parser.py::test_cisco_parser_captures_unknown_syntax PASSED
apps/api/tests/test_compliance_catalog.py::test_compliance_catalog_loads_all_rules_and_frameworks PASSED
apps/api/tests/test_compliance_catalog.py::test_compliance_catalog_rule_by_id PASSED
apps/api/tests/test_config_ingestion.py::test_upload_cisco_configuration_success PASSED
apps/api/tests/test_config_ingestion.py::test_upload_rejects_invalid_file_extension PASSED
apps/api/tests/test_config_ingestion.py::test_upload_rejects_empty_file PASSED
apps/api/tests/test_config_ingestion.py::test_list_and_get_configurations PASSED
apps/api/tests/test_config_ingestion.py::test_get_nonexistent_configuration_returns_404 PASSED
apps/api/tests/test_config_ingestion.py::test_detect_vendor_raw_endpoint PASSED
apps/api/tests/test_cross_vendor_compliance_equivalence.py::test_cisco_and_juniper_ssh_v2_produce_identical_compliance_findings PASSED
apps/api/tests/test_cross_vendor_compliance_equivalence.py::test_cisco_and_juniper_remote_syslog_produce_identical_compliance_findings PASSED
apps/api/tests/test_database_models.py::test_create_and_query_device_and_configuration PASSED
apps/api/tests/test_database_models.py::test_compliance_framework_control_and_finding PASSED
apps/api/tests/test_database_models.py::test_create_user_and_training_mapping PASSED
apps/api/tests/test_fortinet_parser.py::test_fortinet_block_ast_parsing PASSED
apps/api/tests/test_golden_demo_verification.py::test_golden_demo_initialization_and_diagnostics PASSED
apps/api/tests/test_golden_path_e2e.py::test_netvigil_complete_golden_path_lifecycle PASSED
apps/api/tests/test_health.py::test_health_endpoint_returns_200_and_healthy_status PASSED
apps/api/tests/test_health.py::test_root_endpoint_returns_service_metadata PASSED
apps/api/tests/test_juniper_parser.py::test_juniper_hierarchical_syntax_parsing PASSED
apps/api/tests/test_juniper_parser.py::test_juniper_set_syntax_parsing PASSED
apps/api/tests/test_knowledge_matcher.py::test_knowledge_matcher_exact_and_pattern PASSED
apps/api/tests/test_normalization_equivalence.py::test_cross_vendor_ssh_version_2_normalization_equivalence PASSED
apps/api/tests/test_normalization_equivalence.py::test_cross_vendor_remote_syslog_normalization_equivalence PASSED
apps/api/tests/test_normalization_equivalence.py::test_cross_vendor_ntp_server_normalization_equivalence PASSED
apps/api/tests/test_operations_dashboard.py::test_overview_posture_and_activity_api PASSED
apps/api/tests/test_operations_dashboard.py::test_devices_and_reports_api PASSED
apps/api/tests/test_remediation_catalog.py::test_remediation_catalog_cisco_templates PASSED
apps/api/tests/test_remediation_catalog.py::test_remediation_catalog_juniper_templates PASSED
apps/api/tests/test_remediation_catalog.py::test_remediation_catalog_fortinet_templates PASSED
apps/api/tests/test_remediation_catalog.py::test_remediation_catalog_unsupported_vendor_returns_none PASSED
apps/api/tests/test_remediation_diff_generation PASSED
apps/api/tests/test_risk_and_remediation_end_to_end.py::test_risk_and_remediation_full_lifecycle PASSED
apps/api/tests/test_risk_grouping_and_graph.py::test_group_findings_into_composite_risks PASSED
apps/api/tests/test_risk_grouping_and_graph.py::test_build_risk_relationship_graph PASSED
apps/api/tests/test_risk_scoring.py::test_risk_scoring_critical_severity_p0 PASSED
apps/api/tests/test_risk_scoring.py::test_risk_scoring_high_severity_p1 PASSED
apps/api/tests/test_risk_scoring.py::test_risk_scoring_low_severity_p3 PASSED
apps/api/tests/test_risk_scoring.py::test_risk_scoring_deterministic_reproducibility PASSED
apps/api/tests/test_risk_scoring.py::test_exposure_and_impact_inference PASSED
apps/api/tests/test_rule_evaluator.py::test_rule_evaluator_equals_operator PASSED
apps/api/tests/test_rule_evaluator.py::test_rule_evaluator_is_false_operator_failure PASSED
apps/api/tests/test_rule_evaluator.py::test_rule_evaluator_unknown_fact_handling PASSED
apps/api/tests/test_scoring_engine.py::test_scoring_engine_all_pass PASSED
apps/api/tests/test_scoring_engine.py::test_scoring_engine_mixed_with_not_applicable_and_unknown PASSED
apps/api/tests/test_training_allowlist_safety.py::test_allowlist_unit_validations PASSED
apps/api/tests/test_training_allowlist_safety.py::test_api_rejects_non_allowlisted_property PASSED
apps/api/tests/test_training_lifecycle.py::test_training_mapping_full_lifecycle PASSED
apps/api/tests/test_training_rejection.py::test_rejected_mappings_are_never_trusted PASSED
apps/api/tests/test_universal_schema.py::test_universal_schema_default_instantiation PASSED
apps/api/tests/test_universal_schema.py::test_universal_schema_custom_population_and_serialization PASSED
apps/api/tests/test_vendor_detector.py::test_detect_cisco_ios_sample PASSED
apps/api/tests/test_vendor_detector.py::test_detect_juniper_junos_hierarchical_sample PASSED
apps/api/tests/test_vendor_detector.py::test_detect_juniper_junos_set_syntax PASSED
apps/api/tests/test_vendor_detector.py::test_detect_fortinet_fortios_sample PASSED
apps/api/tests/test_vendor_detector.py::test_detect_unknown_configuration PASSED
apps/api/tests/test_vendor_detector.py::test_detect_empty_configuration PASSED
apps/api/tests/test_vendor_detector.py::test_sample_config_files_detection PASSED
```

---

## 2. Frontend Next.js Production Build Summary

- **Next.js Version:** 15.5.23
- **TypeScript & Linting:** Clean (0 errors)
- **Static Routes Compiled:** **19 / 19 (100%)**
- **Compile Time:** **4.6 seconds**

---

## 3. Demo Verification Script (`scripts/verify-demo.py`)

- **Total Critical Checks:** **10**
- **Passed Checks:** **10 (100%)**
- **Checks Verified:**
  1. Golden configuration presence (`cisco-core-router.cfg`)
  2. Vendor ingestion and signature detection
  3. AST parsing and Universal Normalization
  4. Multi-framework compliance scoring
  5. Verbatim line-level evidence citations
  6. Risk intelligence and P0/P1 prioritization
  7. Allowlisted vendor remediation proposals and diff previews
  8. Adaptive training property safety allowlist guard
  9. Posture re-analysis impact engine
  10. Zero live execution invariant verification
