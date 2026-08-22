# NetVigil — Technical Claim & Verification Matrix

**Release:** `v1.0.0-SIH2026-RC1`  
**Problem Statement:** SIH26155 — AI-Driven Multi-Vendor Network Security Compliance Auditor  
**Target Organization:** National Technical Research Organisation (NTRO)

---

| # | Technical Claim | Implementation File / Component | Verification Test | Test Result | Concrete Evidence Reference |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **1** | **Multi-Vendor Parsing** | `apps/api/app/services/parser/vendors/` (Cisco, Juniper, Fortinet) | `test_cisco_parser.py`, `test_juniper_parser.py`, `test_fortinet_parser.py` | **PASS** | Parsers extract AST blocks and individual statements into structured dictionaries. |
| **2** | **Universal Security Model** | `apps/api/app/services/parser/models.py` (`NormalizedSecurityProfile`) | `test_universal_schema.py`, `test_normalization_equivalence.py` | **PASS** | 8 canonical domains: `remote_access`, `authentication`, `authorization`, `logging`, `time_sync`, `access_control`, `network_security`, `services`. |
| **3** | **Deterministic Compliance** | `apps/api/app/services/compliance/evaluator.py`, `service.py` | `test_rule_evaluator.py`, `test_scoring_engine.py` | **PASS** | Same configuration audited multiple times produces identical mathematical scores and findings. |
| **4** | **CIS Benchmarks** | `data/compliance/unified_catalog.json` | `test_compliance_catalog.py` | **PASS** | Evaluates CIS Cisco IOS Benchmark v2.0 and JunOS Benchmark v1.2 controls. |
| **5** | **NIST SP 800-53** | `data/compliance/unified_catalog.json` | `test_compliance_catalog.py` | **PASS** | Evaluates AC-2, AC-17, AU-2, AU-12, CM-6, IA-2, SC-7, SC-8 control family rules. |
| **6** | **DISA STIG** | `data/compliance/unified_catalog.json` | `test_compliance_catalog.py` | **PASS** | Evaluates Cisco Router/Switch L1/L2 Security Technical Implementation Guide controls. |
| **7** | **ISO/IEC 27001** | `data/compliance/unified_catalog.json` | `test_compliance_catalog.py` | **PASS** | Evaluates Annex A.5.15, A.8.20, A.8.24 configuration control coverage. |
| **8** | **Line-Level Evidence** | `Finding.evidence`, `Finding.source_lines` | `test_cisco_parser.py`, `test_golden_path_e2e.py` | **PASS** | Finds verbatim lines (e.g. `Line 28: transport input telnet ssh`) and observed vs. expected values. |
| **9** | **AI Finding Explanations** | `apps/api/app/services/ai/finding_explanation_service.py` | `test_ai_finding_explanation.py` | **PASS** | Generates structured explanations strictly grounded in pre-extracted line citations. |
| **10** | **AI Unknown Syntax Interpretation** | `apps/api/app/services/ai/unknown_interpreter_service.py` | `test_ai_unknown_interpreter.py` | **PASS** | Classifies unparsed CLI directives into candidate canonical categories with confidence tiers. |
| **11** | **Adaptive Training** | `apps/api/app/services/training/knowledge_service.py` | `test_adaptive_learning_end_to_end.py` | **PASS** | Unseen CLI commands are mapped and dynamically loaded on subsequent parses without code changes. |
| **12** | **Human Approval Workflow** | `apps/api/app/api/routes/training.py` | `test_training_lifecycle.py` | **PASS** | Administrator review, edit, approve, and reject actions recorded in `TrainingAuditTrail`. |
| **13** | **Persistent Learned Mappings** | `TrainingMapping` SQLAlchemy model | `test_training_lifecycle.py` | **PASS** | Approved mappings persist in SQLite/PostgreSQL and update usage counters. |
| **14** | **Risk Prioritization (P0–P3)** | `apps/api/app/services/risk/scorer.py` | `test_risk_scoring.py` | **PASS** | Mathematical formula computes 0–100 risk score and assigns P0 Immediate, P1 High, P2 Medium, P3 Low. |
| **15** | **Vendor Remediation Diffs** | `apps/api/app/services/remediation/diff_generator.py` | `test_remediation_catalog.py` | **PASS** | Generates visual `REMOVE` and `ADD` CLI diff previews from static templates. |
| **16** | **Zero Automated Execution** | `apps/api/app/services/remediation/service.py` | Security Codebase Scan | **PASS** | Zero occurrences of `subprocess`, `os.system`, `paramiko`, `eval`, or `exec`. Fixes are preview-only. |
| **17** | **Sensitive Data Redaction** | `apps/api/app/core/security.py` (`redact_sensitive_data`) | `test_ai_security.py` | **PASS** | Passwords, hashes, SNMP strings, and private keys are masked across logs, prompts, and reports. |
| **18** | **RBAC & Authorization** | `app/models/user.py`, `training/knowledge_service.py` | `test_training_allowlist_safety.py` | **PASS** | Server-side role enforcement (`ADMIN`, `SECURITY_ANALYST`, `AUDITOR`, `VIEWER`). |
| **19** | **PDF / Printable Reports** | `apps/api/app/api/routes/reports.py`, `apps/web/src/app/reports/` | `test_operations_dashboard.py` | **PASS** | Generates structured Executive Summaries, Device Assessments, and Remediation Plans with print/PDF layout. |
| **20** | **Golden Demo Presenter Mode** | `apps/web/src/app/demo/page.tsx`, `GET /overview/demo/init` | `test_golden_demo_verification.py`, `scripts/verify-demo.py` | **PASS** | Dedicated 2-minute presenter mode with progress stepper and live latency benchmarks. |
| **21** | **Golden-Path E2E Lifecycle** | `apps/api/tests/test_golden_path_e2e.py` | `test_golden_path_e2e.py` | **PASS** | 12-stage complete SOC workflow executed end-to-end. |
| **22** | **Automated CI/CD Pipeline** | `.github/workflows/ci.yml` | GitHub Actions Runner | **PASS** | Runs 71 Pytest tests and Next.js 19-route static build on push/PR. |
