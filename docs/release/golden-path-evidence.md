# NetVigil — End-to-End Golden Path Technical Evidence

**Release:** `v1.0.0-SIH2026-RC1`  
**Automated Verification:** [`apps/api/tests/test_golden_path_e2e.py`](file:///c:/Users/pc/OneDrive/Desktop/SIH2026/apps/api/tests/test_golden_path_e2e.py)  
**Interactive Verification:** `http://localhost:3000/demo`

---

## Stage-by-Stage Workflow Verification

```text
Upload ──> Detect ──> Parse ──> Normalize ──> Audit ──> Evidence ──> Risk ──> Remediate ──> AI Explain ──> Adaptive Train ──> Re-Audit ──> Report
```

### Stage 1: Ingestion & Cryptographic Integrity
- **Endpoint:** `POST /api/v1/configurations`
- **Input:** `cisco-core-router.cfg` (RFC 5737 documentation synthetic config)
- **Output:** `{"id": "...", "hash": "36c5475f...", "file_size_bytes": 1042, "detected_vendor": "cisco"}`
- **Test:** `test_config_ingestion.py`
- **Result:** **PASS (27.69ms)**

### Stage 2: Deterministic Vendor Detection
- **Component:** `VendorDetector.detect()`
- **Input:** Raw configuration string
- **Output:** `{"vendor": "cisco", "confidence": 0.99, "method": "weighted_signature"}`
- **Test:** `test_vendor_detector.py`
- **Result:** **PASS**

### Stage 3: AST Parsing & Universal Normalization
- **Endpoint:** `POST /api/v1/configurations/{config_id}/analyze`
- **Input:** Configuration ID
- **Output:** `NormalizedSecurityProfile` covering 8 canonical security domains and `unknown_items`
- **Test:** `test_cisco_parser.py`, `test_universal_schema.py`
- **Result:** **PASS (23.42ms)**

### Stage 4: Multi-Framework Compliance Audit
- **Endpoint:** `POST /api/v1/audits`
- **Input:** `{"configuration_id": "...", "frameworks": ["CIS", "NIST", "STIG", "ISO"]}`
- **Output:** Overall compliance score: `20.0%`, 60 findings evaluated across all 4 frameworks
- **Test:** `test_audits_api.py`, `test_compliance_catalog.py`
- **Result:** **PASS (36.56ms)**

### Stage 5: Verbatim Line Evidence Citations
- **Component:** `Finding.evidence`, `Finding.source_lines`
- **Proof:** Telnet failure finding contains `Line 28: transport input telnet ssh`, `observed = true`, `expected = false`
- **Test:** `test_golden_path_e2e.py`
- **Result:** **PASS**

### Stage 6: Risk Intelligence & P0/P1 Prioritization
- **Endpoint:** `GET /api/v1/audits/{audit_id}/risks`
- **Output:** 20 correlated risks, 2 P0 Immediate Danger risks (`risk_score: 94.5/100`)
- **Test:** `test_risk_scoring.py`, `test_risk_grouping_and_graph.py`
- **Result:** **PASS (61.19ms)**

### Stage 7: Allowlisted Vendor Remediation & Visual Diffs
- **Endpoint:** `GET /api/v1/audits/{audit_id}/remediations`
- **Output:** 12 allowlisted remediation proposals with `REMOVE` and `ADD` visual CLI diffs
- **Test:** `test_remediation_catalog.py`
- **Result:** **PASS (44.39ms)**

### Stage 8: Grounded AI Finding Explanation
- **Endpoint:** `POST /api/v1/ai/findings/{finding_id}/explanation`
- **Output:** Structured explanation grounded strictly in line 28 Telnet evidence
- **Test:** `test_ai_finding_explanation.py`
- **Result:** **PASS**

### Stage 9: Adaptive Training (HITL Unknown Syntax Learning)
- **Endpoint:** `POST /api/v1/training/mappings` $\rightarrow$ `POST /api/v1/training/mappings/{id}/approve`
- **Input:** Directive `control-plane policing policy-map COPP_MGMT_POLICY` mapped to `access_control.control_plane_policing_enabled`
- **Output:** `status: APPROVED`, validated against `NORMALIZED_PROPERTY_ALLOWLIST`
- **Test:** `test_adaptive_learning_end_to_end.py`
- **Result:** **PASS**

### Stage 10: Dynamic Re-Analysis & Posture Improvement
- **Endpoint:** `POST /api/v1/training/reanalyze/{config_id}`
- **Output:** Posture score recalculated dynamically from `20.0%` to `26.7%` without restarting backend services
- **Test:** `test_golden_path_e2e.py`
- **Result:** **PASS**

### Stage 11: Official Compliance Report Document
- **Endpoint:** `POST /api/v1/reports/generate`
- **Output:** Structured Executive Audit Summary document with printable layout and NTRO headers
- **Test:** `test_operations_dashboard.py`
- **Result:** **PASS**
