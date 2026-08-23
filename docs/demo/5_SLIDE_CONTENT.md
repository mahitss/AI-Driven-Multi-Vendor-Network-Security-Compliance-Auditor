# NetVigil — 5-Slide Evaluator Presentation Content

---

### SLIDE 1: Problem Statement & National Security Context
- **Challenge:** Critical national networks operate heterogeneous equipment from Cisco, Juniper, Fortinet.
- **Pain Points:** Disparate CLI syntax, manual audit bottlenecks, evolving standards (CIS, NIST, STIG, ISO).
- **The LLM Trap:** Raw LLMs hallucinate non-existent controls, yield non-reproducible scores, and risk credential leakage.

---

### SLIDE 2: The NetVigil Solution
- **Core Principle:** *"AI Interprets. Rules Decide. Humans Control."*
- **Deterministic Core:** Signature vendor detection, AST parsing, 8-domain Universal Security Model, exact line-level evidence.
- **AI Advisory Gateway:** OpenRouter multi-model intelligence for grounded explanations and unknown syntax classification.

---

### SLIDE 3: System Architecture & Data Pipeline
- **Pipeline:** Configuration Upload $\rightarrow$ SHA-256 Digest $\rightarrow$ Multi-Vendor AST Parser $\rightarrow$ Universal Normalizer $\rightarrow$ Deterministic Compliance Evaluator $\rightarrow$ Risk Correlator $\rightarrow$ Allowlisted Remediation $\rightarrow$ AI Advisory $\rightarrow$ PDF Report.
- **Performance:** Complete 60-control compliance evaluation executed in **$< 200$ ms**.

---

### SLIDE 4: Core Innovations & Security Invariants
- **Line-Level Evidence Proof:** Verbatim configuration line numbers and raw string citations.
- **Adaptive Training:** Human-in-the-loop unknown syntax learning guarded by `NORMALIZED_PROPERTY_ALLOWLIST`.
- **Zero Automated Live Push:** Preview-only CLI diffs (`REMOVE`/`ADD`) preventing accidental outages.
- **Sensitive Data Redactor:** Multi-vendor secret, SNMP, and private key sanitization before AI dispatch.

---

### SLIDE 5: Demonstrated Results, Impact & Roadmap
- **Verified Metrics:** 88 / 88 Pytest tests passing, 20 / 20 static frontend routes compiled, 0 P0 blockers.
- **Framework Coverage:** CIS Benchmarks, NIST SP 800-53 r5, DISA STIG, ISO/IEC 27001.
- **Future Roadmap:** Continuous CI/CD change management validation and Rancid/Oxidized configuration vault connectors.
