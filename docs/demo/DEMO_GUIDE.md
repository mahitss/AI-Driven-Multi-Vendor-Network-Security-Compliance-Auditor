# NetVigil — Official SIH Evaluation Demo Guide

**Target Release:** `v1.0.0-SIH2026-RC1`  
**Problem Statement:** SIH26155 (NTRO)

---

## 1. Demo Execution Flow

1. **Launch Dashboard:**
   - Open browser to `http://localhost:3000/demo`.
   - Verify Header: `SIH26155 • NTRO EVALUATION • PRESENTER MODE`.

2. **Trigger Golden Demo Pipeline:**
   - Click **"Launch 2-Min Demo"** (or "Re-Launch Golden Demo").
   - Observe live real-time pipeline execution (~150–200 ms):
     - Ingestion & SHA-256 Hashing
     - Vendor Signature Detection (Cisco IOS-XE)
     - AST Parsing & Fact Extraction
     - 8-Domain Universal Normalization
     - Deterministic Compliance Evaluation (60 Rules)
     - Risk Intelligence & Priority Correlation
     - Safe Allowlisted Remediation Synthesis

3. **Walk Through Stepper Stages:**
   - **Stage 1 (Ingestion):** Real SHA-256 integrity hash `36c5475f...` and isolated storage.
   - **Stage 2 (Detection):** Signature confidence `0.90` on Cisco IOS.
   - **Stage 3 (Normalization):** Standardized facts across `remote_access`, `authentication`, `logging`.
   - **Stage 4 (Compliance):** Deterministic scores across CIS, NIST, STIG, ISO.
   - **Stage 5 (Evidence):** Verbatim source line citations (e.g. Line 42 `transport input telnet`).
   - **Stage 6 (Risk):** P0–P3 topological blast-radius prioritization.
   - **Stage 7 (Remediation):** Allowlisted visual diffs (`REMOVE` vs `ADD`) with human review status.
   - **Stage 8 (AI Co-Pilot):** Evidence-grounded advisory explanation with OpenRouter models.
   - **Stage 9 (Adaptive Training):** Human-in-the-loop unknown syntax approval and re-scoring.
   - **Stage 10 (Official Report):** Real PDF / Executive compliance report generation.

---

## 2. Expected Metrics on Primary Dataset (`CORE-RTR-01`)
- **Compliance Score:** 20.0%
- **Total Evaluated Findings:** 60 findings across 4 frameworks
- **Critical Findings:** 8
- **Correlated Risks:** 20 (2 P0 Critical, 4 P1 High)
- **Remediation Fixes:** 12 verified allowlisted CLI diffs
- **Total Measured Latency:** ~150–190 ms
