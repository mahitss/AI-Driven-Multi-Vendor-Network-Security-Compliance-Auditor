# NetVigil — AI-Driven Multi-Vendor Network Security Compliance Auditor

[![CI Pipeline](https://github.com/mahitss/AI-Driven-Multi-Vendor-Network-Security-Compliance-Auditor/actions/workflows/ci.yml/badge.svg)](https://github.com/mahitss/AI-Driven-Multi-Vendor-Network-Security-Compliance-Auditor/actions)
[![Tests](https://img.shields.io/badge/Pytest-88%2F88%20Passing-brightgreen.svg)](https://github.com/mahitss/AI-Driven-Multi-Vendor-Network-Security-Compliance-Auditor)
[![Release](https://img.shields.io/badge/Release-v1.0.0--SIH2026--RC1-blue.svg)](https://github.com/mahitss/AI-Driven-Multi-Vendor-Network-Security-Compliance-Auditor)
[![Organization](https://img.shields.io/badge/Organization-NTRO-red.svg)](https://github.com/mahitss/AI-Driven-Multi-Vendor-Network-Security-Compliance-Auditor)

**Problem Statement ID:** SIH26155  
**Title:** AI-Driven Multi-Vendor Network Security Compliance Auditor  
**Organization:** National Technical Research Organisation (NTRO)  
**Theme:** Blockchain & Cybersecurity | **Category:** Software  
**Release Candidate:** `v1.0.0-SIH2026-RC1`  

---

## 1. Executive Summary & Problem

Modern enterprise and critical national infrastructure networks are composed of heterogeneous equipment from multiple vendors (e.g., Cisco, Juniper, Fortinet). Network engineers frequently struggle with disparate CLI idioms, proprietary syntax structures, and evolving compliance mandates (**CIS Benchmarks**, **NIST SP 800-53**, **DISA STIG**, **ISO/IEC 27001**).

Manual auditing is slow and error-prone, while raw Large Language Models (LLMs) hallucinate non-existent controls and produce non-deterministic results.

### The NetVigil Solution
NetVigil enforces a **strict architectural separation**:
1. **Deterministic Compliance Core**: Vendor detection, AST parsing, Universal Security Model normalization, mathematical compliance scoring, line-level evidence preservation, and allowlisted remediation templates.
2. **AI Intelligence Layer**: Context-grounded audit assistance, evidence-based technical explanations, and unparsed syntax interpretation.
3. **Adaptive Training System**: Human-in-the-loop syntax learning with strict allowlists, enabling zero-downtime knowledge expansion without backend code modification.

> **Zero Hallucination Invariant:** The deterministic engine makes 100% of PASS/FAIL compliance decisions. The AI layer can never mutate compliance findings or audit scores.

---

## 2. System Architecture

```text
  Raw Configuration (.cfg, .conf, .txt)
                    │
                    ▼
   Deterministic Vendor Detection (Cisco, Juniper, Fortinet)
                    │
                    ▼
     Multi-Vendor AST Parser & Lexer
                    │
                    ▼
   Universal Security Model Normalization (8 Canonical Domains)
                    │
                    ▼
   Deterministic Compliance Engine (CIS / NIST / STIG / ISO)
                    │
                    ├──────────────────────┬──────────────────────┬──────────────────────┐
                    ▼                      ▼                      ▼                      ▼
           Findings & Evidence     Risk Intelligence     Vendor Remediation      Adaptive Training
         (Verbatim Line Citations)  (P0-P3 Prioritization) (Allowlisted Diffs)     (HITL Syntax Learning)
                    │                      │                      │                      │
                    └──────────────────────┴──────────┬───────────┴──────────────────────┘
                                                      ▼
                                   Professional SOC Operations Dashboard
                                        & Executive Report Generator
```

---

## 3. Key Capabilities & Modules

| Module | Technical Capabilities |
| :--- | :--- |
| **Vendor Detection** | Signature-based confidence scoring for Cisco IOS/IOS-XE, Juniper JunOS (hierarchical & set syntax), and Fortinet FortiOS. |
| **AST Parser** | Extracts structured security facts while preserving unparsed syntax for adaptive learning. |
| **Universal Normalizer** | Standardizes vendor facts into 8 canonical domains: `remote_access`, `authentication`, `authorization`, `logging`, `time_sync`, `access_control`, `network_security`, and `services`. |
| **Compliance Engine** | Mathematically evaluates 60+ rules across CIS, NIST, DISA STIG, and ISO 27001 with 100% reproducibility and exact line citations. |
| **Risk Intelligence** | Correlates findings into composite risks scored 0–100 and prioritized into P0 (Immediate Danger), P1 (High), P2 (Medium), and P3 (Low). |
| **Remediation Center** | Generates verified CLI fix scripts with visual diffs (`REMOVE`/`ADD`), review sign-offs, and a strict **Zero Automated Execution Policy**. |
| **AI Co-Pilot** | Natural language audit assistant grounded in actual session findings, with 1-click grounded explanations for failed controls. |
| **Adaptive Training** | Learns unparsed CLI directives via AI classification, property allowlist guards, and administrator review with audit logging. |
| **SOC Dashboard** | Real-time posture score cards, historical score trend deltas, device drawers, global cross-entity search (`Ctrl+K`), and official printable compliance reports. |

---

## 4. Local Setup & Quick Start

### Prerequisites
- Python 3.11+ (Python 3.13 tested)
- Node.js 20+ (Node.js 22/24 tested)
- Git

### Step 1: Clone Repository
```bash
git clone https://github.com/mahitss/AI-Driven-Multi-Vendor-Network-Security-Compliance-Auditor.git
cd AI-Driven-Multi-Vendor-Network-Security-Compliance-Auditor
```

### Step 2: Configure Environment
```bash
cp .env.example .env
```

### Step 3: Set Up Backend
```bash
# Create and activate virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r apps/api/requirements.txt
```

### Step 4: Seed Demo Dataset (Instant Presentation State)
```bash
python seed_demo.py
```

### Step 5: Run Servers
```bash
# Terminal 1: Backend API (Port 8000)
cd apps/api
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend Dashboard (Port 3000)
cd apps/web
npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## 5. Automated Testing & Verification

The test suite includes **70 automated tests** covering unit, integration, security, and the complete 12-stage golden-path lifecycle:

```bash
# Run complete test suite
pytest apps/api/tests -v
```

```text
============================= test session starts =============================
collected 70 items

apps/api/tests/test_golden_path_e2e.py::test_netvigil_complete_golden_path_lifecycle PASSED
apps/api/tests/test_cross_vendor_compliance_equivalence.py PASSED
apps/api/tests/test_adaptive_learning_end_to_end.py PASSED
apps/api/tests/test_risk_and_remediation_end_to_end.py PASSED
apps/api/tests/test_operations_dashboard.py PASSED
...
======================== 70 passed, 1 warning in 3.47s ========================
```

---

## 6. Project Structure

```text
├── apps/
│   ├── api/                     # FastAPI Backend Application
│   │   ├── app/
│   │   │   ├── api/routes/      # REST API Endpoints (audits, devices, reports, AI, training)
│   │   │   ├── core/            # Configuration, Security & Redaction Utilities, Errors
│   │   │   ├── models/          # SQLAlchemy Async Database Entities
│   │   │   ├── schemas/         # Pydantic v2 Request/Response Models
│   │   │   └── services/        # Parsers, Compliance, Risk, Remediation, AI, Training
│   │   └── tests/               # 70 Pytest Unit, Integration & Golden-Path Tests
│   └── web/                     # Next.js 15 App Router Frontend
│       ├── src/app/             # 18 Static Routes & SOC Workspaces
│       ├── src/components/      # UI, Navigation, Modals, Global Search, Charts
│       └── src/lib/             # TanStack Query & REST API Client
├── data/
│   ├── compliance/              # Unified multi-framework rule catalogs (CIS, NIST, STIG, ISO)
│   └── demo/                    # Synthetic multi-vendor configuration fixtures (Cisco, Juniper, Fortinet)
├── docs/                        # Complete architecture, ADRs, demo scripts, evaluator Q&A
├── seed_demo.py                 # 1-Command database & demo dataset seeder
├── docker-compose.yml           # Containerized multi-service deployment
└── README.md
```

---

## 7. Security Invariants & Guarantees

1. **Zero Automated Execution:** NetVigil contains zero `subprocess`, `os.system`, or SSH automated push mechanisms. All remediations are strictly preview-only with visual diffs.
2. **Allowlisted Training Property Paths:** Adaptive training validates candidate properties against `NORMALIZED_PROPERTY_ALLOWLIST`, preventing arbitrary path injection.
3. **Sensitive Data Redaction:** Passwords, hashes, SNMP strings, and private keys are redacted from logs and AI prompts.
4. **Air-Gap Capability:** Fully functional in air-gapped environments without external internet connectivity.

---

## 8. SIH Documentation Links

- [Complete Technical Architecture](docs/architecture/architecture.md)
- [Architecture Decision Records (ADRs 001–005)](docs/architecture/adr/)
- [SIH 2-Page Executive Architecture Summary](docs/sih-architecture-summary.md)
- [Demo Dataset & Evaluation Guide](docs/demo.md)
- [2-Minute Presentation Demo Script](docs/demo-script.md)
- [Evaluator Technical Q&A Guide](docs/judge-questions.md)
- [SIH Deliverables Checklist](docs/sih-checklist.md)

---

**NetVigil v1.0.0-SIH2026** — *National Technical Research Organisation (NTRO)*
