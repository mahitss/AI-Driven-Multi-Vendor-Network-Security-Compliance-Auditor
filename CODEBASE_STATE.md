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

### P1 — Multi-Framework Score Binding & Selected Audit Score Mismatch (September 2026)
* **Bug 1 & 4 (41.7% vs 50.0% Selected Audit Score Mismatch)**:
  * **Root Cause**: `apps/web/src/app/(protected)/audits/page.tsx` lacked identity verification between `selectedAuditId` and the async `auditDetail` fetched by React Query. During audit selection transitions (e.g. from `03_FORTINET_SCORE_HIGH.conf` to `02_CISCO_HARDENED.cfg`), the tab pill displayed `41.7%` from the active audit list while the page body derived `currentScore`, `fwScores`, and findings from stale cached `auditDetail` belonging to Fortinet (50.0%). In addition, async `router.replace` updates caused race conditions in `resolveAuthoritativeAuditId`.
  * **Fix**:
    1. Implemented strict identity verification: `isDetailMatching = Boolean(auditDetail && selectedAuditId && auditDetail.id === selectedAuditId)`. Added development invariant warnings when IDs disagree.
    2. Enforced single source of truth fallback: If `auditDetail` is loading or mismatched, `currentScore`, `fwScores`, and `sevStats` immediately derive from `activeAudit = audits.find(a => a.id === selectedAuditId)` (which already holds authoritative score `41.7` and framework breakdown), guaranteeing zero stale score contamination or 0% flashing.
    3. Gated findings list to only render when `isDetailMatching === true`.
    4. Protected manual audit clicks with `manualSelectionRef` to prevent async Next.js router URL updates from bouncing the selected audit back to stale parameters.
* **Bug 2 & 3 (Framework Scores Identical & Framework Count Denominators)**:
  * **Root Cause & Mathematical Proof**: In `data/compliance/mappings/unified_catalog.json`, all baseline benchmark rules map symmetrically across CIS, NIST, STIG, and ISO:
    - In `02_CISCO_HARDENED.cfg`, exactly 12 controls apply to all 4 frameworks with 5 pass, 7 fail, and 3 N/A. Thus, each framework independently evaluates to 5/12 = 41.7% (with overall score = 20/48 = 41.7%).
    - In `03_FORTINET_SCORE_HIGH.conf`, exactly 12 controls apply with 6 pass, 5 fail, and 1 unknown. Thus, each framework independently evaluates to 6/12 = 50.0% (with overall score = 24/48 = 50.0%).
    - The backend scores were genuinely identical across frameworks for each configuration because the underlying controls are universal network security controls mapped across all four benchmarks.
  * **Frontend Binding Hardening**:
    - Bound each card strictly to `fwScores[fw.key]` and checked `isEvaluated = Boolean(fwData && (fwData.total_evaluated > 0 || fwData.total_applicable > 0))`.
    - Formatted scores with 1 decimal place (`scoreVal.toFixed(1)}%`) to align with the rest of the application.
    - Updated denominator label to `{fwData.passed_count}/{fwData.total_applicable} passed` with tooltip `"Passed / Applicable Controls"`, ensuring users know the denominator is framework-specific applicable controls (12), not overall fleet findings (48).
    - Un-evaluated frameworks render `"Not Evaluated"` and `"—"` rather than copying another framework or displaying 0%.
* **Regression Verification**:
  * Added `test_multi_framework_score_and_audit_consistency` to `apps/api/tests/test_audit_state_and_summary_consistency.py` validating 41.7% (5/12) for Cisco and 50.0% (6/12) for Fortinet.
  * Extended `apps/web/tests/findings-audit-consistency.test.ts` to 22/22 automated regression tests covering audit switching, stale detail rejection, framework card isolation, and framework denominators.

### P0 — Durable User Data Persistence Across Redeploy / Restart (September 2026)
* **Forensic Root Cause Identification**:
  * Render web services execute inside Docker containers with ephemeral filesystems. In production, `DATABASE_URL` was falling back to local SQLite at `./netvigil.db`.
  * On every container restart, redeployment, or idle spin-down, the container filesystem was wiped, destroying `/app/netvigil.db`.
  * Supabase Auth retained the persistent user session, but the newly spawned SQLite database had zero records for the user, resetting the UI to a blank account.
* **Database & Storage Resilience Hardening**:
  * **Cloud PostgreSQL SSL & Protocol Adaptation**: In `apps/api/app/core/config.py`, updated `assemble_async_database_url` to automatically convert `postgres://` or `postgresql://` to `postgresql+asyncpg://` and translate libpq `sslmode=require` query parameters into asyncpg-compatible `ssl=require`. Updated `assemble_sync_database_url` to mirror PostgreSQL sync formats with `sslmode=require`. Added `is_persistent_database` property.
  * **Connection Pool Resilience**: In `apps/api/app/db/session.py`, enabled `pool_pre_ping=True` and `pool_recycle=300` on both async and sync SQLAlchemy engines with `pool_size=10, max_overflow=20` to eliminate connection drops and stale connections from cloud database poolers (Supabase / Render).
  * **Startup Schema & Persistence Verification**: In `apps/api/app/main.py`, added startup logging reporting active database engine and storage mode, plus a production persistence advisory if running on ephemeral SQLite.
  * **Durable In-DB File Storage Fallback**: In `apps/api/app/services/ingestion/config_ingestion.py`, hardened file writing with directory creation and non-fatal fallback, guaranteeing that `raw_content` stored in PostgreSQL/SQLite remains the 100% durable source of truth.
### P0 — Multi-Framework Summary Independence Fix (September 2026)
* **Forensic Root Cause Analysis**:
  * In `06_FORTINET_CRITICAL.conf`, all 4 framework cards displayed identical metrics (`16.7%`, `2/12 passed`, `48 findings`).
  * In `data/compliance/mappings/unified_catalog.json`, exactly 12 baseline security rules apply to the `fortinet` vendor profile.
  * Every single one of these 12 rules maps 1-to-1 symmetrically to CIS, NIST, STIG, and ISO benchmarks.
  * In `06_FORTINET_CRITICAL.conf`, exactly 2 underlying security controls pass (`RULE-SSH-001` and `RULE-HTTPS-MGT-001`), 6 fail, and 4 are unknown/unconfigured.
  * Because the underlying AST properties are evaluated identically across each mapped framework control, all 4 frameworks genuinely evaluate to 2 passed, 6 failed, 4 unknown out of 12 applicable controls (score: 2 / 12 = 16.7%).
  * On the frontend (`apps/web/src/app/(protected)/audits/page.tsx`), the framework cards were not independently grouping findings by `f.framework`, nor displaying granular control breakdowns (passed, failed, unknown, N/A, applicable).
* **Fix & Architecture Hardening**:
  * **Independent Framework Grouping**: In `audits/page.tsx`, implemented `frameworkResults` via `useMemo` over `findings`, grouping findings strictly by `(f.framework || "").toUpperCase() === fw`. Calculated `passed_count`, `failed_count`, `unknown_count`, `not_applicable_count`, `total_applicable`, and independent score per framework card.
  * **Rendering Independence**: Each card renders its own framework-scoped counts and score; cards NEVER receive the overall audit score or overall results object.
  * **Granular Breakdown**: Framework cards display `{passed}/{applicable} passed`, subline `{failed} fail` plus unknown/NA counts, and detailed tooltip with all 5 metrics.
  * **Fallback Removal in Reports**: In `reports/page.tsx`, removed `latestCompliance` (overall score) fallback so framework coverage cards strictly render their own score or `"—"`.
  * **Selected Audit Identity Strictness**: Retained strict binding to `selectedAuditId` across overall score, framework cards, severity counts, findings, and risk.
* **Regression Verification**:
  * Added `apps/web/tests/framework-summary-independence.test.ts` with 8 comprehensive automated tests covering raw API fidelity, independent UI grouping, asymmetric framework independence, audit switching, persistence, and cross-audit isolation.
  * Added `apps/api/tests/test_framework_summary_api_consistency.py` with 3 backend tests verifying independent framework scoring, Fortinet critical provenance, and schema serialization.
  * All web regression tests passed (`npm test`); TypeScript clean with 0 errors (`npm run typecheck`).
  * All 35 targeted backend tests passed (`pytest`).

### P0 — Production Data Disappears After Every Redeploy — Fix & Verification (September 2026)
* **Forensic Root Cause Analysis**:
  * Live Render Health Probe (`https://ai-driven-multi-vendor-network-security.onrender.com/api/v1/health`) confirmed:
    * `engine`: `"sqlite"`
    * `database`: `"/app/apps/api/netvigil.db"`
    * `storage_path`: `"/app/storage/uploads"`
    * `is_persistent`: `false` (ephemeral container filesystem)
  * Render's container filesystem is completely wiped and recreated on every deployment or restart.
  * In the Render environment dashboard, `DATABASE_URL` was unset or missing, causing backend `config.py` to default to `sqlite+aiosqlite:///./netvigil.db`.
  * Ingested configurations, raw config content, audit runs, findings, and risk items were written to the ephemeral container SQLite database.
  * Supabase Auth runs externally and retains JWT tokens across deployments, which created the symptom: user remains logged in, but all NetVigil application data is gone.
* **Architecture Hardening & Persistent Storage Blueprint**:
  * **Render Blueprint (`render.yaml`)**: Added Infrastructure-as-Code blueprint defining:
    * Managed PostgreSQL instance `netvigil-postgres` (persistent across redeploys).
    * `DATABASE_URL` automatically injected from `netvigil-postgres` via `fromDatabase: name: netvigil-postgres, property: connectionString`.
    * 1GB persistent disk `netvigil-storage` mounted at `/app/storage` ensuring uploaded configuration files survive redeployment.
  * **Automatic Persistent Disk Auto-Detection**: In `apps/api/app/core/config.py`, enhanced both `assemble_async_database_url` and `assemble_sync_database_url` to inspect `/var/data`, `/data`, and `/app/storage`. When a persistent disk is mounted without an external PostgreSQL database, NetVigil automatically stores SQLite at `<mount>/netvigil.db` instead of the ephemeral container root.
  * **Observability & Health Contract**: Exposed `is_persistent: bool` and `storage_mode: str` in `HealthResponse` schema and `/api/v1/health` route, allowing real-time forensic monitoring of production database durability.
* **Regression & Lifecycle Verification**:
  * Added `apps/api/tests/test_production_persistence_simulation.py`:
    * Simulates exact 4-phase redeployment lifecycle with `02_CISCO_HARDENED.cfg`.
    * Phase 1: Ingests config, executes compliance audit (60 findings, 41.7% score), correlates risks (13 risks).
    * Phase 2: Destroys all in-memory connection pools, sessions, and process engines, simulating container shutdown and cold restart with idempotent table initialization.
    * Phase 3: Spawns new engine and proves configuration record, analysis ID, SHA-256 hash (`c83b540d...`), compliance score (41.7%), findings count (60), risk count (13), and exact evidence citations survive intact.
    * Phase 4: Proves strict tenant isolation across redeploy (User B sees 0 audits, 0 configs, 0 findings).
  * 100% backend and frontend test suites passing (`npm test` in `apps/web`, `pytest` across all test suites).
