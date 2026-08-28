# NetVigil — Final SIH/NTRO Judge-Ready Demo Package

**Problem Statement ID:** SIH26155  
**Title:** AI-Driven Multi-Vendor Network Security Compliance Auditor  
**Organization:** National Technical Research Organisation (NTRO)  
**Theme:** Blockchain & Cybersecurity | **Category:** Software  
**Release:** `v1.0.0-RC1`  
**Current System Status:** `143/143 Pytests Passing` | `29/29 Next.js Routes Compiled` | `0 TypeScript Errors`

---

## 1. Demo Environment Setup & Startup Procedure

### Prerequisites
- Python 3.13+ (`.venv`)
- Node.js 20+ / npm
- Local storage directory: `./storage/uploads` (auto-created)

### 1.1 Backend Startup
```powershell
# In repository root
c:\Users\pc\OneDrive\Desktop\SIH2026\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir apps/api --host 127.0.0.1 --port 8000
```
- **Port:** `8000`
- **Health Check Probe:** `http://127.0.0.1:8000/health` (Returns `{"status": "healthy", "service": "NetVigil"}`)
- **Database Initialization:** SQLite fallback (`sqlite+aiosqlite:///./netvigil.db`) or PostgreSQL 16. Schema and canonical multi-vendor demo dataset are automatically and idempotently provisioned on startup via `seed_database_if_empty`.

### 1.2 Frontend Startup
```powershell
# In repository root or apps/web
cd apps/web
npm start
```
- **Port:** `3000`
- **Web URL:** `http://localhost:3000` (or `http://127.0.0.1:3000`)

### 1.3 Authentication & Demo Mode
- **Google OAuth:** Configured via Supabase (`/login` $\rightarrow$ Sign in with Google $\rightarrow$ `/auth/callback` $\rightarrow$ `/dashboard`).
- **Demo / Offline Mode:** Instant one-click demo login button on `/login` and direct header access for air-gapped judge environments.

---

## 2. Canonical Demo Data Fixtures

| Demo Tier | Vendor & Target Device | Insecure Baseline Fixture | Hardened / Remediated Fixture |
| :--- | :--- | :--- | :--- |
| **Primary Demo** | **Cisco IOS** (Border Gateway Router) | `data/sample-configs/cisco/insecure-router.cfg` | `data/sample-configs/cisco/secure-router.cfg` |
| **Secondary Demo** | **Juniper JunOS** (SRX Security Gateway) | `data/sample-configs/juniper/insecure-srx.conf` | `data/sample-configs/juniper/secure-srx.conf` |
| **Third Demo** | **Fortinet FortiOS** (Edge NGFW) | `data/sample-configs/fortinet/insecure-firewall.conf` | `data/sample-configs/fortinet/secure-firewall.conf` |

---

## 3. Five-Minute Operator Demo Script

| Timestamp | Route & Screen | Action & Buttons | Expected UI Result | Presenter Key Spoken Sentence |
| :--- | :--- | :--- | :--- | :--- |
| **00:00** | `/login` | Click **Sign In with Google** (or Demo Access) | Authenticates session via Supabase JWT | *"NetVigil secures multi-vendor critical infrastructure through deterministic compliance audits."* |
| **00:30** | `/dashboard` | View Security Posture Dashboard | Displays live fleet compliance gauge, P0-P3 risk exposure, and framework radars | *"At a glance, security operators see active compliance posture, open high-priority risks, and multi-framework coverage."* |
| **01:00** | `/configurations` | Click **[ Ingest Configuration ]**, select `cisco/insecure-router.cfg` | SHA-256 fingerprint generated; Cisco IOS vendor detected with 100% confidence | *"NetVigil ingests raw configurations, calculates cryptographic hashes, and automatically identifies the vendor grammar."* |
| **01:30** | `/configurations` | Click **[ Run Multi-Framework Audit ]** (CIS, NIST, STIG, ISO) | Evaluates 60 rules in ~270ms. Baseline compliance: **20.0%**, Composite Risk: **92.5 (P0 Critical)** | *"Our parser extracts concrete AST facts and evaluates multi-standard rules with mathematical determinism."* |
| **02:00** | `/findings` | Click finding **CIS-1.2.1** (SSH Version 2) | Jump-scrolls to exact line in configuration viewer (`ip ssh version 1`) with explanation | *"Notice our first core invariant: every single failed control links directly to verbatim line-level AST proof."* |
| **02:45** | `/risk` | Click **Risk Intelligence** tab | Correlated risk graph appears with composite P0 risks (e.g. Insecure Management Plane) | *"Instead of flooding analysts with disjointed alerts, NetVigil deterministically groups findings into composite risk vectors."* |
| **03:15** | `/remediation` | View allowlisted remediation patch for Cisco router | Displays color-coded Before/After CLI diff; highlights `NETWORK PUSH: DISABLED` badge | *"NetVigil generates allowlisted, syntactically valid remediation commands without ever attempting dangerous live write access."* |
| **03:45** | `/remediation` | Click **[ Re-Analyze with Remediation ]** | Immediate re-audit: Compliance jumps **20.0% $\rightarrow$ 53.3%**; Risk drops **92.5 $\rightarrow$ 41.0**; Controls transition `FAIL → PASS ✓` | *"With one click, re-analysis proves mathematically whether the proposed patch resolves the vulnerability."* |
| **04:15** | `/reports` | Click **[ Generate Executive Report ]** | Formats official NTRO-ready assessment report with score breakdown and timeline | *"Security leadership receives audit-ready executive and technical compliance reports."* |
| **04:40** | `/multi-vendor` | Select **Juniper** and **Fortinet** tabs | Displays identical Universal Security Model normalization across Cisco, JunOS, and FortiOS | *"The Universal Security Model maps vendor-specific syntaxes to shared compliance standards seamlessly."* |
| **05:00** | `/ai-boundary` & `/ai-security-briefing` | Show AI Boundary architecture & open Analyst Copilot | AI Advisory banner displayed; queries answered with clickable `[EVIDENCE · LINE X]` citations | *"AI acts purely as an advisory copilot for human analysts—it is physically isolated from deciding compliance verdicts."* |

---

## 4. Presenter Core Talking Points

1. **Syntax Heterogeneity**: *"Cisco uses `line vty`, Juniper uses `set system services`, and Fortinet uses `config system admin`. NetVigil normalizes all of them into a canonical Universal Security Model."*
2. **Deterministic Integrity**: *"Security decisions must never be a probabilistic coin toss. Every compliance score and risk metric is calculated deterministically by our AST rule engine."*
3. **Line-Level Proofs**: *"We don't just say 'SSH is insecure'. We pinpoint Line 16: `ip ssh version 1` with verifiable AST proof."*
4. **Independent Risk Graph**: *"Risk scoring is derived from exposure, impact, and asset criticality—completely independent of third-party AI models."*
5. **Advisory Safety Boundary**: *"NetVigil enforces zero device-write capability. We produce allowlisted diffs for human engineer authorization."*
6. **Re-Analysis Verification**: *"Our re-analysis engine eliminates guesswork by proving posture improvement before deploying patches to physical devices."*
7. **AI Isolation Guardrail**: *"AI explains findings in plain language, but the compliance verdict (PASS/FAIL) and score are mathematically immutable."*

---

## 5. The Four "WOW" Moments

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ WOW MOMENT #1: Configuration Ingestion → Deterministic Findings                 │
│ Ingesting raw CLI text triggers AST extraction and evaluates 60 controls across │
│ CIS, NIST, STIG, and ISO in under 300ms with zero ambiguity.                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│ WOW MOMENT #2: Finding → Line-Level Verbatim Evidence Citation                  │
│ Clicking any finding in Evidence Explorer instantly highlights the exact line   │
│ of code in the raw configuration with AST context.                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│ WOW MOMENT #3: Remediation Diffs → Verified Posture Evolution                   │
│ Clicking 'Re-Analyze with Remediation' runs a before/after audit simulation:    │
│ Compliance climbs +33.3%, Critical P0 risk drops, and controls flip to PASS ✓. │
├─────────────────────────────────────────────────────────────────────────────────┤
│ WOW MOMENT #4: Universal Security Model (USM) Cross-Vendor Equivalence          │
│ Switching between Cisco, Juniper, and Fortinet views proves that disparate CLI  │
│ syntaxes normalize into identical, standard-aligned security properties.        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Comprehensive Judge Q&A Guide

### Q1: Why is this different from existing configuration scanners?
**Answer:** Traditional scanners rely on brittle regex scripts that break on formatting variations and produce false positives. NetVigil parses configurations into vendor-specific **Abstract Syntax Trees (ASTs)** and normalizes them into a **Universal Security Model (USM)**. This enables multi-standard compliance evaluation (CIS, NIST, STIG, ISO) with line-level evidence grounding, composite risk correlation, and before/after remediation re-analysis.

### Q2: Why use a Universal Security Model (USM)?
**Answer:** Without a normalized intermediate representation, auditing 3 vendors against 4 compliance frameworks requires writing $3 \times 4 = 12$ separate rule engines. With USM, we write $3$ parsers that map into 8 canonical security domains, and evaluate compliance rules once across all vendors ($3 + 4 = 7$).

### Q3: Why is AI not allowed to decide compliance?
**Answer:** LLMs suffer from non-determinism, hallucinations, and probabilistic scoring drifts. In mission-critical national security (NTRO), compliance verdicts and risk metrics must be legally defensible, reproducible, and verifiable. The deterministic AST engine makes all decisions; AI is strictly restricted to advisory explanations.

### Q4: How do you prevent prompt injection?
**Answer:** All raw configuration text is pre-sanitized (passwords, hashes, and secrets redacted) and strictly encapsulated within `<untrusted_configuration_data>` XML fences with system prompt instructions to treat payload contents purely as passive text data. Furthermore, AI outputs cannot override database compliance scores.

### Q5: Can NetVigil modify a live router or firewall?
**Answer:** **No.** NetVigil enforces an air-gapped safety boundary: `NETWORK PUSH: DISABLED (READ-ONLY ADVISORY)`. The system contains zero SSH, Telnet, Paramiko, or Netmiko libraries. It generates allowlisted CLI diffs for human operators to review and apply through standard change-management pipelines.

### Q6: How are findings traced to configuration evidence?
**Answer:** During lexical analysis, each AST node records its `start_line` and `end_line`. When a compliance rule evaluates an AST node, it captures the exact source line numbers and snippet, storing them as immutable finding metadata returned in the API and highlighted in the UI.

### Q7: How do you prevent cross-user or cross-audit data leakage?
**Answer:** Multi-tenant scoping and explicit foreign key relationships (`audit_id`, `configuration_id`) are enforced on every database query. API endpoints validate resource ownership and unassigned queries return clean `404 Not Found`.

### Q8: How does multi-vendor support work?
**Answer:** NetVigil features dedicated AST parsers for Cisco IOS, Juniper JunOS (both hierarchical brace and `set` syntax), and Fortinet FortiOS (`config`/`edit`/`set`). All parsers extract facts into the Universal Security Model schema.

### Q9: How do you calculate risk?
**Answer:** Risk scoring is completely deterministic and algorithmic (0–100 scale). It correlates finding severities (Critical, High, Medium, Low), asset exposure (Internet-Facing vs Management Plane), and impact likelihood, mapping composite exposures into prioritized bands: **P0 (Critical)**, **P1 (High)**, **P2 (Medium)**, and **P3 (Low)**.

### Q10: How does remediation verification work?
**Answer:** NetVigil applies the allowlisted patch to the baseline AST in memory, generating a remediated virtual configuration. It immediately runs the compliance and risk engines against this virtual config to calculate the exact delta (e.g. `+33.3%` score, resolved controls count) before presenting it to the engineer.

### Q11: What happens if the API goes offline?
**Answer:** The Next.js frontend catches network dropouts gracefully and surfaces a clear offline warning banner with retry controls. It never displays stale or fabricated security metrics.

### Q12: How would this scale to thousands of devices?
**Answer:** AST parsing and rule evaluation are asynchronous, stateless, and execute in under 300ms per config. The backend scales horizontally behind an async task queue (e.g. Celery/Redis) and stores partitioned audit data in PostgreSQL.

### Q13: Why Supabase?
**Answer:** Supabase provides secure Google OAuth integration and JWT session management that verifies client identity while allowing the backend FastAPI service to validate claims independently via asymmetric JWT signatures.

### Q14: What happens in an air-gapped environment?
**Answer:** The entire deterministic compliance core (AST parsing, USM normalization, rule evaluation, risk scoring, remediation diffs, and report generation) operates 100% locally with zero internet dependencies. For air-gapped AI assistance, NetVigil falls back to its deterministic `OfflineStandbyProvider` or connects to local Ollama / vLLM instances.

### Q15: What is the next production step?
**Answer:** Transitioning from `v1.0.0-RC1` to full enterprise deployment: connecting automated syslog / git-backed config repositories (GitOps pipeline), integrating enterprise SIEM webhooks (Splunk, Sentinel), and expanding STIG rule libraries.

---

## 7. Architecture Diagram

```
                 RAW NETWORK CONFIGURATION (.cfg, .conf, .set)
                                       │
                                       ▼
                       SHA-256 Fingerprint & Ingestion
                                       │
                                       ▼
                        Deterministic Vendor Detector
                   (Cisco IOS / Juniper JunOS / Fortinet)
                                       │
                                       ▼
                         Multi-Vendor AST Parser
                                       │
                                       ▼
                    Universal Security Model (USM) Schema
                        (8 Canonical Security Domains)
                                       │
                                       ▼
                  Deterministic Compliance Engine (CIS / NIST / STIG / ISO)
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
 Line-Level Evidence Citations                       Algorithmic Risk Engine
(Exact Configuration Lines)                              (P0-P3, 0-100 Score)
            │                                                     │
            └──────────────────────────┬──────────────────────────┘
                                       │
                                       ▼
                     Allowlisted Remediation Diff Generator
                     (Read-Only SOC Patch Recommendations)
                                       │
                                       ▼
                       Re-Analysis & Verification Engine
                     (Before -> After Score Delta Proof)
                                       │
                                       ▼
                   Official Executive Compliance Reports (/reports)

 ═══════════════════════════════════════════════════════════════════════════════
   STRICT AI ADVISORY BOUNDARY (ISOLATED FROM AUTHORITATIVE DECISION PATH)
 ═══════════════════════════════════════════════════════════════════════════════
       Deterministic Facts (Redacted) ──► <untrusted_configuration_data>
                                                       │
                                                       ▼
                                          Multi-Model AI Gateway
                                         (Nemotron / Qwen / GPT)
                                                       │
                                                       ▼
                                         Advisory Natural Language
                                        Explanations & Copilot Q&A
                                                       │
                                                       ▼
                                                 Human Analyst
```

---

## 8. Demo Failure Recovery Matrix

| Potential Issue | Symptom | Fastest Recovery Step | Expected UI State | Backup Demonstration Path |
| :--- | :--- | :--- | :--- | :--- |
| **A. Google OAuth Fails** | Supabase login redirect blocks | Click **[ Continue with Demo Account ]** on `/login` | Bypasses OAuth redirect and loads demo user session immediately | Use pre-authenticated session |
| **B. Backend Offline** | Red disconnected pill in header | Run `python -m uvicorn app.main:app --app-dir apps/api --port 8000` | Header updates to green `CONNECTED (v0.1.0)` | Restart backend process |
| **C. Database Lock/Issue** | 500 error on upload | Delete `netvigil.db` and restart backend (auto-reseeds in 1s) | Fresh demo state restored | Restart backend daemon |
| **D. Audit Request Times Out** | Spinner on audit run | Re-click **[ Run Multi-Framework Audit ]** | Completes in ~270ms | Select pre-computed audit session from history dropdown |
| **E. AI Provider Rate-Limited** | OpenRouter returns HTTP 402/429 | System automatically switches to built-in `OfflineStandbyProvider` | Displays structured briefing with offline badge | Offline briefing is 100% operational |
| **F. Browser Refresh** | Page reloads to blank | React state recovers from URL params and localStorage | Reloads active audit session cleanly | Navigate via sidebar links |

---

## 9. Air-Gapped & Offline Fallback

The NetVigil platform is fully functional in an air-gapped environment without active internet:
1. **Core Audits:** 100% offline deterministic rule evaluation.
2. **Multi-Vendor Engine:** All parsers run in-memory inside Python.
3. **Remediation & Re-Analysis:** In-memory diff and virtual AST re-audit.
4. **AI Explanations:** `OfflineStandbyProvider` generates structured natural language explanations directly from rule templates without calling external APIs.

---

## 10. Current Verified Metrics

```text
================================================================================
CURRENT VERIFIED GOLDEN DEMO METRICS (v1.0.0-RC1)
================================================================================
• Backend Automated Test Suite : 143 / 143 PASSED (100% pass rate in 27.8s)
• Frontend Next.js Routes      : 29 / 29 Routes Compiled Successfully
• TypeScript Compilation       : 0 Errors (npx tsc --noEmit)
• Cisco Baseline Audit Score   : 20.0% Compliance (39 Failed Controls, P0 Risk: 92.5)
• Cisco Hardened Re-Analysis   : 53.3% Compliance (+33.3% Delta, Risk: 41.0)
• Supported Vendors            : Cisco IOS, Juniper JunOS, Fortinet FortiOS
• Supported Frameworks         : CIS Benchmarks, NIST SP 800-53, DISA STIG, ISO 27001
• Device-Write Capabilities    : ZERO (Read-Only SOC Advisory Guardrail Enforced)
================================================================================
```
