# NetVigil — SIH26155 Executive Architecture Document

**System Version:** `v1.0.0-SIH2026-RC1`  
**Problem Statement:** AI-Driven Multi-Vendor Network Security Compliance Auditor  
**Organization:** National Technical Research Organisation (NTRO)

---

## 1. High-Level System Architecture & Flow

```
[ Ingested Configuration File ] (.cfg, .conf, .txt)
                │
                ▼
  [ 1. Ingestion & Cryptographic Hashing ] (SHA-256 Digest, Isolated Storage)
                │
                ▼
  [ 2. Deterministic Vendor Detection ] (Cisco IOS, Juniper JunOS, Fortinet FortiOS)
                │
                ▼
  [ 3. Multi-Vendor AST Parser & Lexer ] (Extracts Facts, Preserves Unparsed Directives)
                │
                ▼
  [ 4. Universal Security Model Normalizer ] (Standardizes into 8 Security Domains)
                │
                ▼
  [ 5. Deterministic Compliance Engine ] (Evaluates 60+ CIS, NIST, STIG, ISO Rules)
                │
    ┌───────────┴───────────┬──────────────────────┬──────────────────────┐
    ▼                       ▼                      ▼                      ▼
[ Findings & Evidence ] [ Risk Intelligence ]  [ Remediation Diffs ]  [ Adaptive Training ]
- Verbatim line proof   - Graph correlation    - Allowlisted CLI      - Unknown syntax
- Zero hallucination    - P0-P3 blast radius   - ZERO live execution  - Allowlist guarded
    │                       │                      │                      │
    └───────────┬───────────┴──────────────────────┴──────────────────────┘
                ▼
  [ 6. OpenRouter AI Advisory Gateway ] (Pre-Redacted, 22 Models, Standby Fallback)
                │
                ▼
  [ 7. SOC Operations Workspace & PDF Report Export ] (Next.js 15, Dark SOC Theme)
```

---

## 2. Key Architectural Invariants & Boundaries

1. **Deterministic Authority Boundary:**  
   The AST parser and rule evaluator are the **sole authority** on compliance. AI is strictly an **advisory and interpretation layer**. AI cannot mutate `PASS`/`FAIL` decisions, change compliance percentages, alter finding severities, or modify risk scores.
2. **Zero Automated Execution Policy:**  
   NetVigil contains zero `subprocess`, `os.system`, or live SSH/Netconf execution hooks. All remediations are generated from verified static templates as visual diffs (`REMOVE`/`ADD`) requiring human review.
3. **Sensitive Data Redaction Boundary:**  
   Prior to dispatching any prompt or telemetry to external AI models, `redact_sensitive_data()` scrubs Cisco secrets, JunOS encrypted passwords, Fortinet ENC hashes, SNMP community strings, and RSA private keys.
4. **Adaptive Training Allowlist Guard:**  
   Unparsed syntax is classified into candidate properties that must match the `NORMALIZED_PROPERTY_ALLOWLIST`. Human administrator approval is strictly mandatory before any new mapping is persisted.

---

## 3. Technology Stack & Deployment

- **Backend:** Python 3.11+ / FastAPI / SQLAlchemy 2.0 Async / Pydantic v2 / aiosqlite / PostgreSQL 16
- **Frontend:** Next.js 15.5 App Router / React 19 / TypeScript / Tailwind CSS / TanStack Query
- **AI Gateway:** OpenRouter OpenAI-compatible API (`https://openrouter.ai/api/v1`) with 22 canonical model routing
- **Testing:** Pytest (88 unit, integration, and security tests with 100% pass rate)
