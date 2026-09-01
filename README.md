# NetVigil — Autonomous Network Security Engineer

[![Google Cloud Run](https://img.shields.io/badge/Google%20Cloud%20Run-Serverless-blue?logo=googlecloud)](https://cloud.google.com/run)
[![Gemini 3.5 / 2.5](https://img.shields.io/badge/Gemini-3.5%20%2F%202.5%20Pro-purple?logo=googlegemini)](https://deepmind.google/technologies/gemini/)
[![Google ADK](https://img.shields.io/badge/Google-Agent%20Development%20Kit-emerald)](https://github.com/google/agent-development-kit)
[![Tests](https://img.shields.io/badge/Pytest-251%2F251%20Passing-brightgreen.svg)](https://github.com/mahitss/AI-Driven-Multi-Vendor-Network-Security-Compliance-Auditor)
[![Security](https://img.shields.io/badge/Security-Hardened%20%26%20Isolated-blue.svg)](https://github.com/mahitss/AI-Driven-Multi-Vendor-Network-Security-Compliance-Auditor)
[![Track](https://img.shields.io/badge/Hackathon-Taskmaster%20Track-orange)](https://allthingsagentic.devpost.com/)

> **NetVigil is an autonomous AI security agent that audits multi-vendor network configurations, plans controlled remediation, executes approved changes, and independently verifies the result.**

---

## The Problem

Enterprise critical infrastructure networks are rarely homogeneous. Security operations teams face severe operational bottlenecks:
* **Multi-Vendor Heterogeneity**: Networks mix Cisco IOS, Juniper JunOS, and Fortinet FortiOS with radically different CLI syntax models (hierarchical vs. flat vs. set-based).
* **Fragmented Compliance Auditing**: Cross-checking configurations against regulatory standards (CIS Benchmarks, NIST SP 800-53, DISA STIG) requires manual line-by-line inspection.
* **Manual, Error-Prone Remediation**: Engineers must handcraft syntax-specific CLI remediation blocks under pressure.
* **Lack of Independent Verification**: After changes are deployed, there is rarely automated proof that the security vulnerability was resolved without causing regressions or breaking active services.

---

## The Solution: Autonomous Engineering Lifecycle

NetVigil turns the entire remediation cycle into a reliable, closed-loop autonomous agent workflow:

```text
               NATURAL LANGUAGE OBJECTIVE + CONSTRAINTS
                                  │
                                  ▼
                        AGENT GOAL PLANNING
                                  │
                                  ▼
                    MULTI-VENDOR FLEET DISCOVERY
                                  │
                                  ▼
                 SYNTAX-AWARE AST COMPLIANCE AUDIT
                                  │
                                  ▼
                   DETERMINISTIC RISK PRIORITIZATION
                                  │
                                  ▼
                 ALLOWLISTED REMEDIATION PLANNING
                                  │
                                  ▼
                    HUMAN-IN-THE-LOOP APPROVAL
                                  │
                                  ▼
                    CONTROLLED REMEDIATION PATCH
                                  │
                                  ▼
                 INDEPENDENT RE-ANALYSIS & PROOF
                                  │
                                  ▼
                  FINAL EXECUTIVE SECURITY REPORT
```

---

## Why NetVigil is Truly Agentic (Not Just a Chatbot)

NetVigil is fundamentally built as an autonomous agent system rather than a conversational wrapper:

1. **Autonomous Tool Selection & Multi-Step Execution**: The agent receives a high-level goal (e.g., *"Audit fleet configurations against CIS, fix high-risk issues, but don't modify SSH"*), determines the required tool chain, and orchestrates fleet discovery, parsing, compliance auditing, risk prioritization, and diff generation.
2. **Negative Constraint Enforcement**: The agent extracts operational boundaries (e.g., `action="DO_NOT_MODIFY"`, `subsystem="ssh"`), enforces them server-side, and guarantees that constrained subsystems remain completely untouched.
3. **Structured Approval Gate**: The agent halts at an explicit human-in-the-loop gate, presenting an exact before/after configuration diff and operational impact statement before applying modifications.
4. **Deterministic Authority**: The Gemini LLM provides high-level intent reasoning, planning, and synthesis, while the **deterministic NetVigil parser and compliance catalog remain authoritative** for compliance rules and verification.
5. **Independent Mathematical Verification**: The agent never claims success on its own. It re-parses the AST of modified configurations, re-evaluates all security controls, and produces verifiable proof of $FAIL \rightarrow PASS$ transitions.
6. **Externalized Persistent State**: Execution memory is decoupled from web requests and persisted in Google Cloud Firestore, enabling asynchronous execution resumption across device disconnects and multi-operator review.

---

## Technology Stack

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **Agent Reasoning & LLM** | **Google Gemini 3.5 / 2.5 Pro** | Intent parsing, boundary extraction, remediation reasoning, and reporting. |
| **Agent Framework** | **Google ADK (Agent Development Kit)** | Standardized agent function calling, tool layer, and error recovery. |
| **Cloud Infrastructure** | **Google Cloud Run** | Serverless, containerized API and deterministic compliance execution. |
| **State Persistence** | **Google Cloud Firestore** | Distributed session state, approval tokens, and timeline persistence. |
| **Backend Service** | **FastAPI (Python 3.13 / AsyncIO)** | High-performance asynchronous REST API. |
| **Compliance Engine** | **NetVigil Deterministic Core** | Multi-vendor AST parsers, USM normalizer, and CIS/NIST rule evaluators. |
| **Frontend Workspace** | **Next.js 15 (React 19 / TypeScript)** | Autonomous Security Console, live activity timeline, visual diffs. |
| **Styling & Icons** | **TailwindCSS & Lucide Icons** | Cybersecurity SaaS dark interface. |

---

## System Architecture

```text
                         OPERATOR / SECURITY ENGINEER
                                      │
                                      ▼
                        NETVIGIL CONSOLE (Next.js 15)
                                      │
                                      ▼
                        GOOGLE CLOUD (Cloud Run)
                                      │
                        ┌─────────────┴─────────────┐
                        ▼                           ▼
              GEMINI 3.5 / 2.5 + ADK         NETVIGIL ENGINE
             (Goal & Plan Reasoning)        (Deterministic Core)
                        │                           │
                        └─────────────┬─────────────┘
                                      │
                        ┌─────────────┴─────────────┐
                        ▼                           ▼
                 AGENT TOOL LAYER            AST COMPLIANCE
              (Analyze, Patch, Verify)      (Cisco/Juniper/Forti)
                        │                           │
                        └─────────────┬─────────────┘
                                      │
                        ┌─────────────┴─────────────┐
                        ▼                           ▼
              GOOGLE CLOUD FIRESTORE        PERSISTENT INVENTORY
              (Session State & Memory)      (Configs & AST Database)
```

---

## Security Architecture & Guardrails

* **LLM Isolation**: Gemini is strictly isolated from raw execution. It cannot execute arbitrary network commands or system binaries.
* **Allowlisted Remediation Only**: Modifications are restricted to predefined, deterministic allowlist templates (e.g., protocol disabling, password encryption, transport restrictions).
* **Server-Side Approval Enforcement**: Approval tokens and policy constraints are validated authoritatively on the backend.
* **Zero Trust Verification**: Verification requires AST re-parsing and deterministic rule evaluation. The agent cannot self-certify compliance without passing the test suite.
* **Safe Diagnostics**: System health probes report component operational status without leaking credentials or internal tokens.

---

## Quick Start & Local Setup

### Prerequisites
* Python 3.11+ (Python 3.13 recommended)
* Node.js 18+ (Node.js 20/22 recommended)
* Git

### 1. Clone & Configure
```bash
git clone https://github.com/mahitss/AI-Driven-Multi-Vendor-Network-Security-Compliance-Auditor.git
cd AI-Driven-Multi-Vendor-Network-Security-Compliance-Auditor

# Copy environment configuration
cp .env.example .env
```

### 2. Backend Setup
```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r apps/api/requirements.txt

# Start FastAPI backend
cd apps/api
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup
```bash
# In a new terminal window:
cd apps/web
npm install
npm run dev
```

### 4. Launch Autonomous Console
Open your browser and navigate to: **`http://localhost:3000/agent`**.

---

## Automated Test Suite

Run the full automated test suite (147 tests covering parsers, compliance, risk scoring, ADK tools, and the autonomous workflow):

```bash
# Run complete test suite
pytest apps/api/tests -v

# Run agent autonomous workflow tests specifically
pytest apps/api/tests/test_agent_workflow.py -v
```

---

## Resetting Demo State

To reset all configurations, findings, and agent memory back to the canonical baseline:

```bash
python scripts/reset-demo.py
```

---

## Google Cloud Deployment

NetVigil is fully containerized and deployable to **Google Cloud Run**:

```bash
# Set your Google Cloud project
export GCP_PROJECT="your-gcp-project-id"
export GCP_REGION="us-central1"

# 1-Click Automated Deployment
chmod +x deploy-cloudrun.sh
./deploy-cloudrun.sh
```

---

## Hackathon Submission Highlights

* **Track**: Taskmaster (Autonomous real-world network security engineering).
* **Autonomous Utility**: Discovers fleet configurations, isolates high-risk P0/P1 issues, generates allowlisted diffs, respects negative constraints (e.g. *don't modify SSH*), requires approval, applies fixes, and verifies resolution via AST re-analysis.
* **Architecture Rigor**: Deterministic compliance core coupled with Gemini 3.5 reasoning, Google ADK tool layer, and Cloud Run serverless hosting.
* **Production Integrity**: 147/147 passing tests, zero hardcoded secrets, and decoupled Firestore state management.
