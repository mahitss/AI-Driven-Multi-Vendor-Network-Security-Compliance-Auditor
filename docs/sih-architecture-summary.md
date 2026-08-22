# NetVigil — SIH Architecture Executive Summary

**Problem Statement ID:** SIH26155 | **Theme:** Blockchain & Cybersecurity  
**Problem Title:** AI-Driven Multi-Vendor Network Security Compliance Auditor  
**Organization:** National Technical Research Organisation (NTRO)

---

## 1. Problem & Innovation
Modern enterprise and defense networks operate heterogeneous network infrastructure across Cisco, Juniper, Fortinet, and other proprietary vendors. Auditing these devices against multi-framework compliance standards (**CIS**, **NIST SP 800-53**, **DISA STIG**, **ISO 27001**) currently relies on brittle regex scripts or slow manual reviews.

**NetVigil** introduces a revolutionary two-tier architecture:
1. **Deterministic Multi-Vendor Normalization**: Translates proprietary syntax into a vendor-neutral **Universal Security Model**, decoupling compliance rules from vendor dialects.
2. **Safe AI & Adaptive Learning**: AI interprets unknown CLI structures and provides context-grounded audit assistance, while human administrators approve learned mappings with 100% audit defensibility.

---

## 2. System Architecture

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

## 3. Core Architectural Differentiators

- **Zero Hallucination Guarantee**: Compliance findings and scores are evaluated mathematically by the deterministic rule engine—never by LLM inference.
- **Cross-Vendor Equivalence**: Hardening controls (e.g. SSH v2, Syslog, NTP) evaluate identically regardless of whether the underlying device is Cisco IOS, Juniper JunOS, or FortiOS.
- **Adaptive Training with Human-in-the-Loop**: Unseen vendor directives are interpreted by AI, verified against a strict property allowlist, and approved by administrators, expanding parser coverage dynamically without code redeployment.
- **Actionable Risk Prioritization**: Eliminates alert fatigue by correlating individual control failures into composite risk items ranked from P0 (Immediate Danger) to P3 (Low).
- **Safe Remediation with Zero Live Execution**: Verified static templates provide visual diff previews without executing unvetted commands on critical production hardware.

---

## 4. Technology Stack & Scalability

- **API & Core Engine**: Python 3.13 / FastAPI (Asynchronous execution, sub-second audit throughput).
- **Database & Storage**: PostgreSQL with SQLAlchemy 2.0 (Full SQLite compatibility for air-gapped demo evaluation).
- **Web Interface**: Next.js 15 App Router, React 19, TypeScript, TanStack Query, TailwindCSS.
- **Containerization**: Docker & Docker Compose with multi-stage non-root containers.
- **Test Coverage**: 70 automated test cases across all parsers, normalization, compliance, risk, AI safety, and golden-path E2E workflows.
