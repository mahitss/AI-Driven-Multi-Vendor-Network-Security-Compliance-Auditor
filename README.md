# NetVigil — AI-Driven Multi-Vendor Network Security Compliance Auditor

**Problem Statement:** SIH26155  
**Title:** AI-Driven Multi-Vendor Network Security Compliance Auditor  
**Organization:** National Technical Research Organisation (NTRO)  
**Category:** Software  
**Theme:** Blockchain & Cybersecurity  

---

## 1. Executive Summary & Problem

Modern enterprise and critical national infrastructure networks are composed of heterogeneous equipment from multiple vendors (e.g., Cisco, Juniper, Fortinet). Network engineers frequently grapple with vendor-specific configuration syntaxes, disparate CLI idioms, and evolving compliance mandates (CIS Benchmarks, NIST SP 800-53, DISA STIG, ISO 27001).

Auditing these complex environments manually is labor-intensive, error-prone, and slow. Conversely, delegating compliance decisions directly to raw Large Language Models (LLMs) is dangerous due to non-deterministic outputs, hallucinations, and lack of auditable evidence.

### The NetVigil Solution

NetVigil resolves this challenge through a **strict architectural separation**:
1. **Deterministic Core:** Deterministic vendor detection, AST/regex parsing, Universal Security Normalization into a canonical schema, and mathematically verifiable rule checks with exact line-by-line evidence.
2. **AI Co-pilot Layer:** Human-in-the-loop explanation, obscure syntax translation, and vendor-specific remediation synthesis.

> **Critical Principle:** The deterministic engine makes all final PASS/FAIL compliance decisions. The LLM acts strictly as an advisory co-pilot.

---

## 2. System Architecture

```text
+-------------------------------------------------------------------------------+
|                            NETVIGIL PIPELINE FLOW                             |
|                                                                               |
|  [Raw Configuration] (.cfg / .conf / .txt / .log)                             |
|          |                                                                    |
|          v                                                                    |
|  [Ingestion & Security Layer]                                                 |
|    - Path traversal protection & filename sanitization                        |
|    - SHA-256 cryptographic digest computation                                 |
|    - Secure isolated storage persistence                                      |
|          |                                                                    |
|          v                                                                    |
|  [Deterministic Multi-Vendor Signature Detector]                              |
|    - Cisco IOS / IOS-XE / NX-OS                                               |
|    - Juniper JunOS (Hierarchical & Set syntax)                                 |
|    - Fortinet FortiOS (FortiGate block syntax)                                |
|          |                                                                    |
|          v                                                                    |
|  [Universal Security Normalization Schema (Pydantic v2)]                      |
|    - Identity, Authentication, Remote Access, Access Control, Logging,        |
|      Encryption, Time Sync, Services, Management, Network Security            |
|          |                                                                    |
|          v                                                                    |
|  [Deterministic Compliance Evaluation Engine] (CIS, NIST, STIG, ISO)          |
|          |                                                                    |
|          +----------------------------+                                       |
|          |                            |                                       |
|          v                            v                                       |
|  [Evidence-Based Findings]     [AI Co-pilot Layer (OpenRouter / Air-gapped)]  |
|    - Verbatim line proof         - Syntax semantic translation                |
|    - Expected vs actual state    - Vendor CLI remediation scripts             |
|    - Strict severity score       - Executive report generation                |
+-------------------------------------------------------------------------------+
```

---

## 3. Current Capabilities (Day 1 Foundation)

The following capabilities are fully implemented and verified:

* **Clean Monorepo Infrastructure:** FastAPI backend (`apps/api`), Next.js 15 App Router frontend (`apps/web`), and Docker Compose container orchestration.
* **Cryptographic Ingestion Engine:** `POST /api/v1/configurations` multi-part upload with SHA-256 calculation, file extension validation (`.cfg`, `.conf`, `.txt`, `.log`), and safe storage.
* **Deterministic Vendor Detection:** Weighted multi-pattern signature detector identifying Cisco IOS/IOS-XE, Juniper JunOS, and Fortinet FortiOS with confidence scores.
* **Universal Security Schema:** Strongly-typed Pydantic v2 canonical schema covering 11 vendor-neutral network security domains.
* **Relational Database Domain:** PostgreSQL / SQLAlchemy 2 async models for Users, Devices, Configurations, Frameworks, Controls, Audits, Findings, and Training Mappings with complete Alembic migrations.
* **Structured System Health:** `/health` endpoint returning system state, active version, component readiness, and database latency.
* **Structured Error Architecture:** Standardized error envelopes with correlation IDs (`X-Request-ID`) and zero secret or path leakage.
* **Enterprise Cyber Web UI:** Dark matte cybersecurity interface with live ingestion workspace, client-side SHA-256 pre-calculation, sample loader, and full application navigation.
* **Automated Test Suite:** 20 comprehensive unit and integration tests passing with 100% success.

---

## 4. Local Setup & Execution

### Prerequisites
- Python 3.11+ (Python 3.13 tested)
- Node.js 20+ (Node.js 24 tested)
- Git
- Docker & Docker Compose (Optional for containerized run)

---

### Step 1: Clone and Configure Environment

```bash
# Clone the repository
git clone https://github.com/your-org/netvigil.git
cd netvigil

# Copy environment configuration
cp .env.example .env
```

---

### Step 2: Backend Setup & Tests

```bash
# Create and activate virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install backend dependencies
pip install -r apps/api/requirements.txt

# Run database migrations
alembic -c apps/api/alembic.ini upgrade head

# Run backend automated test suite
pytest apps/api/tests -v

# Start FastAPI backend server (port 8000)
uvicorn app.main:app --app-dir apps/api --host 0.0.0.0 --port 8000 --reload
```

Backend endpoints will be live at:
- **API Base:** `http://localhost:8000`
- **Health Check:** `http://localhost:8000/health`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`

---

### Step 3: Frontend Web UI Setup

```bash
# Navigate to web application directory
cd apps/web

# Install frontend dependencies
npm install

# Start Next.js development server (port 3000)
npm run dev
```

Frontend application will be accessible at:
- **Web UI:** `http://localhost:3000`

---

### Step 4: Docker Compose Setup (Optional)

To start the full PostgreSQL database, FastAPI API, and Next.js Web UI in containers:

```bash
docker compose up --build
```

---

## 5. Sample Network Configurations

Sample configurations are provided in `data/sample-configs/`:
- `data/sample-configs/cisco_ios_core_switch.cfg` — Cisco Catalyst 9300 core switch configuration.
- `data/sample-configs/juniper_srx_firewall.conf` — Juniper SRX345 perimeter firewall configuration.
- `data/sample-configs/fortinet_fortigate_edge.conf` — FortiGate 60F edge gateway configuration.

---

## 6. Environment Variables Reference

See `.env.example` for all configurable parameters:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | Async database connection URL | `sqlite+aiosqlite:///./netvigil.db` |
| `SYNC_DATABASE_URL` | Sync database URL for Alembic | `sqlite:///./netvigil.db` |
| `STORAGE_PATH` | Directory for ingested configuration files | `./storage/uploads` |
| `MAX_FILE_SIZE_MB` | Maximum allowed configuration size | `10` |
| `ALLOWED_EXTENSIONS`| Comma-separated list of permitted extensions | `.cfg,.conf,.txt,.log` |
| `OPENROUTER_API_KEY`| API key for LLM explanation co-pilot | `""` (mock fallback if empty) |
| `NEXT_PUBLIC_API_BASE_URL` | API base URL for frontend client | `http://localhost:8000` |

---

## 7. Verification Commands Summary

| Task | Command |
| :--- | :--- |
| **Run Backend Tests** | `pytest apps/api/tests -v` |
| **Run Migrations** | `alembic -c apps/api/alembic.ini upgrade head` |
| **Build Web UI** | `cd apps/web && npm run build` |
| **Start API** | `uvicorn app.main:app --app-dir apps/api --port 8000` |
| **Start Web** | `cd apps/web && npm run dev` |

---

## 8. License

This project is licensed under the MIT License — see the [LICENSE](file:///c:/Users/pc/OneDrive/Desktop/SIH2026/LICENSE) file for details.
