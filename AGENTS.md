# Agent Operating Instructions & Behavioral Constraints

## 1. Zero Re-Analysis Rule (MANDATORY)
* **DO NOT re-analyze or re-scan the entire codebase from scratch** on every prompt.
* **ALWAYS read [CODEBASE_STATE.md](file:///c:/Users/pc/OneDrive/Desktop/SIH2026/CODEBASE_STATE.md) FIRST** to retrieve the system architecture, file map, data contracts, and established conventions.
* Directly target the exact files documented in `CODEBASE_STATE.md`.
* **ALWAYS update [CODEBASE_STATE.md](file:///c:/Users/pc/OneDrive/Desktop/SIH2026/CODEBASE_STATE.md)** whenever you modify data bindings, introduce or change API endpoints, update models, or add regression tests.

---

## 2. Core Project Invariants
* **DO NOT redesign NetVigil UI** unless explicitly requested.
* **DO NOT modify vendor parsers** (`cisco`, `juniper`, `fortinet`).
* **DO NOT modify compliance rule semantics**.
* **DO NOT modify risk scoring formulas**.
* **DO NOT modify remediation catalog or CLI generator logic**.
* **DO NOT modify authentication or database schemas**.
* **Single source of truth**: Every detail panel in the UI must derive strictly from `selectedFinding.id`.
* **Zero fake line citations**: Never allow fallbacks to line `"16"`, `"0"`, `"Baseline"`, or `"Baseline Absent"`.
* **Cross-audit isolation**: Never allow fallbacks like `risks[0]` to contaminate different audit sessions.

---

## 3. Fast Verification
* Frontend: Run `npm test` in `apps/web` (runs all regression test suites including `findings-audit-consistency.test.ts`).
* Backend: Run targeted pytest in `apps/api/tests/`.
