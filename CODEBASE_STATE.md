# NetVigil — Codebase State & Architecture Reference
> **LIVING SYSTEM RECORD**: Consult this document **FIRST** on every task instead of re-analyzing or deep-scanning the entire codebase. Update this document whenever state contracts, components, endpoints, or data models evolve.

---

## 1. System Overview

**NetVigil** is an AI-driven, multi-vendor network security compliance and risk auditing platform. It deterministically parses network configurations (Cisco IOS/NX-OS, Juniper Junos, Fortinet FortiOS), evaluates them against compliance frameworks (CIS, NIST, STIG, ISO 27001), calculates security and posture risk scores, and offers vendor-specific remediation diffs and interactive assistants.

### Tech Stack
* **Backend**: Python 3.13, FastAPI, SQLAlchemy 2.0 (asyncio + aiosqlite / PostgreSQL / Supabase), Pydantic v2, Pytest.
* **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons, React Context / Hooks.
* **Storage & Caching**: SQLite (`netvigil.db`), Supabase Auth/JWT, local/cloud storage for raw config ingestion.
* **Dev/Test**: Node.js (`tsx` test runner), Pytest (asyncio mode).

---

## 2. Directory Structure & Key Components

```
SIH2026/
├── apps/
│   ├── api/                               # FastAPI Application
│   │   ├── app/
│   │   │   ├── api/routes/                # REST Endpoints
│   │   │   │   ├── analysis.py            # /api/v1/analysis/{id}/findings & evidence
│   │   │   │   ├── audits.py              # /api/v1/audits (lifecycle, runs, summaries)
│   │   │   │   ├── configurations.py      # /api/v1/configurations (upload, vendor detect)
│   │   │   │   ├── rules.py               # /api/v1/rules (rule catalog & filtering)
│   │   │   │   ├── risk.py                # /api/v1/risk (risk posture, device risk)
│   │   │   │   ├── remediation.py         # /api/v1/remediation (scripts, diffs, apply)
│   │   │   │   ├── telemetry.py           # /api/v1/telemetry (analytics, runs)
│   │   │   │   └── auth.py                # /api/v1/auth (tokens, Supabase integration)
│   │   │   ├── models/                    # SQLAlchemy Domain Models
│   │   │   │   ├── configuration.py       # Configuration (id, hash, detected_vendor, etc.)
│   │   │   │   ├── audit.py               # Audit (id, score, status, summary_stats)
│   │   │   │   ├── finding.py             # Finding (id, control_id, status, severity, evidence)
│   │   │   │   ├── device.py              # Device inventory & vendor mapping
│   │   │   │   ├── risk.py                # RiskScore, RiskAssessment
│   │   │   │   ├── remediation.py         # RemediationScript, History
│   │   │   │   └── user.py                # User, roles, tenant
│   │   │   ├── services/
│   │   │   │   ├── parsing/               # Vendor Parsers & Detection
│   │   │   │   │   ├── vendor_detector.py # Deterministic pattern matching (Cisco/Juniper/Fortinet)
│   │   │   │   │   ├── cisco.py           # Cisco IOS / NX-OS AST parser
│   │   │   │   │   ├── juniper.py         # Junos hierarchical / set parser
│   │   │   │   │   └── fortinet.py        # FortiOS config parser
│   │   │   │   ├── compliance/            # Compliance Engine
│   │   │   │   │   ├── service.py         # ComplianceAuditService (run_audit)
│   │   │   │   │   ├── evaluator.py       # RuleEvaluator
│   │   │   │   │   └── scoring.py         # Compliance Scoring
│   │   │   │   └── risk/                  # Risk Scoring Engine
│   │   └── tests/                         # Pytest Backend Suite
│   └── web/                               # Next.js 14 Frontend Application
│       ├── src/
│       │   ├── app/(protected)/
│       │   │   ├── audits/page.tsx        # Security Audits, sessions, framework cards
│       │   │   ├── findings/page.tsx      # Findings Registry, security context, evidence
│       │   │   ├── configurations/page.tsx# Configuration viewer, line citations, diff
│       │   │   ├── dashboard/page.tsx     # Fleet overview & executive KPIs
│       │   │   └── remediation/page.tsx   # Remediation runbooks & CLI patches
│       │   ├── lib/
│       │   │   ├── api.ts                 # API client, JWT injection, transient retries
│       │   │   └── evidence-utils.ts      # Authoritative line citation & status mapping
│       └── tests/                         # Web TypeScript Regression Suites
│           ├── findings-audit-consistency.test.ts # 10 data consistency tests
│           ├── evidence-explorer-selection.test.ts
│           └── transient-retry.test.ts
├── docs/                                  # Architectural & deployment specs
└── CODEBASE_STATE.md                      # [THIS FILE] Authoritative System State
```

---

## 3. Critical Invariants & Operating Rules

The following rules must **NEVER** be violated:
1. **DO NOT redesign NetVigil UI** without explicit instruction.
2. **DO NOT modify vendor parsers** (`cisco`, `juniper`, `fortinet`).
3. **DO NOT modify compliance rule semantics**.
4. **DO NOT modify risk scoring formulas**.
5. **DO NOT modify remediation catalog or CLI generator logic**.
6. **DO NOT modify authentication or database schemas**.
7. **Single Source of Truth**: For every selected finding, all panels (center evidence, line citation, right security context, risk contribution, remediation action) must derive **strictly from `selectedFinding.id`**.
8. **No Cross-Audit Contamination**: Never fall back to `risks[0]` or global findings from another session.
9. **No Fake Line Citations**: Never default to line `"16"`, line `0`, `"Baseline"`, or `"Baseline Absent"`.
10. **Semantic Presentation**:
    * `PASS`: Header = `"POLICY COMPLIANCE VERIFIED"`, Risk = `0.0`, Badge = `"HARDENED / SECURED"`, no `"WHY THIS FAILED"`, no `"EXPOSURE ACTIVE"`.
    * `FAIL`: Header = `"WHY THIS FAILED"`, Badge = `"EXPOSURE ACTIVE"`, risk contribution added.
    * `NOT_APPLICABLE`: Header = `"NOT APPLICABLE"`, Risk = `0.0`, Badge = `"NOT APPLICABLE"`, `line: null`, no diff.
    * `UNKNOWN`: Header = `"INSUFFICIENT EVIDENCE / UNKNOWN"`.

---

## 4. Key Data Models & API Contracts

### `Finding` Object Structure
```typescript
interface AnalysisFindingItem {
  id: string;
  audit_id: string;
  configuration_id: string;
  framework: "CIS" | "NIST" | "STIG" | "ISO";
  control_id: string;
  category: string;
  status: "PASS" | "FAIL" | "NOT_APPLICABLE" | "UNKNOWN";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  title: string;
  description: string;
  evidence: string;              // Raw snippet or proof
  expected_value: string;
  actual_value: string;
  remediation?: string;          // Remediation CLI command(s)
  finding_metadata?: {
    source_lines?: number[];     // Real line numbers (1-indexed) in raw config
    evidence_list?: string[];
    property?: string;
  };
}
```

### `Audit` Session
* `score`: Float (e.g. `53.3`), representing overall percentage.
* `summary_stats`: Object containing counts by framework (`CIS`, `NIST`, `STIG`, `ISO`) and severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).

---

## 5. Standard Test & Verification Commands

Before concluding any change, always run the relevant validation commands:

### Frontend
```powershell
# Run web regression tests (selection sync, transient retry, findings consistency)
cd apps/web; npm test

# Typecheck TypeScript
npm run typecheck

# Production build check
npm run build
```

### Backend
```powershell
# Run targeted compliance & evidence consistency pytest suite
pytest apps/api/tests/test_audits_api.py apps/api/tests/test_audit_state_and_summary_consistency.py apps/api/tests/test_evidence_provenance_ui_regression.py apps/api/tests/test_final_integrity_and_evidence_consistency.py apps/api/tests/test_cisco_parser.py apps/api/tests/test_juniper_parser.py apps/api/tests/test_fortinet_parser.py apps/api/tests/test_rule_evaluator.py apps/api/tests/test_scoring_engine.py apps/api/tests/test_risk_scoring.py -q
```

---

## 6. Recent Fixes & Change Log

### P0/P1 — Findings + Security Audits Data Consistency (September 2026)
* **Bug 1 & 5 (PASS showing "WHY THIS FAILED" & N/A presentation)**:
  * In `apps/web/src/app/(protected)/findings/page.tsx` and `configurations/page.tsx`, contextualized header to render `"POLICY COMPLIANCE VERIFIED"` for `PASS`, `"NOT APPLICABLE"` for `N/A`, and `"WHY THIS FAILED"` only for `FAIL`.
  * Risk contribution suppressed to `0.0` for `PASS` and `N/A`.
  * Removed arbitrary line 16 fallback in `evidence-utils.ts`.
* **Bug 2 & 4 (Cross-audit / finding contamination)**:
  * Eliminated `|| risks[0]` arbitrary fallback in `findings/page.tsx`.
  * Findings page dynamically loads source configuration via `fetchConfigurationDetail(selectedFinding.configuration_id)`.
* **Bug 3 (30% vs 53.3% score mismatch)**:
  * In `apps/web/src/app/(protected)/audits/page.tsx`, integrated `useSearchParams` (`audit_id`, `configuration_id`) to bind directly to the user-selected audit rather than defaulting to `audits[0]`.
  * Formatted score to 1-decimal precision (`53.3%`) to match audited configuration score.
  * Added atomic reset of `inspectingFinding` when switching audits.
* **Backend Provenance & Isolation**:
  * Added `apps/api/tests/test_evidence_provenance_ui_regression.py` validating line citation fidelity and configuration switching isolation.
  * Added `apps/web/tests/findings-audit-consistency.test.ts` with 10/10 automated regression tests.

### P0 — Persistence + Security Posture Data Flow Fix (September 2026)
* **Bug 1 (Audit Session / Selected Audit Persistence Failure)**:
  * **Root Cause**: `audits/page.tsx` was using `window.history.replaceState` which does not update Next.js App Router `useSearchParams()`. Re-renders triggered by selection state changes re-evaluated the stale query parameter and immediately overwrote `selectedAuditId` back to the old audit.
  * **Fix**: Integrated `useRouter()` and `usePathname()`, replacing `replaceState` with `router.replace(`${pathname}?audit_id=${id}`, { scroll: false })` to keep state and URL in complete lockstep.
  * **Lifecycle Resolution**: Implemented `resolveAuthoritativeAuditId`: (1) Explicit URL `audit_id` -> (2) Explicit URL `configuration_id` -> (3) Non-sensitive UUID string in `localStorage` (`netvigil_active_audit_id`) -> (4) Fallback to newest valid audit (`audits[0].id`).
  * Cross-route navigation (`/audits` -> `/findings` -> `/dashboard` -> `/audits`) and F5 refresh reliably restore the active session.
* **Bug 2 (Security Posture Dashboard Zero / Empty Telemetry)**:
  * **Root Cause**: Dashboard queries had `enabled: !authLoading` which fired before Supabase attached JWT headers, querying as unauthenticated/default user and caching empty metrics under `["dashboard-overview-stats"]`. Furthermore, creating audits in `/audits` only invalidated `["overview-stats"]`, leaving the dashboard cache permanently stale.
  * **Fix**: Gated all queries with `enabled: !authLoading && !!user`, added audit query reconciliation (`hasCompletedAudits = total_audits > 0 || managed_assets > 0 || audits.length > 0`), and cross-invalidated `["dashboard-overview-stats"]`, `["dashboard-security-telemetry"]`, and `["dashboard-active-findings"]` on audit mutations.
  * Replaced blanket `"NO TELEMETRY DATA"` with `"AUDIT TELEMETRY UNAVAILABLE"` when completed audits exist but historical time-series points have not yet accumulated.
* **Backend Asset Deduplication & Posture Hardening**:
  * In `apps/api/app/db/helpers.py`: Canonicalized asset identity hierarchy (`audit.device_id` -> `cfg.device_id` -> `cfg.original_filename` -> `cfg.id`) and made completion status checks case-insensitive.
  * In `apps/api/app/api/routes/overview.py`: Canonicalized `managed_assets` to count distinct assets evaluated by completed audits, excluded `PASS` and `NOT_APPLICABLE` from `open_findings` and `critical_findings`, and added `latest_audit` metadata to cleanly separate Latest Audit from Fleet Posture.
  * In `apps/api/app/api/routes/analysis.py`: Added `_resolve_analysis_entities` helper so all `/analysis/{analysis_id}/*` endpoints seamlessly accept either an `Audit.id` or a `Configuration.id`.
* **Regression Verification**:
  * Added `apps/api/tests/test_audit_persistence_and_posture_flow.py` with 8 automated pytest cases (all passing).
  * Extended `apps/web/tests/findings-audit-consistency.test.ts` to 15/15 automated regression tests (all passing).

