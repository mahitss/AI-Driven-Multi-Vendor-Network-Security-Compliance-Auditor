# NetVigil — AI-Driven Multi-Vendor Network Security Compliance Auditor

[![CI Pipeline](https://github.com/mahitss/AI-Driven-Multi-Vendor-Network-Security-Compliance-Auditor/actions/workflows/ci.yml/badge.svg)](https://github.com/mahitss/AI-Driven-Multi-Vendor-Network-Security-Compliance-Auditor/actions)
[![Tests](https://img.shields.io/badge/Pytest-113%2F113%20Passing-brightgreen.svg)](https://github.com/mahitss/AI-Driven-Multi-Vendor-Network-Security-Compliance-Auditor)
[![Release](https://img.shields.io/badge/Release-v1.0.0--RC1-blue.svg)](https://github.com/mahitss/AI-Driven-Multi-Vendor-Network-Security-Compliance-Auditor)
[![Organization](https://img.shields.io/badge/Organization-NTRO-red.svg)](https://github.com/mahitss/AI-Driven-Multi-Vendor-Network-Security-Compliance-Auditor)

**Problem Statement ID:** SIH26155  
**Title:** AI-Driven Multi-Vendor Network Security Compliance Auditor  
**Organization:** National Technical Research Organisation (NTRO)  
**Theme:** Blockchain & Cybersecurity | **Category:** Software  
**Release:** `v1.0.0-RC1`  

---

## 1. Executive Summary & Problem Positioning

Modern critical national infrastructure networks are built using heterogeneous equipment across multiple vendors (**Cisco IOS**, **Juniper JunOS**, **Fortinet FortiOS**). Security engineers must audit diverse CLI syntaxes against strict regulatory standards (**CIS Benchmarks**, **NIST SP 800-53**, **DISA STIG**, **ISO/IEC 27001**).

### The NetVigil Core Invariant:
"Turn network configurations into evidence-backed, deterministic security decisions."

1. **Deterministic Compliance Core**: Deterministic rule evaluation, grounded line-level evidence citations, and allowlisted remediation diffs.
2. **Universal Security Model (USM)**: Translates disparate vendor syntax structures into 8 canonical security domains.
3. **Strict AI Safety Boundary**: AI acts purely as an advisory co-pilot for human comprehension. AI cannot alter compliance verdicts, severity tiers, or risk scores.
4. **Air-Gapped Safety Guardrail**: Mandatory enforcement of `NETWORK PUSH: DISABLED (READ-ONLY ADVISORY)`. Zero device-write operations.

---

## 2. Canonical Golden Workflow

```text
  Raw Network Configuration (.cfg, .conf, .txt)
                     │
                     ▼
  Cryptographic Ingestion & SHA-256 Fingerprint
                     │
                     ▼
  Deterministic Vendor Detection (Cisco, Juniper, Fortinet)
                     │
                     ▼
  Multi-Vendor AST Parser & Security Fact Extraction
                     │
                     ▼
  Universal Security Model Normalization (8 Canonical Domains)
                     │
                     ▼
  Multi-Framework Rule Evaluation (CIS / NIST / STIG / ISO)
                     │
                     ▼
  Line-Level Evidence Citations (Exact Configuration Lines)
                     │
                     ▼
  Deterministic Composite Risk Calculation (0–100, P0–P3)
                     │
                     ▼
  Allowlisted Remediation Generation (Before / After CLI Diffs)
                     │
                     ▼
  One-Click Re-Analysis & Score Verification (FAIL → PASS ✓)
                     │
                     ▼
  Official Executive Security Assessment Report (/reports)
```

---

## 3. Five-Minute Golden Demo Operator Script

1. **Open Security Posture Dashboard (`/dashboard`)**:
   - Immediate visibility into network posture, composite risk score, and framework compliance.
2. **Ingest Configuration (`/configurations?mode=ingest`)**:
   - Select the canonical **Cisco IOS Insecure Baseline** fixture (`cisco-core-router.cfg`).
   - Cryptographic SHA-256 calculation and 100% confidence vendor detection.
3. **Execute Audit**:
   - Run multi-framework audit across CIS, NIST, DISA STIG, and ISO 27001.
   - Initial Compliance: **20.0%** (39 Failed Controls), Composite Risk: **92.5 (P0 Critical)**.
4. **Inspect Line-Level Evidence (`/findings`)**:
   - Open **CIS-1.2.1** (Ensure SSH Version 2 is enabled).
   - Highlighting jumps directly to **Line 16**: `ip ssh version 1`.
   - Explains exact failure reason and related NIST/STIG framework mappings.
5. **Review Allowlisted Remediation (`/remediation`)**:
   - Proposes allowlisted Before/After patch:
     ```diff
     - ip ssh version 1
     + ip ssh version 2
     - no service password-encryption
     + service password-encryption
     - transport input telnet
     + transport input ssh
     ```
   - Highlights safety boundary: `NETWORK PUSH: DISABLED (READ-ONLY ADVISORY)`.
6. **Execute Re-Analysis & Verification**:
   - Click **[ RE-ANALYZE WITH REMEDIATION ]**.
   - Backend re-parses AST and evaluates rules:
     - Compliance: **20.0% → 46.7%** (+26.7%)
     - Risk Score: **92.5 → 41.0** (-51.5)
     - Failed Controls: **39 → 25** (-14)
     - Control Status: `CIS-1.2.1: FAIL → PASS ✓`, `CIS-1.1.2: FAIL → PASS ✓`.
7. **Generate Executive Security Report (`/reports`)**:
   - Generate official printable security audit report with full provenance, framework tables, grounded evidence, and before/after verification deltas.
8. **Demonstrate Multi-Vendor Normalization (`/multi-vendor`)**:
   - Show identical normalized model and compliance results for Juniper JunOS and Fortinet FortiOS.

---

## 4. Local Setup & Production Execution

### Prerequisites
- Python 3.11+ (Python 3.13 tested)
- Node.js 20+ (Node.js 22/24 tested)
- Git

### Backend Setup (FastAPI)
```bash
# Set up virtual environment
python -m venv .venv
# Windows: .venv\Scripts\activate | Linux/macOS: source .venv/bin/activate

# Install dependencies
pip install -r apps/api/requirements.txt

# Run backend API
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Frontend Setup (Next.js 15)
```bash
cd apps/web
npm install

# Run development server
npm run dev
# Open http://localhost:3000
```

### Production Build & Verification
```bash
# 1. Run full backend test suite (113/113 passing)
pytest apps/api/tests -v

# 2. Typecheck frontend (0 errors)
cd apps/web
npx tsc --noEmit

# 3. Production static compilation (25/25 routes)
npm run build
```

---

## 5. Security Architecture & Invariants

| Guardrail | Enforcement Mechanism |
| :--- | :--- |
| **Zero Device Writes** | Air-gapped architecture with zero network push, zero subprocess execution, and zero outbound device credentials. |
| **Deterministic Core** | Deterministic rule engine evaluates 100% of PASS/FAIL compliance findings and risk scores. |
| **Sensitive Redaction** | Cryptographic filter scrubs passwords, hashes, SNMP communities, and private keys from all logs, UI views, and reports. |
| **Property Allowlist** | Adaptive syntax mapping strictly validates candidate properties against `NORMALIZED_PROPERTY_ALLOWLIST`. |
| **Security Headers** | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Content-Security-Policy`. |

---

## 6. Repository Layout

```text
├── apps/
│   ├── api/                     # FastAPI Deterministic Compliance Engine
│   │   ├── app/
│   │   │   ├── api/routes/      # REST API Endpoints (analysis, audits, reports, devices, AI)
│   │   │   ├── core/            # Middleware, Security Headers, Redaction, Error Boundaries
│   │   │   ├── models/          # SQLAlchemy Async Database Entities
│   │   │   ├── schemas/         # Pydantic v2 Request/Response Models
│   │   │   └── services/        # Parsers (Cisco/Jun/Forti), Evaluators, Risk, Remediation
│   │   └── tests/               # 113 Pytest Unit, Integration & Golden-Path Tests
│   └── web/                     # Next.js 15 App Router Frontend (25 Production Routes)
│       ├── src/app/             # Workspaces (dashboard, configurations, findings, risk, remediation, reports)
│       ├── src/components/      # UI Shell, Evidence Viewers, Diffs, Global Search
│       └── src/lib/             # TanStack Query & Canonical API Client
├── data/
│   ├── compliance/              # Unified rule catalogs (CIS, NIST, STIG, ISO)
│   └── demo/                    # Synthetic test fixtures (Cisco, Juniper, Fortinet)
└── README.md
```

---

**NetVigil v1.0.0-RC1** — *National Technical Research Organisation (NTRO) • SIH26155*
