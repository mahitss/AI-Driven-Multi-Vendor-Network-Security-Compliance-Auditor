# NetVigil — Final SIH Judge Technical Q&A Defense

**Problem Statement:** SIH26155 — AI-Driven Multi-Vendor Network Security Compliance Auditor  
**Organization:** National Technical Research Organisation (NTRO)  
**Release:** `NetVigil v1.0.0-SIH2026-RC1`

---

### 1. Why AI?
**Answer:** Network security configurations are syntactically complex and continuously evolving. AI provides natural language context-grounded audit assistance and interprets unparsed, obscure vendor CLI syntax into candidate canonical security domains for human review.

### 2. Why not traditional regex?
**Answer:** Regex scripts are fragile to minor whitespace or formatting variations and require an $M \times N$ matrix explosion of rules across multiple vendors and frameworks. NetVigil parses configurations into hierarchical Abstract Syntax Trees (ASTs) and maps them to a canonical **Universal Security Model**.

### 3. How do you support unknown vendors?
**Answer:** Through our pluggable `parser_registry` architecture and the **Adaptive Training System**, where unparsed directives are interpreted by AI, verified against a property allowlist, approved by administrators, and persisted dynamically into the active knowledge base.

### 4. How does the system learn?
**Answer:** When an unparsed directive is encountered during AST parsing, it is saved as an `unknown_item`. AI classifies candidate semantic categories, which are validated against `NORMALIZED_PROPERTY_ALLOWLIST`. A human administrator reviews and approves the mapping, which is persisted in `TrainingMapping` and immediately used for subsequent parses and re-analyses.

### 5. Who validates AI?
**Answer:** A designated Security Administrator or Auditor explicitly reviews, edits, or rejects candidate mappings with full audit trail logging in `TrainingAuditTrail`.

### 6. Can AI alter compliance?
**Answer:** **Never.** The deterministic rule engine makes 100% of compliance PASS/FAIL decisions based on extracted security facts. AI is strictly isolated as a read-only advisor and syntax classifier.

### 7. What happens if AI fails?
**Answer:** NetVigil operates with 100% functionality in air-gapped or offline modes. All vendor detection, parsing, deterministic compliance auditing, risk prioritization, remediation diffs, and report generation execute locally without cloud LLM dependencies.

### 8. How are framework mappings verified?
**Answer:** Every rule in `unified_catalog.json` links to official control IDs (CIS Benchmarks, NIST SP 800-53, DISA STIG, ISO/IEC 27001) with explicit document references and verification statuses.

### 9. How do you prevent hallucinations?
**Answer:** Compliance evaluation is executed mathematically against extracted facts. For AI explanations, prompts are strictly constrained to pre-extracted evidence, temperature is set to 0.1, and responses are validated against Pydantic schemas.

### 10. How do you prevent dangerous remediation?
**Answer:** NetVigil enforces a strict **Zero Automated Execution Policy**. Remediation CLI scripts are generated exclusively from verified, static templates (`REMEDIATION_CATALOG`) with visual diff previews (`REMOVE`/`ADD`), requiring human operator sign-off.

### 11. How is configuration data protected?
**Answer:** Sensitive credentials (passwords, MD5/SHA password hashes, SNMP community strings, private keys) are redacted via `redact_sensitive_data()` from logs, AI prompts, and reports. Uploads are SHA-256 hashed and persisted in isolated storage.

### 12. How does this scale?
**Answer:** The architecture uses asynchronous FastAPI workers, stateless parsing pipelines, and SQLAlchemy 2.0 query optimization, achieving sub-50ms audit throughput and horizontal worker scaling.

### 13. Why is this better than vendor-specific tools?
**Answer:** Vendor-specific tools only manage their own hardware. NetVigil evaluates heterogeneous multi-vendor networks (Cisco, Juniper, Fortinet) under a single unified dashboard and compliance policy catalog.

### 14. What is the current limitation?
**Answer (Honest & Transparent):** Native AST parsers currently cover Cisco IOS, Juniper JunOS, and Fortinet FortiOS; additional vendors currently route through Adaptive Training. Live network push is deliberately omitted to prevent production outage risks.

### 15. What would you build next?
**Answer:** Native AST parsers for Palo Alto PAN-OS and Arista EOS, automated SNMP live discovery connectors, and GitOps CI/CD pre-deployment compliance validation gates.
