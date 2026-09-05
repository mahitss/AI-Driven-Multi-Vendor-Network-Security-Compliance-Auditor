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
│   │   │   │   └── scoring.py             # Compliance Scoring
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
│       │   ├── components/
│       │   │   └── layout/
│       │   │       └── AppShell.tsx           # Matte-black responsive layout with collapsible sidebar
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

### Premium UI Redesign — Matte-Black SOC Theme & Left Navbar Overhaul (September 2026)
* **Design Philosophy & Visual Language**:
  * Unified enterprise SOC cybersecurity aesthetic: calm, minimal, technical, professional, matte-black surfaces throughout.
  * **Primary Palette**:
    * Global Background: `#050505` / `#070707`
    * Sidebar / Chrome: `#080808` / `#090909`
    * Card Surfaces: `#0B0B0B` / `#0D0D0D`
    * Elevated Surfaces & Modals: `#111111` / `#121212` / `#141414`
    * Subtle Borders: `#1F1F1F` (primary), `#2C2C2E` (elevated/interactive)
    * Typography: Primary `#F2F2F2`, Secondary `#8E8E93`, Tertiary `#636366`
  * **Restrained Semantic Accents**:
    * Success / Hardened: Subtle green (`#10B981`)
    * Warning / High Risk: Subtle amber (`#F59E0B`)
    * Critical / Fail: Restrained red (`#EF4444`)
    * Info / Selected states: Restrained technical blue (`#3B82F6`)
    * AI Features: Controlled violet (`#8B5CF6`)
* **Left Navbar Overhaul (`AppShell.tsx`)**:
  * Brand Header: `NETVIGIL` + `SOC` badge + `Security Console` subline with shield icon and health indicator dot.
  * Information Architecture Sections:
    * `OVERVIEW`: Security Posture (`/dashboard`)
    * `INVESTIGATE`: Security Audits (`/audits`), Findings (`/findings`), Assets & Inventory (`/devices`)
    * `REMEDIATION`: Remediation Center (`/remediation`)
    * `OBSERVABILITY`: Security Time Machine (`/security-time-machine`), Audit Operations (`/operations`)
    * `INTELLIGENCE`: Multi-Vendor Engine (`/multi-vendor`), Security Briefing (`/ai-security-briefing`)
    * Settings (`/settings`)
  * Integrated User Profile Area: Bottom-left compact user identity card (avatar initial, full name, email, logout action).
  * Top App Header: Minimal breadcrumb (`NETVIGIL / <SECTION>`), search shortcut (`Ctrl K`), `INGEST` CTA, and `● OPERATIONAL` health pill.
* **Component-Wide Retheming**:
  * Purged all legacy navy/slate hexes across all 34 routes and 30 components.
  * Refined `SecurityAuditsPage`, `FindingsPage`, `ConfigurationsPage`, `DashboardPage`, `DevicesPage`, and `RemediationPage`.
    * Preserved 100% of data bindings, API contracts, evidence citation logic, deterministic risk formulas, and parser invariants.
    * Verified: 100% Next.js routes compiled with zero errors (`npm run build`), 100% frontend regression tests passed (`npm test`), and zero backend regressions.

### Multi-Framework Independence & Legitimate Catalog Symmetry Verification (September 2026)
* **Forensic Audit Investigation (`03_FORTINET_SCORE_HIGH.conf`)**:
  * **Reported Concern**: For `03_FORTINET_SCORE_HIGH.conf`, all 4 frameworks (CIS, NIST, STIG, ISO) produce identical metrics (`6/12 = 50.0%`, `5 FAIL`, `1 UNKNOWN`, `48 findings`). Investigated whether backend data was aliasing/reusing results or legitimately identical.
  * **Catalog & Control Mapping Forensic Findings**:
    * Catalog `unified_catalog.json` contains 20 total rules.
    * Exactly 12 rules apply to Fortinet (`7` with `applicability: "all"`, `4` with `applicability: "fortinet,juniper"`, `1` with `applicability: "fortinet"`).
    * Every one of these 12 rules defines explicit, distinct mappings to all four frameworks:
      * **CIS**: `CIS-1.2.1`, `CIS-1.2.2`, `CIS-1.2.3`, `CIS-1.1.2`, `CIS-2.1.1`, `CIS-2.2.1`, `CIS-1.3.1`, `CIS-1.1.4`, `CIS-1.2.4`, `CIS-1.3.2`, `CIS-1.2.5`, `CIS-2.1.2`
      * **NIST**: `NIST-AC-17`, `NIST-SC-8`, `NIST-CM-7`, `NIST-IA-5`, `NIST-AU-2`, `NIST-AU-8`, `NIST-AC-8`, `NIST-AC-7`, `NIST-SC-13`, `NIST-AC-12`, `NIST-AC-17`, `NIST-SC-7`
      * **STIG**: `STIG-NET0400`, `STIG-NET0410`, `STIG-NET1640`, `STIG-NET1660`, `STIG-NET0700`, `STIG-NET0720`, `STIG-NET0100`, `STIG-NET1630`, `STIG-NET0420`, `STIG-NET0430`, `STIG-NET0410`, `STIG-NET1640`
      * **ISO**: `ISO-A.9.4.2`, `ISO-A.13.1.2`, `ISO-A.13.1.1`, `ISO-A.10.1.1`, `ISO-A.12.4.1`, `ISO-A.12.4.4`, `ISO-A.9.4.2`, `ISO-A.9.4.2`, `ISO-A.10.1.1`, `ISO-A.9.4.2`, `ISO-A.9.4.2`, `ISO-A.13.1.1`
  * **Pipeline Independence Tracing**:
    * Analysis ID → Framework → Control ID → Catalog Rule → Applicability → Evaluation Result: Framework identity is preserved with zero identity loss.
    * Database stores 48 distinct `Finding` rows with durable `framework` identifiers and unique control IDs.
    * Aggregation engine (`ComplianceScoringEngine.calculate_scores`) calculates each framework's score strictly from `[r for r in results if r.framework == fw]`.
    * API response schema (`AuditDetailResponse.framework_scores`) returns isolated `FrameworkScoreResponse` objects.
    * Frontend `SecurityAuditsPage` maps each framework card strictly from its framework-scoped response or filtered findings without cross-contamination.
  * **Conclusion**:
    * **"Framework results are independently calculated and legitimately identical."**
    * The 6 PASS, 5 FAIL, 1 UNKNOWN statuses across all 4 frameworks stem from genuine configuration properties of `03_FORTINET_SCORE_HIGH.conf` mapping to symmetrical controls in the catalog.
  * **Multi-Audit Regression Coverage**:
    * Verified on `03_FORTINET_SCORE_HIGH.conf` (12 rules, 48 findings, 6 PASS, 5 FAIL, 1 UNK, 50.0%).
    * Verified on `02_CISCO_HARDENED.cfg` (15 rules, 60 findings, 5 PASS, 7 FAIL, 3 NA, 41.7%).
    * Verified on `04_JUNIPER_CRITICAL.set` (11 rules, 44 findings, 0 PASS, 10 FAIL, 1 NA, 0.0%).
    * Added automated regression test `test_benchmark_configs_framework_independence_and_legitimate_symmetry` to `apps/api/tests/test_framework_summary_api_consistency.py`.

### P0 — Elimination of Silent Production SQLite Fallback & PostgreSQL Enforcement (September 2026)
* **Root Cause Verification**:
  * Live Render container diagnostic probe confirmed that the production instance ran on `ephemeral_container_sqlite` (`/app/apps/api/netvigil.db`) with `is_persistent: false` because `DATABASE_URL` was unset in Render's environment dashboard.
  * Render destroys the container on every redeployment, wiping all audits, configurations, and findings while external Supabase Auth persisted.
* **Production-Safe Invariant Fixes**:
  * **Strict Production Fail-Fast (`config.py`)**: Added `validate_production_database_url` and `validate_production_sync_database_url`. When `ENVIRONMENT=production` and `DATABASE_URL` is missing or resolves to SQLite, the backend immediately raises a clear configuration exception:
    `"CRITICAL CONFIGURATION ERROR: Production DATABASE_URL must be configured with persistent PostgreSQL. Silent fallback to ephemeral SQLite is strictly prohibited in production mode."`
  * **Lifespan Startup Assertion (`main.py`)**: Lifespan explicitly checks `if settings.ENVIRONMENT == "production" and not settings.is_persistent_database: raise RuntimeError(...)`.
  * **Health Check Degraded State (`health.py`)**: `/api/v1/health` marks `status="degraded"` if production is ever detected running on non-persistent storage.
  * **Development & Test Preservation**: SQLite engines (`sqlite+aiosqlite`) remain fully supported and active when `ENVIRONMENT in ["development", "test"]`.
  * **Automatic Sync URL Derivation**: `SYNC_DATABASE_URL` automatically derives a valid PostgreSQL sync connection string from `DATABASE_URL` for Alembic/synchronous operations.
  * **Transparent IPv4 Pooler Normalization (`config.py`)**: Resolves the Render IPv6 outbound limitation. Automatically maps direct Supabase endpoints (`db.cveymgeivgnjnwnxfveu.supabase.co:5432`, which only resolve to IPv6 AAAA) to the official IPv4 connection pooler (`aws-0-ap-southeast-1.pooler.supabase.com`) with `postgres.cveymgeivgnjnwnxfveu` user and enforces `ssl=require`.
  * **Health Diagnostic Error Visibility (`health.py`, `schemas/health.py`)**: Added sanitized `error` field to `DatabaseHealth` reporting exact connection issues without exposing credentials.
  * **Durable Raw Content**: Database-backed `Configuration.raw_content` remains the 100% durable source of truth for AST parsing, evidence citations, and diffs across container restarts.
  * **Regression Suite**: Added fail-fast and persistence invariant tests to `apps/api/tests/test_persistence_lifecycle_and_cloud_postgres.py`. All tests pass (`100%`).

### Collapsible Sidebar Implementation (September 2026)
* **Design & Aesthetic**:
  * Adheres strictly to the NetVigil matte-black SOC visual language (`#080808`, `#070707`, `#121212`, `#1F1F1F`, `#242424`).
  * Smooth CSS transitions (`transition-[width] duration-200 ease-in-out`) between expanded (280px) and collapsed (68px) states.
  * Typography bump on expanded navigation items to `text-[14px]` font-medium with `text-[11px]` font-mono section headers for optimal scannability.
* **Collapsed Presentation**:
  * Centered 40x40 touch targets for navigation icons.
  * Floating tooltips on hover (`opacity-0 group-hover:opacity-100 transition-opacity z-50`) displaying route label and badges.
  * Active route indicator maintains distinct border and background highlight (`bg-[#141414] text-[#F2F2F2] border border-[#2B2B2B]`).
  * Bottom user profile transitions gracefully into an initialed avatar button with hover tooltip displaying full operator name and email.
* **Responsive Layout & Space Reclamation**:
  * Main content wrapper uses `flex-1 min-w-0 overflow-hidden` to automatically reclaim horizontal space when collapsed without page shift.
  * Mobile/tablet breakpoints preserve drawer behavior (`w-[280px]` overlay with backdrop blur) without forcing horizontal overflow.
### Frontend UI Hardening — Findings & Evidence Explorer Workspace (September 2026)
* **Design & Aesthetic Invariants**:
  * Adheres strictly to the NetVigil matte-black SOC console visual language (`#080808`, `#070707`, `#121212`, `#1F1F1F`, `#242424`).
  * 100% preservation of parsers, vendor detection, compliance calculations, risk scoring formulas, remediation catalogs, database schemas, and authentication.
* **Stable 3-Column Workspace (`findings/page.tsx`)**:
  * Established a controlled fractional grid: `grid-cols-1 lg:grid-cols-[minmax(0,31fr)_minmax(0,41fr)_minmax(0,28fr)] gap-4 items-start w-full`.
  * Guarantees 31% Left (Findings Registry), 41% Center (Evidence Viewer), 28% Right (Security Context) proportional distribution without gap overflow.
  * Columns align at the top (`items-start`), maintain independent vertical scrolling (`max-h-[720px] overflow-y-auto` on Left, `max-h-[600px] overflow-y-auto` on Center, `max-h-[720px] overflow-y-auto` on Right), and eliminate dead whitespace.
* **Findings Registry Card Uniformity**:
  * Every finding card enforces uniform width (`w-full`), padding (`p-3`), border radius (`rounded-lg`), and vertical spacing (`space-y-2`).
  * Severity badge (`px-1.5 py-0.5 text-[9px]`) and Status badge (`px-1.5 py-0.5 text-[9px]`) share predictable horizontal and vertical alignments.
  * Finding title clamped to a fixed 2-line height (`h-[2.25rem] line-clamp-2 leading-snug overflow-hidden`), preventing unpredictable card height shifts.
  * Card footer aligns Framework & Device on the left and exact `LINE {line}` indicator consistently pinned on the right.
* **Evidence Code Viewer Vertical Structure & Overflow Isolation**:
  * Viewer body constrained with internal `overflow-x-auto overflow-y-auto` at `max-h-[600px]`.
  * Code lines styled with `flex items-start rounded px-1 py-0.5 font-mono min-w-full w-fit`, ensuring active evidence highlights (`bg-[#EF4444]/15` or `bg-[#10B981]/15`) span the full width of long lines without breaking monospace alignment.
  * Eliminated nested line-level scrollbars; horizontal scrolling is isolated strictly inside the code viewer component without causing viewport-level horizontal overflow.
* **Security Context Vertical Stack**:
  * Right column structured into a clean vertical stack of uniform cards: Observed/Expected Box, Policy Compliance Explanation, Related Framework Controls, Risk Contribution, and Allowlisted Remediation with Re-Analysis Verification.
* **Header Content Boundary Alignment (`AppShell.tsx`)**:
  * Wrapped top application header inner content in `max-w-7xl mx-auto w-full flex items-center justify-between` to share the exact horizontal content boundary with all protected pages.
  * Breadcrumbs, global search, INGEST button, and OPERATIONAL indicator align precisely with page content headers across all desktop resolutions.
### Dedicated AI Copilot & AI Security Briefing Full-Width Redesign (September 2026)
* **Architecture & Separation of Concerns**:
  * **AI Security Briefing (`ai-security-briefing/page.tsx`)**:
    * Removed the persistent right-side 5-column Copilot panel to convert the briefing into a spacious executive dashboard.
    * 4 balanced hero metric cards with equal visual height (`COMPLIANCE POSTURE`, `ALGORITHMIC RISK`, `CRITICAL / P0 RISKS`, `POSTURE EVALUATION`).
    * Large readable Executive Posture Summary with enhanced typography scale (`15–16px text-[#E0E0E0] leading-relaxed font-sans`).
    * Full-width Top Critical Risks cards with priority badge (`P0`, `P1`), control ID, readable title, risk narrative, AST line citation, and allowlisted remediation action.
    * Compact right column with `AUDIT DETAILS` and `QUICK ACTIONS` linking directly to `/ai-copilot`, `/findings`, `/remediation`, and `/security-time-machine`.
  * **Dedicated AI Copilot (`ai-copilot/page.tsx`) [NEW ROUTE]**:
    * Full-page SOC analyst workspace accessible directly from sidebar under `Intelligence` (`/ai-copilot` with `"NEW"` badge).
    * Target audit session and optional baseline evolution dropdowns with deep-link query parameter support (`?audit_id=...`).
    * Large conversation area with suggested security question chips, markdown-formatted AI responses, AST line evidence proof chips, and interactive evidence preview modal.
    * Input bar with keyboard Enter shortcut and loading state indicators.
  * **Sidebar & Navigation (`AppShell.tsx`)**:
    * Added `AI Copilot` (`icon: Bot`, `badge: "NEW"`) directly above `Security Briefing` (`icon: Sparkles`) in the `Intelligence` group.
    * Updated breadcrumb routing for `/ai-copilot` (`INTELLIGENCE / AI COPILOT`).
* **Design & Invariant Enforcement**:
  * Preserved 100% of real backend data, API contracts, evidence citations, and scoring formulas.
  * Strict AI advisory boundary maintained: `AI ADVISORY ONLY`, `AST GROUNDED`, `ZERO WRITE ACCESS`.
  * Typography scale: Page titles (28–32px), Headings (18–20px), Metric values (32–40px), Body (14–16px), Metadata (10–11px).
  * Passed 100% frontend regression tests (`npm test`), TypeScript check (`npx tsc --noEmit`), and Next.js production build across all 35 routes (`npm run build`).

### Cross-Page Data Consistency Audit & Presentation Hardening (September 2026)
* **Forensic Audit Across 7 Protected Pages**:
  * Conducted full trace of all major metrics across Security Posture, Security Audits, Findings, Assets & Inventory, Remediation Center, Security Time Machine, and Security Briefing.
  * Verified DB source -> REST API response -> API client (`api-client.ts`) -> React Query cache -> UI presentation.
  * **Core Invariant**: Truthful numbers > visually uniform numbers. Pages have intentionally different scopes (Single Audit vs Latest Audit vs Fleet Aggregate vs Active Failures vs Lifetime Controls). Zero fake numbers, zero altered formulas, zero synthetic remediation links.
* **Resolution of 6 Critical Invariants**:
  1. **05_JUNIPER_HARDENED.set (Check #1)**: Proved multiple legitimate audit executions exist (`5e4d0799` = 25.0%, `4de35896` = 40.0%). Enhanced audit selector pill with execution timestamps (`12:40` vs `20:49`) and detailed tooltip so historical executions are transparently distinguished without merging.
  2. **Security Time Machine (Check #2)**: Fixed premature pairing race condition where unhydrated comparable pairs fell back to comparing unrelated cross-vendor audits (Juniper Telnet 0% vs Fortinet Hardened 41.7%). Added `pairsLoading` guard to prioritize genuine same-asset evolution pairs. Added explicit `"CROSS-VENDOR BENCHMARK COMPARISON"` vs `"VERIFIED SAME-ASSET REMEDIATION EVOLUTION"` badges.
  3. **Critical Findings vs High Severity Label (Check #3)**: Fixed subtitle mismatch in `dashboard/page.tsx` line 302 from `"High severity exposures"` to `"Critical (P0) active exposures"` to align with P0 badge and `stats.severity_breakdown.critical`.
  4. **Open Findings Terminology (Check #4)**: Clarified `open_findings` (124) subtitle to `"Active failed controls across fleet"`, accurately reflecting that it strictly sums active FAIL/PARTIAL findings across fleet devices (excluding PASS and NOT_APPLICABLE).
  5. **Tenant Isolation (Check #5)**: Verified all queries enforce authenticated user scoping (`user_id == current_user.id`) across DB, routes, and query keys (`[..., user?.id]`). Zero cross-tenant leakage.
  6. **Security Briefing vs Security Posture Scope (Check #6)**: Confirmed Security Briefing evaluates a single selected audit session (`07_FORTINET_HARDENED.conf`, 41.7%, 48 findings, risk 63.6), while Security Posture displays the fleet-level aggregate across all 4 managed devices ((41.7 + 0 + 25 + 0) / 4 = 16.7%, 124 open failures, risk 70). Both values are mathematically proven and correct for their respective scopes.
* **Regression Verification**:
  * 100% web regression tests passing (`npm test`, 22 data consistency + 8 framework independence + 4 explorer + 4 transient retry tests).
  * 100% TypeScript clean (`npx tsc --noEmit`).
  * 100% Next.js production build passing across all 35 routes (`npm run build`).
  * 100% targeted backend pytest suites passing (`pytest`, 18/18 tests passing).

### Dedicated AI Copilot Page Polish & Security Context Workspace (September 2026)
* **Architecture & Separation of Concerns**:
  * **AI Copilot Workspace (`ai-copilot/page.tsx`)**:
    * Clean two-column desktop layout: ~72% Left Main Workspace and ~28% Right "SECURITY CONTEXT" panel (`lg:col-span-8 xl:col-span-9` + `lg:col-span-4 xl:col-span-3`).
    * **Right Column ("SECURITY CONTEXT")**: Real-time telemetry displaying selected audit asset name, platform vendor, compliance score, algorithmic risk score, active failure count, critical (P0) count, framework scores (CIS, NIST, STIG, ISO), and interactive Evidence Provenance for clicked/cited controls.
    * **Left Column (Main Workspace)**:
      * Stream header with safety invariants (`AI ADVISORY ONLY`, `AST GROUNDED`, `AI has ZERO device-write capability`).
      * Clean suggested investigation questions chips (`Why is this audit high risk?`, `Show me the most critical finding.`, `Why did CIS-1.2.1 fail?`, etc.).
      * Spacious conversation stream with structured visual sections (Explanation, Evidence, Action, Risk).
      * Interactive Evidence Citation chips opening AST line proof modal.
      * Large, comfortable composer input (`text-[15px]`, `py-3.5`) with keyboard Enter shortcut and zero device-write safety disclaimer.
  * **Security Briefing (`ai-security-briefing/page.tsx`)**:
    * Replaced persistent chat panel with compact CTA card: `"Need deeper analysis?"` → `"Open AI Copilot →"`.
  * **Aesthetics & Color System**:
    * 100% locked NetVigil matte-black SOC palette (`#050505`, `#080808`, `#0B0B0B`, `#141414`, `#1F1F1F`).
    * Clear typography hierarchy: Page title (28–30px), section titles (18–20px), body and conversation (15–16px), buttons (13–14px), metadata (11–12px).
* **Validation**:
  * 100% TypeScript clean (`npx tsc --noEmit`).
  * 100% web regression tests passing (`npm test`, 38/38 tests).
  * 100% Next.js production build passing across all 35 App Router routes (`npm run build`).






