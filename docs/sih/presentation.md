# NetVigil — 5-Slide Presentation Content

**Theme:** Blockchain & Cybersecurity | **Problem ID:** SIH26155  
**Title:** AI-Driven Multi-Vendor Network Security Compliance Auditor  
**Organization:** National Technical Research Organisation (NTRO)

---

## SLIDE 1: Problem & Mission
- **Heterogeneous Defense Networks**: Organizations run thousands of multi-vendor firewalls, routers, and switches (Cisco, Juniper, Fortinet).
- **The Core Challenge**: Vendor dialect fragmentation, complex compliance frameworks (CIS, NIST SP 800-53, DISA STIG, ISO 27001), and slow manual checklist audits.
- **The Risk**: Overlooked misconfigurations (cleartext Telnet, weak crypto, disabled logging) create unauthorized access vectors.
- **Why Pure LLMs Fail**: LLMs hallucinate non-existent controls, provide non-deterministic compliance scores, and are vulnerable to prompt injection.

---

## SLIDE 2: NetVigil Solution
- **Two-Tier Architecture**:
  1. **Deterministic Core**: Multi-vendor AST parsers, Universal Security Normalization (8 canonical domains), and mathematically reproducible compliance scoring.
  2. **AI Co-Pilot Layer**: Context-grounded audit explanations and unparsed syntax interpretation.
- **Core Value Proposition**: 100% audit defensibility with sub-second execution speeds and zero automated live push risks.

---

## SLIDE 3: System Architecture & Data Flow
```text
Raw Config (Cisco / Juniper / Fortinet)
               ↓
    Deterministic Vendor Detector
               ↓
    Multi-Vendor AST Parser
               ↓
    Universal Security Model (8 Domains)
               ↓
    Deterministic Compliance Engine (CIS / NIST / STIG / ISO)
               ↓
    ┌──────────────────────┬──────────────────────┬──────────────────────┐
    ↓                      ↓                      ↓                      ↓
Findings & Evidence   Risk Intelligence   Vendor Remediation   Adaptive Training
(Verbatim Line Refs)   (P0-P3 Prioritization) (Static Safe Diffs)   (HITL Syntax Learning)
```

---

## SLIDE 4: Core Innovations — Adaptive Training & Risk Intelligence
- **Human-in-the-Loop Adaptive Training**: When an unknown proprietary command appears, AI suggests semantic categories, verified against a strict `NORMALIZED_PROPERTY_ALLOWLIST`. Administrator approval expands the knowledge base dynamically without code redeployments.
- **Risk Prioritization Engine**: Correlates isolated findings into composite risk scores (0–100) and actionable priority bands (P0 Immediate Danger to P3 Low).
- **Safe Allowlisted Remediation**: Verified static CLI templates with visual diffs (`REMOVE`/`ADD`) under a strict Zero Automated Execution Policy.

---

## SLIDE 5: Demonstrated Impact & Live Demo Outcome
- **Full SIH Prototype Readiness (`v1.0.0-SIH2026`)**:
  - **70 / 70 Automated Tests Passing (100%)** with complete golden-path E2E verification.
  - **Sub-50ms Pipeline Latency**: Ingestion, parsing, compliance evaluation, and risk scoring in milliseconds.
  - **Air-Gap Capable**: 100% core audit functionality operates without external internet connectivity.
  - **Live Presentation**: 2-Minute interactive demonstration on canonical gateway `CORE-RTR-01`.
